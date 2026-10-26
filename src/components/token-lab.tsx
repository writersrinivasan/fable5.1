"use client";

import { useState } from "react";
import { EFFORTS, MODELS, TOKEN_TIPS, USE_CASES, type Effort, type ModelId } from "@/lib/fable-data";
import { Heading } from "./learn";

// Illustrative output multipliers relative to "high". Real ratios depend on the workload — measure yours.
const EFFORT_MULT: Record<Effort, number> = { low: 0.45, medium: 0.7, high: 1, xhigh: 1.5, max: 2.2 };

function Slider({ label, value, min, max, step, onChange, fmt }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; fmt: (v: number) => string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-extrabold">
        <span>{label}</span>
        <span className="font-mono">{fmt(value)}</span>
      </span>
      <input className="mt-1 w-full accent-[var(--c-violet)]" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

const money = (n: number) => (n >= 1000 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2)}`);

export function TokenLab() {
  const [model, setModel] = useState<ModelId>("claude-fable-5-1");
  const [reqs, setReqs] = useState(2000);
  const [inTok, setInTok] = useState(30000);
  const [outTok, setOutTok] = useState(3000);
  const [cacheShare, setCacheShare] = useState(80);
  const [hitRate, setHitRate] = useState(90);
  const [batchShare, setBatchShare] = useState(30);
  const [effort, setEffort] = useState<Effort>("medium");

  const p = MODELS[model];
  const days = 30;
  const N = reqs * days;

  const baseline = (N * (inTok * p.input + outTok * p.output)) / 1e6;

  const cached = inTok * (cacheShare / 100);
  const fresh = inTok - cached;
  const h = hitRate / 100;
  const inputCost = (N * (fresh * p.input + cached * (h * p.cacheRead + (1 - h) * p.input * 1.25))) / 1e6;
  const outputCost = (N * outTok * EFFORT_MULT[effort] * p.output) / 1e6;
  const preBatch = inputCost + outputCost;
  const optimized = preBatch * (1 - (batchShare / 100) * 0.5);

  const steps = [
    { label: "Baseline (no cache, effort high, no batch)", value: baseline, color: "var(--c-red)" },
    { label: "+ prompt caching", value: inputCost + (N * outTok * p.output) / 1e6, color: "var(--c-amber)" },
    { label: `+ effort ${effort}`, value: preBatch, color: "var(--c-blue)" },
    { label: `+ ${batchShare}% via Batch API`, value: optimized, color: "var(--c-teal)" },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  const saved = baseline > 0 ? (1 - optimized / baseline) * 100 : 0;

  return (
    <section id="tokens" className="mx-auto max-w-7xl px-4 py-14">
      <Heading kicker="TOKEN & COST LAB" title="Make Fable 5.1 affordable" color="text-teal" sub="Free wins first (caching, batch), then tradeoffs (effort, routing). Drag the sliders with the audience." />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="card space-y-4 p-5">
          <label className="block">
            <span className="text-xs font-extrabold">Model</span>
            <select className="field mt-1" value={model} onChange={(e) => setModel(e.target.value as ModelId)}>
              {Object.values(MODELS).map((m) => (
                <option key={m.id} value={m.id}>{m.emoji} {m.name} — ${m.input}/${m.output}</option>
              ))}
            </select>
          </label>
          <Slider label="Requests per day" value={reqs} min={100} max={50000} step={100} onChange={setReqs} fmt={(v) => v.toLocaleString()} />
          <Slider label="Input tokens / request" value={inTok} min={1000} max={500000} step={1000} onChange={setInTok} fmt={(v) => v.toLocaleString()} />
          <Slider label="Output tokens / request (at effort high)" value={outTok} min={200} max={64000} step={200} onChange={setOutTok} fmt={(v) => v.toLocaleString()} />
          <Slider label="Share of input that's a stable, cacheable prefix" value={cacheShare} min={0} max={100} step={5} onChange={setCacheShare} fmt={(v) => `${v}%`} />
          <Slider label="Cache hit rate" value={hitRate} min={0} max={100} step={5} onChange={setHitRate} fmt={(v) => `${v}%`} />
          <Slider label="Traffic that can wait (Batch API)" value={batchShare} min={0} max={100} step={5} onChange={setBatchShare} fmt={(v) => `${v}%`} />
          <div>
            <span className="text-xs font-extrabold">Effort</span>
            <div className="mt-1 grid grid-cols-5 gap-1.5">
              {EFFORTS.map((e) => (
                <button key={e} className={`chip justify-center ${effort === e ? "fill-ink" : ""}`} onClick={() => setEffort(e)}>{e}</button>
              ))}
            </div>
            <p className="text-ink-3 mt-1 text-xs">Effort multipliers here are illustrative assumptions — run your own effort sweep on real traffic.</p>
          </div>
        </div>

        <div className="card flex flex-col p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-ink-3">MONTHLY ESTIMATE · {(N / 1e6).toFixed(2)}M requests</div>
              <div className="text-5xl font-extrabold">{money(optimized)}</div>
              <div className="text-ink-3 text-sm line-through">{money(baseline)}</div>
            </div>
            <div className="card fill-teal rotate-2 px-4 py-3 text-center">
              <div className="text-3xl font-extrabold">{saved.toFixed(0)}%</div>
              <div className="text-xs font-bold">saved</div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {steps.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-sm font-bold">
                  <span>{s.label}</span>
                  <span className="font-mono">{money(s.value)}</span>
                </div>
                <div className="mt-1 h-5 rounded-full border-2 border-ink bg-bg-2">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(s.value / max) * 100}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="soft-card mt-6 bg-bg-2 p-3 text-xs text-ink-2">
            Math: cached prefix hits bill at {p.cacheRead === 0.25 ? "$0.25 (0.025×)" : `$${p.cacheRead}`}/MTok, misses re-write at 1.25×. Batch = 50% off. Output
            tokens include thinking. Prices: Claude API list prices per 1M tokens.
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {TOKEN_TIPS.map((t) => (
          <div key={t.title} className="soft-card p-4">
            <div className="text-3xl">{t.emoji}</div>
            <div className="mt-1 font-extrabold">{t.title}</div>
            <p className="text-ink-2 mt-1 text-xs leading-relaxed">{t.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function UseCases() {
  return (
    <section id="usecases" className="mx-auto max-w-7xl px-4 py-14">
      <Heading kicker="INDUSTRY SCENARIOS" title="Where Fable 5.1 pays for itself" color="text-orange" sub="And two places it doesn't. Knowing when not to use it is half the skill." />
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {USE_CASES.map((u) => (
          <div key={u.industry} className="card flex flex-col p-5" style={{ background: `color-mix(in srgb, ${u.color} 10%, var(--card))` }}>
            <div className="flex items-center justify-between">
              <span className="text-4xl">{u.emoji}</span>
              <span className={`chip ${u.verdict === "fable" ? "fill-violet" : "bg-amber/40"}`}>{u.verdict === "fable" ? "🐉 Fable 5.1" : "💡 Use smaller"}</span>
            </div>
            <h3 className="mt-3 text-lg font-extrabold">{u.industry}</h3>
            <p className="mt-1 text-sm font-bold">{u.scenario}</p>
            <p className="text-ink-2 mt-2 flex-1 text-sm">{u.why}</p>
            <div className="mt-3 text-xs font-bold text-ink-3">EFFORT · <span className="font-mono text-ink">{u.effort}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}
