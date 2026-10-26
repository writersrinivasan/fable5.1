import { ByokError, DEFAULT_GROQ_MODEL, MODEL_HEADER, ndjsonStream, readByok } from "@/lib/groq";
import { runSandbox } from "@/lib/graphs/sandbox";
import { DEFAULT_INPUT, validate, type SandboxInput } from "@/lib/sandbox-request";

export async function POST(req: Request) {
  const input = { ...DEFAULT_INPUT, ...((await req.json()) as Partial<SandboxInput>) };
  input.prompt = String(input.prompt).slice(0, 6000);
  input.system = String(input.system).slice(0, 6000);
  input.docTokens = Math.max(0, Math.min(900000, Number(input.docTokens) || 0));

  // Requests that fail validation (or are refused with no fallback) never reach a model,
  // so the "trigger a 400" demos work even before a key is added.
  const needsModel = validate(input).length === 0 && !(input.simulateRefusal && !input.fallbacks);

  let byok = { key: "", model: req.headers.get(MODEL_HEADER) || DEFAULT_GROQ_MODEL };
  if (needsModel) {
    try {
      byok = readByok(req);
    } catch (err) {
      if (err instanceof ByokError) return Response.json({ error: err.message }, { status: 401 });
      throw err;
    }
  }

  return ndjsonStream((send) => runSandbox({ ...byok, key: byok.key || "gsk_unused_no_model_call", input }, send));
}
