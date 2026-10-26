// Single source of truth for session content. The UI renders it and the
// LangGraph agents are grounded on it (see KNOWLEDGE_BASE at the bottom).
// Facts reflect the Claude API docs as of October 2026.

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

export type ModelId =
  | "claude-fable-5-1"
  | "claude-fable-5"
  | "claude-opus-5-5"
  | "claude-sonnet-5-5"
  | "claude-haiku-5-5";

export interface ModelInfo {
  id: ModelId;
  name: string;
  tagline: string;
  input: number; // $ per 1M input tokens
  output: number; // $ per 1M output tokens
  cacheRead: number; // $ per 1M cached-read tokens
  context: string;
  maxOutput: string;
  defaultEffort: Effort;
  color: string;
  emoji: string;
}

export const MODELS: Record<ModelId, ModelInfo> = {
  "claude-fable-5-1": {
    id: "claude-fable-5-1",
    name: "Fable 5.1",
    tagline: "Most capable widely released model",
    input: 10,
    output: 50,
    cacheRead: 0.25,
    context: "1M",
    maxOutput: "128K",
    defaultEffort: "high",
    color: "var(--c-violet)",
    emoji: "🐉",
  },
  "claude-fable-5": {
    id: "claude-fable-5",
    name: "Fable 5",
    tagline: "Previous Fable — still served, same price",
    input: 10,
    output: 50,
    cacheRead: 1.0,
    context: "1M",
    maxOutput: "128K",
    defaultEffort: "high",
    color: "var(--c-pink)",
    emoji: "📜",
  },
  "claude-opus-5-5": {
    id: "claude-opus-5-5",
    name: "Opus 5.5",
    tagline: "Default workhorse for serious work",
    input: 4,
    output: 20,
    cacheRead: 0.2,
    context: "1M",
    maxOutput: "128K",
    defaultEffort: "medium",
    color: "var(--c-blue)",
    emoji: "🎼",
  },
  "claude-sonnet-5-5": {
    id: "claude-sonnet-5-5",
    name: "Sonnet 5.5",
    tagline: "Speed + capability for everyday agents",
    input: 2,
    output: 10,
    cacheRead: 0.2,
    context: "1M",
    maxOutput: "128K",
    defaultEffort: "high",
    color: "var(--c-teal)",
    emoji: "🎵",
  },
  "claude-haiku-5-5": {
    id: "claude-haiku-5-5",
    name: "Haiku 5.5",
    tagline: "High-volume, low-latency routes",
    input: 0.1,
    output: 0.5,
    cacheRead: 0.01,
    context: "1M",
    maxOutput: "128K",
    defaultEffort: "medium",
    color: "var(--c-amber)",
    emoji: "🍃",
  },
};

export const AGENDA = [
  { start: 0, end: 5, title: "The Hook", emoji: "🎣", section: "hero", what: "Why Fable 5.1 exists, and a 60-second live sandbox teaser." },
  { start: 5, end: 12, title: "Fable 5 → 5.1: What changed", emoji: "🆕", section: "capabilities", what: "Six capability jumps, three breaking changes, new API knobs." },
  { start: 12, end: 22, title: "Capabilities & API surface", emoji: "🧠", section: "capabilities", what: "Always-on thinking, effort levels, 1M context, 128K output, refusals + fallbacks." },
  { start: 22, end: 32, title: "Hands-on Sandbox", emoji: "🧪", section: "sandbox", what: "Trigger the 400s live, run an effort sweep, watch the cost meter." },
  { start: 32, end: 40, title: "Token & Cost Lab", emoji: "💸", section: "tokens", what: "Caching at 0.025×, batch at 50%, effort tuning, keep-alive trick." },
  { start: 40, end: 50, title: "Industry use cases", emoji: "🏭", section: "usecases", what: "Where Fable 5.1 pays for itself — and where Haiku/Sonnet win." },
  { start: 50, end: 56, title: "Agentic build: LangGraph Coach", emoji: "🕸️", section: "coach", what: "Router → specialist → fact-check graph, BYOK on Groq." },
  { start: 56, end: 60, title: "Quiz & Q&A", emoji: "🏆", section: "quiz", what: "Eight rapid-fire questions. Winner gets bragging rights." },
];

