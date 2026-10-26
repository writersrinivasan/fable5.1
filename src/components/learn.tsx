"use client";

import { useState } from "react";
import {
  BEHAVIOR_SHIFTS,
  BREAKING,
  CAPABILITIES,
  CODE_SNIPPETS,
  DECISION_QUESTIONS,
  MODELS,
  NEW_KNOBS,
  SPECS,
  type ModelId,
} from "@/lib/fable-data";

function Heading({ kicker, title, sub, color = "text-violet" }: { kicker: string; title: string; sub?: string; color?: string }) {
  return (
    <div className="max-w-3xl">
      <p className={`font-bold ${color}`}>{kicker}</p>
      <h2 className="section-title">{title}</h2>
      {sub && <p className="text-ink-2 mt-3 text-lg">{sub}</p>}
    </div>
  );
}

export { Heading };

export function Capabilities() {
  const [tab, setTab] = useState<keyof typeof CODE_SNIPPETS>("basic");
  const tabs: [keyof typeof CODE_SNIPPETS, string][] = [
    ["basic", "First call"],
    ["caching", "Prompt caching"],
    ["count", "Count tokens"],
    ["batch", "Batch (50% off)"],
    ["fallback", "Refusal fallbacks"],
  ];

  return (
    <section id="capabilities" className="mx-auto max-w-7xl px-4 py-14">
      <Heading
        kicker="WHAT IT CAN DO"
        title="Six places Fable 5.1 jumps ahead of Fable 5"
        sub="Same price and tokenizer as Fable 5. The gap is widest at higher effort levels."
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <div key={c.title} className="card p-5" style={{ background: `color-mix(in srgb, ${c.color} 12%, var(--card))` }}>
            <div className="text-4xl">{c.emoji}</div>
            <h3 className="mt-2 text-xl font-extrabold">{c.title}</h3>
            <p className="text-ink-2 mt-1 text-sm">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="card p-5">
          <h3 className="text-xl font-extrabold">📋 Spec sheet</h3>
          <dl className="mt-3 divide-y divide-line">
            {SPECS.map((s) => (
              <div key={s.label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-ink-3 font-bold">{s.label}</dt>
                <dd className="text-right font-mono font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="card min-w-0 p-5">
          <h3 className="text-xl font-extrabold">⌨️ Hands-on code (TypeScript SDK)</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {tabs.map(([k, label]) => (
              <button key={k} className={`chip ${tab === k ? "fill-ink" : ""}`} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          <pre className="code mt-3">{CODE_SNIPPETS[tab]}</pre>
        </div>
      </div>

      <h3 className="mt-14 text-3xl font-extrabold">💥 Breaking changes to demo live</h3>
      <p className="text-ink-2 mt-1">Every one of these can be triggered in the Sandbox below.</p>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BREAKING.map((b, i) => (
          <div key={b.title} className="soft-card p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink fill-red font-extrabold">{i + 1}</span>
              <h4 className="font-extrabold">{b.title}</h4>
            </div>
            <p className="text-ink-2 mt-2 text-sm">{b.body}</p>
            <pre className="code mt-3 !text-[11.5px]">{b.code}</pre>
          </div>
        ))}
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-2xl font-extrabold">🎛️ New knobs in 5.1</h3>
          <ul className="mt-3 space-y-3">
            {NEW_KNOBS.map((k) => (
              <li key={k.title} className="flex gap-3">
                <span className={`chip h-fit shrink-0 ${k.tag === "beta" ? "bg-amber/30" : "bg-teal/30"}`}>{k.tag}</span>
                <div>
                  <div className="font-extrabold">{k.title}</div>
                  <div className="text-ink-2 text-sm">{k.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h3 className="text-2xl font-extrabold">🧭 Behaviour shifts (prompt-tunable)</h3>
          <ul className="mt-3 space-y-2">
            {BEHAVIOR_SHIFTS.map((b) => (
              <li key={b} className="flex gap-2 text-sm">
                <span>👉</span>
                <span className="text-ink-2">{b}</span>
              </li>
            ))}
          </ul>
          <div className="soft-card mt-4 bg-bg-2 p-3 text-sm">
            <b>Also:</b> requires 30-day data retention (no ZDR unless expressly authorized) and isn&apos;t on Priority Tier.
          </div>
        </div>
      </div>
    </section>
  );
}

const ORDER: ModelId[] = ["claude-fable-5-1", "claude-fable-5", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];

export function Models() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const score = DECISION_QUESTIONS.reduce((s, q) => s + (q.id in answers ? (answers[q.id] ? q.yes : q.no) : 0), 0);
  const answered = Object.keys(answers).length;
  const rec =
    score >= 6
      ? { model: "claude-fable-5-1" as ModelId, effort: "high (try xhigh on the hardest routes)", why: "Hard, high-stakes, long-horizon work — exactly where Fable 5.1 earns its price." }
      : score >= 2
        ? { model: "claude-fable-5-1" as ModelId, effort: "low or medium — and A/B it against Opus 5.5", why: "Borderline. Fable 5.1 at low effort is often competitive with Opus/Sonnet on cost per task." }
        : score >= -2
          ? { model: "claude-opus-5-5" as ModelId, effort: "medium (its default)", why: "Solid all-rounder at $4/$20. Escalate the hard tail to Fable." }
          : score >= -5
            ? { model: "claude-sonnet-5-5" as ModelId, effort: "medium for agents, low for chat", why: "Fast and capable for everyday agentic and chat traffic." }
            : { model: "claude-haiku-5-5" as ModelId, effort: "low", why: "High volume, latency-sensitive, simple — Haiku 5.5 at $0.10/$0.50." };
  const m = MODELS[rec.model];

  return (
    <section id="models" className="mx-auto max-w-7xl px-4 py-14">
      <Heading kicker="WHEN TO USE IT" title="Fable 5.1 vs the rest of the family" color="text-blue" sub="Prices per million tokens on the Claude API. Fable 5.1 is the specialist, not the default." />

      <div className="card mt-8 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              {["Model", "Input", "Output", "Cache read", "Context / Output", "Default effort", "Best for"].map((h) => (
                <th key={h} className="px-4 py-3 font-extrabold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ORDER.map((id) => {
              const x = MODELS[id];
              return (
                <tr key={id} className={`border-b border-line ${id === "claude-fable-5-1" ? "bg-violet/10" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="font-extrabold">{x.emoji} {x.name}</div>
                    <div className="font-mono text-xs text-ink-3">{x.id}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold">${x.input}</td>
                  <td className="px-4 py-3 font-mono font-bold">${x.output}</td>
                  <td className="px-4 py-3 font-mono font-bold">${x.cacheRead}</td>
                  <td className="px-4 py-3 font-mono">{x.context} / {x.maxOutput}</td>
                  <td className="px-4 py-3 font-mono">{x.defaultEffort}</td>
                  <td className="text-ink-2 px-4 py-3">{x.tagline}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-ink-3">Haiku 5.5 prices apply to prompts up to 100K tokens ($0.50/$2.50 beyond). Fable 5 cache read shown at the standard 0.1×.</p>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5">
          <h3 className="text-2xl font-extrabold">🧩 Should this workload use Fable 5.1?</h3>
          <p className="text-ink-2 text-sm">Answer with the audience — the recommendation updates live.</p>
          <ul className="mt-4 space-y-3">
            {DECISION_QUESTIONS.map((q) => (
              <li key={q.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-bold">{q.q}</span>
                <div className="flex shrink-0 gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      className={`chip ${answers[q.id] === v ? (v ? "bg-lime text-ink" : "fill-red") : ""}`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    >
                      {v ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <button className="chip mt-4" onClick={() => setAnswers({})}>Reset</button>
        </div>
        <div className="card flex flex-col justify-center p-6" style={{ background: `color-mix(in srgb, ${m.color} 22%, var(--card))` }}>
          {answered === 0 ? (
            <div className="text-center">
              <div className="text-6xl">🤔</div>
              <p className="mt-3 text-lg font-extrabold">Answer a question to get a recommendation</p>
            </div>
          ) : (
            <div className="pop-in" key={rec.model + rec.effort}>
              <div className="text-sm font-bold text-ink-3">RECOMMENDATION · score {score > 0 ? "+" : ""}{score}</div>
              <div className="mt-1 text-4xl font-extrabold">{m.emoji} {m.name}</div>
              <div className="mt-1 font-mono text-sm">{m.id}</div>
              <div className="mt-4 rounded-xl border-2 border-ink bg-card p-3">
                <div className="text-xs font-bold text-ink-3">EFFORT</div>
                <div className="font-extrabold">{rec.effort}</div>
              </div>
              <p className="mt-3">{rec.why}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
