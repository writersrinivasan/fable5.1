import { ByokError, readByok, safeMessage } from "@/lib/groq";

// Lists the chat models this Groq key can use, so the picker never offers a retired model.
export async function GET(req: Request) {
  let key: string;
  try {
    key = readByok(req).key;
  } catch (err) {
    if (err instanceof ByokError) return Response.json({ error: err.message }, { status: 401 });
    throw err;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) {
      return Response.json(
        { error: res.status === 401 ? "Groq rejected this key (401). Check it at console.groq.com/keys." : `Groq returned ${res.status}.` },
        { status: res.status },
      );
    }
    const data = (await res.json()) as { data: { id: string; active?: boolean; context_window?: number }[] };
    const models = data.data
      .filter((m) => m.active !== false && !/whisper|tts|guard|orpheus|playai/i.test(m.id))
      .map((m) => ({ id: m.id, context: m.context_window ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return Response.json({ models });
  } catch (err) {
    return Response.json({ error: safeMessage(err) }, { status: 502 });
  }
}
