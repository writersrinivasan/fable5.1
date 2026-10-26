// Shared by the browser (live request preview) and the server (validation),
// so what the audience sees is exactly what gets checked.
import { MODELS, type Effort, type ModelId } from "@/lib/fable-data";

export type ThinkingMode = "omit" | "adaptive" | "disabled" | "budget";
export type DisplayMode = "omitted" | "summarized" | "updates";
export type ToolChoice = "none" | "auto" | "any" | "tool";

export interface SandboxInput {
  model: ModelId;
  effort: Effort;
  maxTokens: number;
  thinking: ThinkingMode;
  display: DisplayMode;
  toolChoice: ToolChoice;
  prefill: string;
  temperature: boolean;
  system: string;
  cacheSystem: boolean;
  cacheWarm: boolean;
  docTokens: number; // simulated document in the cached prefix — counted, never sent to Groq
  prompt: string;
  simulateRefusal: boolean;
  fallbacks: boolean;
}

export const DEFAULT_INPUT: SandboxInput = {
  model: "claude-fable-5-1",
  effort: "high",
  maxTokens: 16000,
  thinking: "omit",
  display: "summarized",
  toolChoice: "none",
  prefill: "",
  temperature: false,
  system: "You are a senior solutions architect. Be direct and concrete.",
  cacheSystem: true,
  cacheWarm: false,
  docTokens: 40000,
  prompt: "Design a migration plan to move a 2TB Postgres 14 database to Postgres 17 with under 60 seconds of downtime.",
  simulateRefusal: false,
  fallbacks: true,
};

export interface ApiError {
  status: number;
  type: "invalid_request_error";
  message: string;
  fix: string;
}

const BETA_HEADERS = (i: SandboxInput) => {
  const betas: string[] = [];
  if (i.fallbacks) betas.push("server-side-fallback-2026-07-01");
  if (i.display === "updates") betas.push("thinking-display-updates-2026-08-18");
  return betas;
};

// The request body a real Claude API call would send for these settings.
export function buildApiRequest(i: SandboxInput): Record<string, unknown> {
  const body: Record<string, unknown> = { model: i.model, max_tokens: i.maxTokens };
  const betas = BETA_HEADERS(i);
  if (betas.length) body.betas = betas;
  if (i.fallbacks) body.fallbacks = "default";

  if (i.system || i.docTokens) {
    const blocks: Record<string, unknown>[] = [];
    if (i.system) blocks.push({ type: "text", text: i.system });
    if (i.docTokens) blocks.push({ type: "text", text: `<${i.docTokens.toLocaleString("en-US")}-token reference document>` });
    if (i.cacheSystem) blocks[blocks.length - 1].cache_control = { type: "ephemeral" };
    body.system = blocks;
  }

  if (i.thinking === "adaptive") body.thinking = { type: "adaptive", display: i.display };
  else if (i.thinking === "disabled") body.thinking = { type: "disabled" };
  else if (i.thinking === "budget") body.thinking = { type: "enabled", budget_tokens: 8000 };
  else if (i.display !== "omitted") body.thinking = { type: "adaptive", display: i.display };

  body.output_config = { effort: i.effort };
  if (i.temperature) body.temperature = 0.2;

  if (i.toolChoice !== "none") {
    body.tools = [
      {
        name: "run_sql",
        description: "Run a read-only SQL query against the staging replica.",
        strict: true,
        input_schema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
          additionalProperties: false,
        },
      },
    ];
    body.tool_choice = i.toolChoice === "tool" ? { type: "tool", name: "run_sql" } : { type: i.toolChoice };
  }

  const messages: Record<string, unknown>[] = [{ role: "user", content: i.prompt }];
  if (i.prefill) messages.push({ role: "assistant", content: i.prefill });
  body.messages = messages;
  return body;
}

// Mirrors the documented 400s for the Fable 5 / 5.1 surface.
export function validate(i: SandboxInput): ApiError[] {
  const errors: ApiError[] = [];
  // Haiku 5.5 is the only model here that still accepts "disabled", and only at effort high or below.
  const rejectsDisabled =
    i.model !== "claude-haiku-5-5" || i.effort === "xhigh" || i.effort === "max";

  if (rejectsDisabled && i.thinking === "disabled") {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: `thinking.type "disabled" is not supported for ${i.model}.`,
      fix: "Remove the thinking field. Thinking is always on — lower output_config.effort instead.",
    });
  }
  if (i.thinking === "budget") {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: `thinking.type "enabled" with budget_tokens is not supported for ${i.model}.`,
      fix: "Delete budget_tokens. Use output_config.effort (low → max) to control depth.",
    });
  }
  if (i.prefill) {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: "This model does not support assistant message prefill. The conversation must end with a user message.",
      fix: "Use structured outputs (output_config.format) or a system instruction to shape the response.",
    });
  }
  if ((i.toolChoice === "any" || i.toolChoice === "tool") && i.model !== "claude-fable-5" && i.model !== "claude-haiku-5-5") {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: 'tool_choice: type "tool" and "any" are not supported for this model.',
      fix: 'Use tool_choice {type:"auto"} + "Use the run_sql tool" in the prompt, keep strict: true.',
    });
  }
  if (i.temperature) {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: "temperature is not supported for this model.",
      fix: "Remove temperature/top_p/top_k. Steer with the prompt and effort.",
    });
  }
  if (i.maxTokens > 128000) {
    errors.push({
      status: 400,
      type: "invalid_request_error",
      message: `max_tokens: ${i.maxTokens} > 128000, which is the maximum allowed for ${i.model}.`,
      fix: "Keep max_tokens ≤ 128000 and stream large responses.",
    });
  }
  if (!i.prompt.trim()) {
    errors.push({ status: 400, type: "invalid_request_error", message: "messages: at least one message is required.", fix: "Type a prompt." });
  }
  return errors;
}

export function priceOf(model: ModelId) {
  return MODELS[model];
}

// Every model in this sandbox has a 512-token minimum cacheable prefix; shorter prefixes silently don't cache.
export const MIN_CACHEABLE = 512;