export const CAPABILITIES = [
  { emoji: "👩‍💻", title: "Long-horizon agentic coding", body: "Multi-file features, large refactors and migrations, debugging and code review across sessions that run for hours.", color: "var(--c-violet)" },
  { emoji: "📊", title: "Knowledge work", body: "From a first question to a finished document, live-formula spreadsheet, or deck built from a blank page.", color: "var(--c-pink)" },
  { emoji: "🔎", title: "Research & search", body: "Multistep web research that follows up on what it finds instead of stopping at the first answer.", color: "var(--c-blue)" },
  { emoji: "👁️", title: "Vision", body: "Dense charts, filings and tables nested in PDFs — strongest when given tools to crop and zoom.", color: "var(--c-teal)" },
  { emoji: "📚", title: "Long-context retrieval", body: "Finds needles deep in the 1M-token window (the max is also the default).", color: "var(--c-amber)" },
  { emoji: "🖱️", title: "Computer use", body: "Operates browsers and desktop apps more reliably, and recovers from failed steps.", color: "var(--c-lime)" },
];

export const SPECS = [
  { label: "Model ID", value: "claude-fable-5-1" },
  { label: "Context window", value: "1M tokens (default = max)" },
  { label: "Max output", value: "128K tokens / request" },
  { label: "Input price", value: "$10 / 1M tokens" },
  { label: "Output price", value: "$50 / 1M tokens" },
  { label: "Cache read", value: "$0.25 / 1M (0.025× input)" },
  { label: "Cache write", value: "1.25× (5-min) · 2× (1-hour)" },
  { label: "Batch API", value: "50% off, async" },
  { label: "Thinking", value: "Always on (adaptive)" },
  { label: "Effort", value: "low · medium · high (default) · xhigh · max" },
];

export const BREAKING = [
  { title: "Thinking can't be configured", body: "Omit `thinking` (or send {type:\"adaptive\"}). {type:\"disabled\"} and budget_tokens both return 400. Use output_config.effort instead.", code: "thinking: { type: \"enabled\", budget_tokens: 8000 } // ❌ 400" },
  { title: "No assistant prefill", body: "A final assistant message used as a prefill returns 400. Use structured outputs (output_config.format) or system instructions.", code: "{ role: \"assistant\", content: \"{\" } // ❌ 400" },
  { title: "No forced tool use", body: "tool_choice {type:\"any\"} or {type:\"tool\"} returns 400. Use auto + a prompt instruction, strict: true, or structured outputs.", code: "tool_choice: { type: \"any\" } // ❌ 400" },
  { title: "Thinking blocks are bound", body: "Thinking blocks are tied to the model that produced them; other models drop them (unbilled). Pass them back unchanged.", code: "// pass response.content back verbatim ✅" },
  { title: "History is append-only", body: "Editing earlier turns invalidates the thinking blocks after the edit (preserved thinking). Build harnesses that only append.", code: "messages.push(...) // ✅  messages[2] = ... // ⚠️" },
  { title: "No sampling params", body: "temperature, top_p and top_k return 400 on Fable 5.1 (and on every model from the 2026-10-21 API version).", code: "temperature: 0.2 // ❌ 400" },
];

export const NEW_KNOBS = [
  { title: "Per-message effort", tag: "beta", body: "Change effort mid-conversation via a system message with output_config — no cache reset." },
  { title: "display: \"updates\"", tag: "beta", body: "Get short between-tool progress notes instead of an empty thinking block." },
  { title: "Turn-scoped system messages", tag: "beta", body: "clear_at: \"next_user_message\" for one-turn reminders that don't break the cache." },
  { title: "Mid-conversation system messages", tag: "GA", body: "Append {role:\"system\"} to messages[] instead of editing the top-level system prompt." },
  { title: "Server-side fallbacks", tag: "beta", body: "fallbacks: \"default\" reroutes a safety refusal by category — check stop_reason first." },
  { title: "Cheaper cache reads", tag: "GA", body: "$0.25/MTok — 0.025× input. A keep-alive ping usually beats the 1-hour TTL." },
];

export const BEHAVIOR_SHIFTS = [
  "Writes fewer user-facing progress updates in long tool loops → request display: \"updates\" and drop old \"don't narrate\" prompt text.",
  "Uses less bold, fewer headers and lists → remove anti-formatting rules; say when formatting is appropriate.",
  "Prose can be denser → \"Please remove all mannered prose.\" works, best placed in the first user turn.",
  "Batches *implied* tool calls less → append a one-line nudge after tool results only if your metrics show it.",
  "At low effort, answers from memory more → good for chat, check it for research routes.",
  "At xhigh/max, may draft long deliverables twice (in thinking + reply) → prefer high for long outputs, or give it a max_tokens note.",
];

