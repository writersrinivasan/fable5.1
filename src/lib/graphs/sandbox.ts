import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { estTokens, groqModel, textOf } from "@/lib/groq";
import { MODELS, type Effort } from "@/lib/fable-data";
import { buildApiRequest, MIN_CACHEABLE, validate, type ApiError, type SandboxInput } from "@/lib/sandbox-request";

// Fable 5.1 *simulator*. The real model is not called: a Groq-hosted open model
// generates the text, while this graph reproduces the Fable 5.1 API contract —
// validation 400s, effort-scaled reasoning passes, thinking display modes,
// refusals/fallbacks, max_tokens truncation and token/cost accounting.

const EFFORT_PLAN: Record<Effort, { plan: false | "brief" | "deep"; critiqueRounds: number; words: number }> = {
  low: { plan: false, critiqueRounds: 0, words: 150 },
  medium: { plan: "brief", critiqueRounds: 0, words: 260 },
  high: { plan: "brief", critiqueRounds: 1, words: 380 },
  xhigh: { plan: "deep", critiqueRounds: 1, words: 450 },
  max: { plan: "deep", critiqueRounds: 2, words: 520 },
};

const SandboxState = Annotation.Root({
  input: Annotation<SandboxInput>(),
  error: Annotation<ApiError | null>(),
  extraErrors: Annotation<number>(),
  refused: Annotation<boolean>(),
  servedBy: Annotation<string>(),
  planNotes: Annotation<string>(),
  draft: Annotation<string>(),
  critiques: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  drafts: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  progress: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
  round: Annotation<number>(),
  response: Annotation<Record<string, unknown> | null>(),
  billing: Annotation<Record<string, number> | null>(),
});
type S = typeof SandboxState.State;

function makeGraph(key: string, model: string) {
  const llm = groqModel(key, model, 1600);

  return new StateGraph(SandboxState)
    .addNode("validate", (s: S) => {
      const errors = validate(s.input);
      if (errors.length) return { error: errors[0], extraErrors: errors.length - 1 };
      if (s.input.simulateRefusal && !s.input.fallbacks) return { error: null, refused: true };
      return {
        error: null,
        refused: false,
        servedBy: s.input.simulateRefusal ? "fallback model (routed by refusal category)" : s.input.model,
        progress: s.input.simulateRefusal ? ["Primary model declined (category: cyber). Fallback took over."] : [],
      };
    })
    .addNode("plan", async (s: S) => {
      const deep = EFFORT_PLAN[s.input.effort].plan === "deep";
      const res = await llm.invoke([
        new SystemMessage(
          `You are the private reasoning step of an assistant. Write a ${deep ? "thorough 8-12 step" : "concise 3-5 step"} plan for answering the user's request: key constraints, risks, structure of the answer. No preamble.`,
        ),
        new HumanMessage(s.input.prompt),
      ]);
      return { planNotes: textOf(res.content), progress: ["Scoped the request and sketched a plan."] };
    })
    .addNode("respond", async (s: S) => {
      const cfg = EFFORT_PLAN[s.input.effort];
      const res = await llm.invoke([
        new SystemMessage(
          `${s.input.system || "You are a helpful assistant."}

Style: direct, plain prose with light formatting only where it helps; no filler.
Aim for about ${cfg.words} words.${s.input.effort === "low" ? " Answer from what you already know; skip deliberation." : ""}${
            s.planNotes ? `\n\nFollow this private plan (do not mention it):\n${s.planNotes}` : ""
          }`,
        ),
        new HumanMessage(s.input.prompt),
      ]);
      return { draft: textOf(res.content), round: 0, progress: ["Drafted the answer."] };
    })
    .addNode("critique", async (s: S) => {
      const res = await llm.invoke([
        new SystemMessage(
          "You are a demanding reviewer. List the 3 most important weaknesses, errors or omissions in the draft answer, as terse bullets. No praise.",
        ),
        new HumanMessage(`REQUEST:\n${s.input.prompt}\n\nDRAFT:\n${s.draft}`),
      ]);
      return { critiques: [textOf(res.content)], progress: [`Self-review round ${s.round + 1}: found issues to fix.`] };
    })
    .addNode("refine", async (s: S) => {
      const res = await llm.invoke([
        new SystemMessage(
          `${s.input.system || "You are a helpful assistant."}\n\nRewrite the draft to fix every issue in the review. Output only the improved answer, similar length.`,
        ),
        new HumanMessage(`REQUEST:\n${s.input.prompt}\n\nDRAFT:\n${s.draft}\n\nREVIEW:\n${s.critiques.at(-1)}`),
      ]);
      return {
        drafts: [s.draft],
        draft: textOf(res.content),
        round: s.round + 1,
        progress: [`Applied fixes from round ${s.round + 1}.`],
      };
    })
    .addNode("account", (s: S) => accountFor(s))
    .addEdge(START, "validate")
    .addConditionalEdges(
      "validate",
      (s: S) => {
        if (s.error || s.refused) return "account";
        return EFFORT_PLAN[s.input.effort].plan ? "plan" : "respond";
      },
      ["account", "plan", "respond"],
    )
    .addEdge("plan", "respond")
    .addConditionalEdges(
      "respond",
      (s: S) => (EFFORT_PLAN[s.input.effort].critiqueRounds > 0 ? "critique" : "account"),
      ["critique", "account"],
    )
    .addEdge("critique", "refine")
    .addConditionalEdges(
      "refine",
      (s: S) => (s.round < EFFORT_PLAN[s.input.effort].critiqueRounds ? "critique" : "account"),
      ["critique", "account"],
    )
    .addEdge("account", END)
    .compile();
}

