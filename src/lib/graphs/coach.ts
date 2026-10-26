import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { groqModel, textOf } from "@/lib/groq";
import { KNOWLEDGE_BASE } from "@/lib/fable-data";

// "Fable Coach": router → specialist → fact-checker.
// Every specialist is grounded on KNOWLEDGE_BASE so numbers stay correct.

export const INTENTS = ["concept", "code", "cost", "usecase", "quiz"] as const;
export type Intent = (typeof INTENTS)[number];

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const CoachState = Annotation.Root({
  history: Annotation<ChatTurn[]>(),
  question: Annotation<string>(),
  intent: Annotation<Intent>(),
  draft: Annotation<string>(),
  answer: Annotation<string>(),
  doFactcheck: Annotation<boolean>(),
  corrections: Annotation<string>(),
});

const PERSONAS: Record<Intent, string> = {
  concept:
    "You are Fable Coach, a lively instructor. Explain the concept clearly with one vivid analogy and a 3-5 bullet takeaway. Keep it under 220 words.",
  code:
    "You are Fable Coach, a senior engineer. Give a short explanation then a correct, minimal TypeScript example using @anthropic-ai/sdk with model \"claude-fable-5-1\". Never use thinking budget_tokens, prefill, temperature, or forced tool_choice. Under 260 words plus code.",
  cost:
    "You are Fable Coach, a FinOps expert for LLMs. Do the arithmetic step by step using the listed prices, show the formula, and finish with 2-3 concrete token-optimization actions.",
  usecase:
    "You are Fable Coach, an AI solutions architect. Map the scenario to a recommendation: which model, which effort level, caching/batch strategy, and when NOT to use Fable 5.1. Use a short table if helpful.",
  quiz:
    "You are Fable Coach, a fun quiz host. Ask 3 multiple-choice questions about the topic (A-D), then give the answer key with one-line explanations at the end under 'Answers'.",
};

function makeGraph(key: string, model: string) {
  const fast = groqModel(key, model, 20);
  const llm = groqModel(key, model, 1400);

  const toMessages = (history: ChatTurn[]): BaseMessage[] =>
    history.slice(-6).map((t) => (t.role === "user" ? new HumanMessage(t.content) : new AIMessage(t.content)));

  return new StateGraph(CoachState)
    .addNode("router", async (s) => {
      const res = await fast.invoke([
        new SystemMessage(
          `Classify the user's message into exactly one label: ${INTENTS.join(", ")}.
concept = explain features/behaviour; code = wants code or API usage; cost = pricing, tokens, budgets, optimisation math;
usecase = industry scenario or which model to choose; quiz = wants to be tested. Reply with the label only.`,
        ),
        new HumanMessage(s.question),
      ]);
      const label = textOf(res.content).toLowerCase();
      const intent = INTENTS.find((i) => label.includes(i)) ?? "concept";
      return { intent };
    })
    .addNode("specialist", async (s) => {
      const res = await llm.invoke([
        new SystemMessage(`${PERSONAS[s.intent]}

Ground every fact in this knowledge base. If something isn't covered, say you're not sure rather than inventing it.

${KNOWLEDGE_BASE}`),
        ...toMessages(s.history),
        new HumanMessage(s.question),
      ]);
      return { draft: textOf(res.content) };
    })
    .addNode("factcheck", async (s) => {
      const res = await llm.invoke([
        new SystemMessage(`You are a strict fact-checker. Compare the DRAFT against the KNOWLEDGE BASE.
Fix any wrong model IDs, prices, limits, effort levels or API rules. Keep the draft's tone, structure and length.
Output exactly two sections:
CORRECTIONS: <one line per fix, or "none">
FINAL:
<the corrected answer>

KNOWLEDGE BASE:
${KNOWLEDGE_BASE}`),
        new HumanMessage(`DRAFT:\n${s.draft}`),
      ]);
      const out = textOf(res.content);
      const finalIdx = out.indexOf("FINAL:");
      if (finalIdx === -1) return { answer: s.draft, corrections: "none" };
      const corrections = out.slice(0, finalIdx).replace("CORRECTIONS:", "").trim() || "none";
      return { answer: out.slice(finalIdx + 6).trim() || s.draft, corrections };
    })
    .addNode("deliver", async (s) => ({ answer: s.answer || s.draft }))
    .addEdge(START, "router")
    .addEdge("router", "specialist")
    .addConditionalEdges("specialist", (s) => (s.doFactcheck ? "factcheck" : "deliver"), ["factcheck", "deliver"])
    .addEdge("factcheck", "deliver")
    .addEdge("deliver", END)
    .compile();
}

export async function runCoach(
  opts: { key: string; model: string; question: string; history: ChatTurn[]; factcheck: boolean },
  send: (obj: unknown) => void,
) {
  const graph = makeGraph(opts.key, opts.model);
  const stream = await graph.stream(
    { question: opts.question, history: opts.history, doFactcheck: opts.factcheck, answer: "", draft: "", corrections: "" },
    { streamMode: "updates" },
  );
  for await (const chunk of stream) {
    for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
      send({ type: "node", node, update });
    }
  }
  send({ type: "done" });
}