export const USE_CASES = [
  { industry: "Software & SaaS", emoji: "🛠️", color: "var(--c-violet)", scenario: "Migrate a 400-file monolith module to a new framework across a multi-hour agent session.", why: "Long-horizon coding is the biggest 5.1 gain; 1M context holds the module + tests.", effort: "high → xhigh", verdict: "fable" },
  { industry: "Financial Services", emoji: "🏦", color: "var(--c-blue)", scenario: "Reconcile numbers across a 10-K, an earnings deck and analyst PDFs full of nested tables.", why: "Vision on dense filings + long-context retrieval. Wrong numbers are expensive.", effort: "high", verdict: "fable" },
  { industry: "Legal", emoji: "⚖️", color: "var(--c-pink)", scenario: "Review a data room of contracts for change-of-control clauses and conflicts.", why: "Needle-in-haystack retrieval across ~1M tokens; cache the corpus, vary the question.", effort: "medium → high", verdict: "fable" },
  { industry: "Consulting & Strategy", emoji: "📈", color: "var(--c-amber)", scenario: "Turn interview notes into a finished deck and a live-formula financial model.", why: "Knowledge-work from blank page to deliverable is a named 5.1 improvement.", effort: "high", verdict: "fable" },
  { industry: "Manufacturing & Ops", emoji: "🏭", color: "var(--c-teal)", scenario: "Automate a legacy desktop ERP with no API via computer use, recovering from UI errors.", why: "Computer use reliability and failure recovery improved in 5.1.", effort: "medium → high", verdict: "fable" },
  { industry: "Research & Pharma", emoji: "🧬", color: "var(--c-lime)", scenario: "Multistep literature review that follows citations and synthesises evidence.", why: "Research that follows up on what it finds. Enable fallbacks — bio classifiers may decline some requests.", effort: "high", verdict: "fable" },
  { industry: "Customer Support", emoji: "🎧", color: "var(--c-orange)", scenario: "Answer 200K tickets/day about order status and returns.", why: "High volume, latency-sensitive, simple. Haiku 5.5 or Sonnet 5.5; route only escalations to Fable.", effort: "low", verdict: "cheaper" },
  { industry: "E-commerce", emoji: "🛒", color: "var(--c-red)", scenario: "Classify and tag 5M product listings overnight.", why: "Classification at scale → Haiku 5.5 via Batch API. Fable is overkill here.", effort: "low", verdict: "cheaper" },
] as const;

export const DECISION_QUESTIONS = [
  { id: "hard", q: "Is the task genuinely hard — multi-step, ambiguous, or long-horizon?", yes: 3, no: -3 },
  { id: "cost", q: "Is a wrong answer expensive (money, legal, safety, rework)?", yes: 2, no: -1 },
  { id: "volume", q: "Will this run more than ~10K times a day?", yes: -3, no: 1 },
  { id: "latency", q: "Does a user wait on every response in real time?", yes: -2, no: 1 },
  { id: "context", q: "Does it need to reason across hundreds of thousands of tokens?", yes: 2, no: 0 },
  { id: "agent", q: "Will it run as an autonomous agent for many tool calls?", yes: 2, no: 0 },
];

export const TOKEN_TIPS = [
  { emoji: "🧊", title: "Cache the stable prefix", body: "Put tools → system → long docs first, volatile content last. Cache reads on Fable 5.1 are 0.025× — 40× cheaper than fresh input." },
  { emoji: "⏱️", title: "Keep-alive beats 1-hour TTL", body: "On Fable 5.1, re-send the last request with max_tokens: 0 (non-streaming) before the 5-min entry expires instead of paying the 2× 1h write." },
  { emoji: "🎚️", title: "Tune effort per route", body: "Start at high. medium ≈ Fable 5 quality for less; low is often competitive with Opus/Sonnet on cost per task." },
  { emoji: "📦", title: "Batch anything not interactive", body: "Message Batches API = 50% off. Results arrive in any order — key them by custom_id." },
  { emoji: "🧮", title: "Measure with count_tokens", body: "Never tiktoken. Coming from Opus 4.6/Sonnet/Haiku? Re-baseline — the newer tokenizer uses ~1–1.35× tokens." },
  { emoji: "🧾", title: "Append, don't edit", body: "Editing history breaks the cache AND invalidates thinking blocks. Mid-conversation system messages keep the prefix intact." },
  { emoji: "✂️", title: "Avoid double-drafting", body: "At xhigh/max, long deliverables may be drafted in thinking then rewritten. Use high for long outputs." },
  { emoji: "🔀", title: "Route, don't overspend", body: "Haiku for triage, Sonnet for everyday agents, Fable for the hard 5%. Caches are model-scoped, so measure before cascading." },
  { emoji: "🔍", title: "Verify cache hits", body: "Watch usage.cache_read_input_tokens. Zero on repeats = a silent invalidator (timestamps, unsorted JSON, changing tools)." },
  { emoji: "🧯", title: "Set max_tokens generously", body: "It caps thinking + reply together. Too low → truncated output and a paid retry. Stream when it's large." },
];

