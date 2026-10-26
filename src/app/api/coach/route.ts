import { ByokError, ndjsonStream, readByok } from "@/lib/groq";
import { runCoach, type ChatTurn } from "@/lib/graphs/coach";

export async function POST(req: Request) {
  let byok;
  try {
    byok = readByok(req);
  } catch (err) {
    if (err instanceof ByokError) return Response.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const body = (await req.json()) as { question?: string; history?: ChatTurn[]; factcheck?: boolean };
  const question = body.question?.trim();
  if (!question) return Response.json({ error: "Ask a question first." }, { status: 400 });

  return ndjsonStream((send) =>
    runCoach(
      {
        ...byok,
        question: question.slice(0, 4000),
        history: (body.history ?? []).slice(-6),
        factcheck: body.factcheck !== false,
      },
      send,
    ),
  );
}
