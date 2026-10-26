import { ChatGroq } from "@langchain/groq";

// BYOK: the browser sends the user's Groq key in this header on every call.
// The server never stores or logs it; it lives only for the request.
export const KEY_HEADER = "x-groq-key";
export const MODEL_HEADER = "x-groq-model";
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

const GROQ_KEY_RE = /^gsk_[A-Za-z0-9]{20,}$/;

export function isGroqKey(key: string | null | undefined): key is string {
  return !!key && GROQ_KEY_RE.test(key.trim());
}

export class ByokError extends Error {}

export function readByok(req: Request) {
  const key = req.headers.get(KEY_HEADER)?.trim();
  if (!isGroqKey(key)) {
    throw new ByokError(
      "Missing or malformed Groq key. Expected format: gsk_ followed by letters/digits. Add it in the 🔑 Key Vault.",
    );
  }
  const model = req.headers.get(MODEL_HEADER)?.trim() || DEFAULT_GROQ_MODEL;
  return { key, model };
}

export function groqModel(key: string, model: string, maxTokens = 1500) {
  return new ChatGroq({ apiKey: key, model, temperature: 0.4, maxTokens, maxRetries: 1 });
}

export function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : (c as { text?: string }).text ?? ""))
      .join("");
  }
  return "";
}

// Groq error bodies sometimes echo request headers; never surface anything that looks like a key.
export function safeMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/gsk_[A-Za-z0-9]+/g, "gsk_••••").slice(0, 400);
}

// Streams one JSON object per line so the UI can light up graph nodes live.
export function ndjsonStream(run: (send: (obj: unknown) => void) => Promise<void>) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        await run(send);
      } catch (err) {
        send({ type: "error", message: safeMessage(err) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Rough token estimate (~4 chars/token). Real Fable 5.1 counts come from messages.count_tokens.
export const estTokens = (s: string) => Math.max(1, Math.ceil(s.length / 4));