export const CODE_SNIPPETS = {
  basic: `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const msg = await client.messages.create({
  model: "claude-fable-5-1",
  max_tokens: 16000,
  output_config: { effort: "high" },   // low | medium | high | xhigh | max
  // no "thinking" field — it's always on (adaptive)
  messages: [{ role: "user", content: "Plan a zero-downtime Postgres 14 → 17 upgrade." }],
});

if (msg.stop_reason === "refusal") {
  console.warn(msg.stop_details?.category);
} else {
  for (const block of msg.content) if (block.type === "text") console.log(block.text);
}`,
  caching: `const msg = await client.messages.create({
  model: "claude-fable-5-1",
  max_tokens: 16000,
  system: [
    {
      type: "text",
      text: LONG_POLICY_MANUAL,                 // stable → cache it
      cache_control: { type: "ephemeral" },     // 5-min TTL, 1.25× write
    },
  ],
  messages: [{ role: "user", content: question }], // volatile → after the breakpoint
});

console.log(msg.usage.cache_read_input_tokens);    // > 0 on repeats = $0.25/MTok`,
  count: `const { input_tokens } = await client.messages.countTokens({
  model: "claude-fable-5-1",
  system: LONG_POLICY_MANUAL,
  messages: [{ role: "user", content: question }],
});
const est = (input_tokens / 1e6) * 10; // $10 / MTok input on Fable 5.1`,
  batch: `const batch = await client.messages.batches.create({
  requests: filings.map((f) => ({
    custom_id: f.id,
    params: {
      model: "claude-fable-5-1",
      max_tokens: 8000,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: f.prompt }],
    },
  })),
}); // 50% off — poll processing_status until "ended"`,
  fallback: `const msg = await client.beta.messages.create({
  model: "claude-fable-5-1",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",              // reroute safety refusals by category
  messages,
});`,
};

export const QUIZ = [
  { q: "What happens if you send thinking: {type: \"disabled\"} to claude-fable-5-1?", options: ["Thinking turns off", "400 error", "It's silently ignored", "Effort drops to low"], answer: 1, why: "Thinking is always on. Omit the field and control depth with output_config.effort." },
  { q: "What's the default effort level on Fable 5.1?", options: ["low", "medium", "high", "max"], answer: 2, why: "high is the default (Opus 5.5 defaults to medium — a common gotcha when switching)." },
  { q: "Fable 5.1 cache reads cost…", options: ["0.1× input", "0.5× input", "0.025× input", "Free"], answer: 2, why: "$0.25 per million tokens vs $10 fresh — 40× cheaper." },
  { q: "You need JSON back. Which approach works on Fable 5.1?", options: ["Prefill the assistant with \"{\"", "tool_choice: {type: \"any\"}", "output_config.format (structured outputs)", "temperature: 0"], answer: 2, why: "Prefill, forced tool choice and sampling params all return 400." },
  { q: "Max output tokens per request?", options: ["32K", "64K", "128K", "1M"], answer: 2, why: "128K output, 1M context. Use streaming for large max_tokens." },
  { q: "Best way to keep a Fable 5.1 cache warm through 20-minute gaps?", options: ["Always use the 1-hour TTL", "A max_tokens: 0 keep-alive before the 5-min expiry", "Disable caching", "Use Batch API"], answer: 1, why: "Reads are so cheap on 5.1 that a keep-alive usually beats the 2× write of the 1h TTL." },
  { q: "200K simple support tickets per day. Best default?", options: ["Fable 5.1 at max", "Fable 5.1 at high", "Haiku 5.5 / Sonnet 5.5, escalate hard ones", "Fable 5 for savings"], answer: 2, why: "Fable is for the hard tail. Volume + latency + simplicity → smaller models." },
  { q: "Why should agent harnesses be append-only on Fable 5.1?", options: ["To save disk", "Editing earlier turns invalidates later thinking blocks and the cache", "The API rejects arrays over 100 messages", "It's faster to stream"], answer: 1, why: "Preserved thinking binds blocks to the conversation; history edits break them." },
];

