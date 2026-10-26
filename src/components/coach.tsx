"use client";

import { useEffect, useRef, useState } from "react";
import { readNdjson, useByok } from "./byok";
import { GraphViz, type VizNode } from "./graph-viz";
import { Heading } from "./learn";

const NODES: VizNode[] = [
  { id: "router", label: "router", emoji: "🚦" },
  { id: "specialist", label: "specialist", emoji: "🎓" },
  { id: "factcheck", label: "fact-check", emoji: "✅" },
  { id: "deliver", label: "deliver", emoji: "📬" },
];

const INTENT_BADGE: Record<string, string> = {
  concept: "💡 Concept explainer",
  code: "⌨️ Code mentor",
  cost: "💸 FinOps advisor",
  usecase: "🏭 Solutions architect",
  quiz: "🏆 Quiz host",
};

const SUGGESTIONS = [
  "When should I pick Fable 5.1 over Opus 5.5?",
  "Show me TypeScript to call Fable 5.1 with prompt caching",
  "Cost of 5,000 requests/day, 20K input + 2K output tokens on Fable 5.1, 80% cache hits?",
  "A bank wants to analyse 10-K filings — design the setup",
  "Quiz me on Fable 5.1 breaking changes",
];

interface Turn {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  corrections?: string;
}

// Minimal, safe markdown: escape everything, then add code, bold, headings and lists.
function renderMarkdown(src: string) {
  const esc = src.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = esc.split(/```/);
  return blocks
    .map((b, i) => {
      if (i % 2 === 1) return `<pre><code>${b.replace(/^[a-z]*\n/, "")}</code></pre>`;
      return b
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/^### (.*)$/gm, "<h3>$1</h3>")
        .replace(/^## (.*)$/gm, "<h3>$1</h3>")
        .replace(/^# (.*)$/gm, "<h3>$1</h3>")
        .replace(/^\s*[-*•] (.*)$/gm, "<li>$1</li>")
        .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>")
        .replace(/\n{2,}/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");
    })
    .join("");
}

export function Coach() {
  const byok = useByok();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [factcheck, setFactcheck] = useState(true);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setErr("");
    setQ("");
    const history = turns.map(({ role, content }) => ({ role, content }));
    setTurns((t) => [...t, { role: "user", content: question }]);
    setBusy(true);
    setVisits({});
    setActive("router");
    const v: Record<string, number> = {};
    let intent = "";
    let draft = "";
    let answer = "";
    let corrections = "";
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...byok.headers() },
        body: JSON.stringify({ question, history, factcheck }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      await readNdjson(res, (e) => {
        if (e.type === "error") throw new Error(String(e.message));
        if (e.type !== "node") return;
        const node = String(e.node);
        const u = e.update as Record<string, string>;
        v[node] = (v[node] ?? 0) + 1;
        setVisits({ ...v });
        if (node === "router") {
          intent = u.intent;
          setActive("specialist");
        }
        if (node === "specialist") {
          draft = u.draft;
          setActive(factcheck ? "factcheck" : "deliver");
        }
        if (node === "factcheck") {
          corrections = u.corrections;
          setActive("deliver");
        }
        if (node === "deliver") answer = u.answer;
      });
      setTurns((t) => [...t, { role: "assistant", content: answer || draft, intent, corrections }]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setTurns((t) => t.slice(0, -1));
      setQ(question);
    } finally {
      setBusy(false);
      setActive(null);
    }
  }

  return (
    <section id="coach" className="mx-auto max-w-7xl px-4 py-14">
      <Heading
        kicker="AGENTIC AI · LANGGRAPH · BYOK GROQ"
        title="Fable Coach — your AI teaching assistant"
        color="text-violet"
        sub="A LangGraph agent: a router picks a specialist persona, the specialist answers grounded on a verified Fable 5.1 knowledge base, and a fact-checker fixes any wrong numbers before delivery."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card flex min-h-[520px] min-w-0 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink p-4">
            <GraphViz nodes={factcheck ? NODES : NODES.filter((n) => n.id !== "factcheck")} visits={visits} active={active} />
            <label className="flex items-center gap-2 text-xs font-bold">
              <input type="checkbox" checked={factcheck} onChange={(e) => setFactcheck(e.target.checked)} /> fact-check pass
            </label>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: 560 }}>
            {turns.length === 0 && (
              <div className="py-10 text-center">
                <div className="floaty inline-block text-6xl">🧑‍🏫</div>
                <p className="mt-3 font-extrabold">Ask anything about Fable 5.1</p>
                <p className="text-ink-3 text-sm">Pick a starter below or type your own.</p>
              </div>
            )}
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="fill-violet max-w-[85%] rounded-2xl rounded-br-sm border-2 border-ink px-4 py-2 text-sm">{t.content}</div>
                </div>
              ) : (
                <div key={i} className="pop-in max-w-[95%]">
                  <div className="mb-1 flex flex-wrap gap-2">
                    {t.intent && <span className="chip bg-amber/30">{INTENT_BADGE[t.intent] ?? t.intent}</span>}
                    {t.corrections && t.corrections.toLowerCase() !== "none" && (
                      <span className="chip bg-teal/30" title={t.corrections}>✅ fact-checker made fixes</span>
                    )}
                  </div>
                  <div className="soft-card prose-chat p-4 text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(t.content) }} />
                </div>
              ),
            )}
            {busy && <div className="text-ink-3 animate-pulse text-sm font-bold">Coach is thinking through the graph…</div>}
            <div ref={endRef} />
          </div>

          {err && <div className="fill-red mx-4 mb-2 rounded-xl p-3 text-sm font-bold">⚠️ {err}</div>}

          <form
            className="flex gap-2 border-t-2 border-ink p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(q);
            }}
          >
            <input className="field" placeholder={byok.apiKey ? "Ask the coach…" : "Add your Groq key (top-right) to chat"} value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} />
            <button className="btn fill-pink shrink-0" disabled={busy || !q.trim() || !byok.apiKey}>Send</button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-extrabold">✨ Starters</h3>
            <div className="mt-3 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="soft-card p-3 text-left text-sm font-bold hover:bg-bg-2 disabled:opacity-50" disabled={busy || !byok.apiKey} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
            {turns.length > 0 && <button className="chip mt-3" onClick={() => setTurns([])}>Clear chat</button>}
          </div>
          <div className="card p-5">
            <h3 className="font-extrabold">🕸️ How the graph works</h3>
            <ol className="text-ink-2 mt-2 list-decimal space-y-1 pl-5 text-sm">
              <li><b>router</b> classifies intent with a 20-token call.</li>
              <li><b>specialist</b> answers with one of five personas, grounded on the knowledge base.</li>
              <li><b>fact-check</b> (conditional edge) diffs the draft against verified facts.</li>
              <li><b>deliver</b> returns the final answer; node updates stream to this page as NDJSON.</li>
            </ol>
            <p className="text-ink-3 mt-3 text-xs">Your Groq key is sent per request in a header and never stored on the server.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