function accountFor(s: S) {
  const i = s.input;
  const price = MODELS[i.model];
  const apiRequest = buildApiRequest(i);

  if (s.error) {
    return {
      response: { type: "error", error: { type: s.error.type, message: s.error.message } },
      billing: { input: 0, output: 0, thinking: 0, cacheWrite: 0, cacheRead: 0, cost: 0 },
    };
  }

  // Input side: system prompt + attached document form the cacheable prefix.
  const sysTok = (i.system ? estTokens(i.system) + 8 : 0) + i.docTokens;
  const userTok = estTokens(i.prompt) + 12;
  const caches = i.cacheSystem && sysTok >= MIN_CACHEABLE;
  const cacheRead = caches && i.cacheWarm ? sysTok : 0;
  const cacheWrite = caches && !i.cacheWarm ? sysTok : 0;
  const freshInput = userTok + (caches ? 0 : sysTok);

  if (s.refused) {
    return {
      response: {
        id: "msg_sim_" + Math.random().toString(36).slice(2, 12),
        type: "message",
        role: "assistant",
        model: i.model,
        content: [],
        stop_reason: "refusal",
        stop_details: { type: "refusal", category: "cyber", explanation: "Simulated safety classifier decision." },
        usage: { input_tokens: freshInput, output_tokens: 0, cache_creation_input_tokens: cacheWrite, cache_read_input_tokens: cacheRead },
      },
      billing: cost(price, freshInput, 0, 0, cacheWrite, cacheRead),
    };
  }

  // Thinking = everything the graph did privately before the final text (billed as output).
  const thinkingText = [s.planNotes, ...s.drafts, ...s.critiques].filter(Boolean).join("\n\n");
  const thinkingTok = thinkingText ? estTokens(thinkingText) : Math.ceil(estTokens(s.draft) * 0.15);
  let text = s.draft;
  let textTok = estTokens(text);
  let stopReason = "end_turn";

  if (thinkingTok + textTok > i.maxTokens) {
    stopReason = "max_tokens";
    const room = Math.max(0, i.maxTokens - thinkingTok);
    text = room > 0 ? text.slice(0, room * 4) + " …" : "";
    textTok = room;
  }

  const thinkingBlock =
    i.display === "summarized"
      ? summarize(s)
      : i.display === "updates"
        ? s.progress.map((p) => "• " + p).join("\n")
        : "";

  const content: Record<string, unknown>[] = [
    { type: "thinking", thinking: thinkingBlock, signature: "sim_" + Math.random().toString(36).slice(2, 18) },
  ];
  if (text) content.push({ type: "text", text });

  const outputTok = Math.min(i.maxTokens, thinkingTok + textTok);
  return {
    response: {
      id: "msg_sim_" + Math.random().toString(36).slice(2, 12),
      type: "message",
      role: "assistant",
      model: i.model,
      content,
      stop_reason: stopReason,
      stop_details: null,
      usage: {
        input_tokens: freshInput,
        output_tokens: outputTok,
        cache_creation_input_tokens: cacheWrite,
        cache_read_input_tokens: cacheRead,
      },
      _simulator: { served_by: s.servedBy, request_body: apiRequest },
    },
    billing: cost(price, freshInput, outputTok, Math.min(thinkingTok, outputTok), cacheWrite, cacheRead),
  };
}

function summarize(s: S) {
  const firstLines = (t: string, n: number) => t.split("\n").filter((l) => l.trim()).slice(0, n).join("\n");
  const parts = [];
  if (s.planNotes) parts.push("Plan: " + firstLines(s.planNotes, 3));
  s.critiques.forEach((c, idx) => parts.push(`Review ${idx + 1}: ` + firstLines(c, 2)));
  return parts.join("\n") || "Answered directly with minimal deliberation.";
}

function cost(
  price: { input: number; output: number; cacheRead: number },
  input: number,
  output: number,
  thinking: number,
  cacheWrite: number,
  cacheRead: number,
) {
  const usd =
    (input * price.input + output * price.output + cacheWrite * price.input * 1.25 + cacheRead * price.cacheRead) / 1e6;
  return { input, output, thinking, cacheWrite, cacheRead, cost: usd };
}

export async function runSandbox(opts: { key: string; model: string; input: SandboxInput }, send: (obj: unknown) => void) {
  const graph = makeGraph(opts.key, opts.model);
  const stream = await graph.stream(
    { input: opts.input, planNotes: "", draft: "", round: 0, error: null, extraErrors: 0, refused: false, servedBy: "", response: null, billing: null },
    { streamMode: "updates", recursionLimit: 20 },
  );
  for await (const chunk of stream) {
    for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
      send({ type: "node", node, update });
    }
  }
  send({ type: "done" });
}