export const KNOWLEDGE_BASE = `
CLAUDE FABLE 5.1 — VERIFIED FACTS (Claude API docs, Oct 2026). Use only these for numbers and API details.
- Model ID: claude-fable-5-1. Anthropic's most capable widely released model, for the most demanding reasoning and long-horizon agentic work. Successor to Fable 5 (claude-fable-5, still served) at the same price and tokenizer.
- Context 1M tokens (default = max). Max output 128K tokens per request (stream for large max_tokens).
- Pricing per 1M tokens: input $10, output $50, cache read $0.25 (0.025x input). Cache writes 1.25x (5-min TTL) or 2x (1-hour TTL). Batch API 50% off. No Priority Tier. Thinking tokens are billed as output.
- Comparison: Opus 5.5 $4/$20 (cache read $0.20, default effort medium). Sonnet 5.5 $2/$10. Haiku 5.5 $0.10/$0.50 (prompts up to 100K). Fable 5 $10/$50.
- Thinking is always on (adaptive). Omit "thinking" or send {type:"adaptive"}. {type:"disabled"} or {type:"enabled", budget_tokens} -> 400. Raw chain of thought never returned; display "omitted" (default, empty thinking text), "summarized", or "updates" (beta, progress notes between tool calls).
- Effort via output_config.effort: low, medium, high (default), xhigh, max. Start at high; medium roughly matches Fable 5 quality at lower cost; low is often competitive with Opus and Sonnet on cost per task. Gains over Fable 5 are largest at higher effort. At xhigh/max long deliverables may be drafted twice (thinking + reply) -> prefer high or set large max_tokens.
- Breaking changes: no assistant prefill (400); forced tool_choice any/tool -> 400 (use auto + instruction, strict:true, or structured outputs output_config.format); temperature/top_p/top_k -> 400; thinking blocks bound to producing model; editing earlier turns invalidates thinking blocks (preserved thinking) -> keep harnesses append-only.
- Safety: stop_reason "refusal" (HTTP 200) with stop_details.category; always check stop_reason before reading content. Server-side fallbacks: beta header server-side-fallback-2026-07-01 + fallbacks:"default".
- Requires 30-day data retention; not available under zero data retention unless expressly authorized.
- New knobs: per-message effort (beta mid-conversation-output-config-2026-07-01), turn-scoped system messages clear_at:"next_user_message" (beta), mid-conversation {role:"system"} messages (no beta), display:"updates" (beta), compaction (beta compact-2026-01-12), task budgets (beta, output_config.task_budget, min 20K).
- Capability gains vs Fable 5: long-session agentic coding; knowledge work with documents/spreadsheets/slides; multistep research; vision on dense charts/filings/PDF tables; long-context retrieval; computer use. Multilingual on par with Fable 5.
- Behavior shifts: fewer progress updates in tool loops, less formatting, denser prose, batches implied tool calls less, answers from memory more at low effort.
- Token optimization: cache stable prefix (tools -> system -> messages order), verify usage.cache_read_input_tokens, keep-alive with max_tokens:0 often beats 1h TTL on Fable 5.1, measure with messages.count_tokens (not tiktoken), tokenizer same as Opus 4.7/4.8/Fable 5 (~1-1.35x tokens vs Opus 4.6/Sonnet/Haiku 4.5), batch non-interactive work, tune effort per route, avoid editing history, route easy traffic to Haiku/Sonnet.
- When to use Fable 5.1: hard, high-stakes, long-horizon, large-context or agentic tasks. When not: high-volume, latency-sensitive, simple classification/chat -> Haiku 5.5 / Sonnet 5.5; general default -> Opus 5.5.
- Access: Fable 5.1 is available through the Claude API (pay per token). Do not make claims about which consumer subscription plans include it.
`.trim();
