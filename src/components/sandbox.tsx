"use client";

import { useMemo, useRef, useState } from "react";

const CACHE_TTL_MS = 5 * 60_000;
const clock = () => performance.now();
import { EFFORTS, MODELS, type Effort, type ModelId } from "@/lib/fable-data";
import {
  buildApiRequest,
  DEFAULT_INPUT,
  MIN_CACHEABLE,
  type ApiError,
  type DisplayMode,
  type SandboxInput,
  type ThinkingMode,
  type ToolChoice,
} from "@/lib/sandbox-request";
import { readNdjson, useByok } from "./byok";
import { GraphViz, type VizNode } from "./graph-viz";
import { Heading } from "./learn";

const NODES: VizNode[] = [
  { id: "validate", label: "validate", emoji: "🛂" },
  { id: "plan", label: "plan", emoji: "🗺️" },
  { id: "respond", label: "respond", emoji: "✍️" },
  { id: "critique", label: "critique", emoji: "🔍" },
  { id: "refine", label: "refine", emoji: "🪄" },
  { id: "account", label: "usage & cost", emoji: "🧾" },
];

const EFFORT_COLORS: Record<Effort, string> = {
  low: "var(--c-lime)",
  medium: "var(--c-teal)",
  high: "var(--c-blue)",
  xhigh: "var(--c-violet)",
  max: "var(--c-pink)",
};

interface Billing {
  input: number;
  output: number;
  thinking: number;
  cacheWrite: number;
  cacheRead: number;
  cost: number;
}

interface RunResult {
  error: ApiError | null;
  extraErrors: number;
  response: Record<string, unknown> | null;
  billing: Billing | null;
  visits: Record<string, number>;
  ms: number;
}

const DEMOS: { label: string; emoji: string; patch: Partial<SandboxInput>; note: string }[] = [
  { label: "Disable thinking", emoji: "🚫", patch: { thinking: "disabled" }, note: "thinking: {type:\"disabled\"} → 400" },
  { label: "budget_tokens", emoji: "💰", patch: { thinking: "budget" }, note: "Old extended-thinking budget → 400" },
  { label: "Prefill", emoji: "✏️", patch: { prefill: "{\"plan\": [" }, note: "Assistant prefill → 400" },
  { label: "Force a tool", emoji: "🔨", patch: { toolChoice: "any" }, note: "tool_choice any → 400" },
  { label: "temperature", emoji: "🌡️", patch: { temperature: true }, note: "Sampling params → 400" },
  { label: "Refusal, no fallback", emoji: "🛑", patch: { simulateRefusal: true, fallbacks: false }, note: "stop_reason: refusal, empty content" },
  { label: "Refusal + fallback", emoji: "🛟", patch: { simulateRefusal: true, fallbacks: true }, note: "fallbacks: \"default\" reroutes" },
  { label: "Tiny max_tokens", emoji: "✂️", patch: { maxTokens: 400, effort: "high" }, note: "Thinking eats the budget → max_tokens" },
];

const usd = (n: number) => (n < 0.01 ? `$${n.toFixed(5)}` : `$${n.toFixed(4)}`);

export function Sandbox() {
  const byok = useByok();
  const [input, setInput] = useState<SandboxInput>(DEFAULT_INPUT);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [failure, setFailure] = useState("");
  const [sweep, setSweep] = useState<{ effort: Effort; billing: Billing | null; ms: number }[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const [showJson, setShowJson] = useState(false);
  // Signature of the last prefix written to the (simulated) 5-minute cache; cleared when it expires.
  const [cachedSig, setCachedSig] = useState<string | null>(null);
  const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = <K extends keyof SandboxInput>(k: K, v: SandboxInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  const cacheSig = `${input.model}|${input.system}|${input.docTokens}`;
  const cacheWarm = input.cacheSystem && cachedSig === cacheSig;
  const requestPreview = useMemo(() => buildApiRequest(input), [input]);

  async function run(override?: Partial<SandboxInput>): Promise<RunResult | null> {
    const body: SandboxInput = { ...input, ...override, cacheWarm };
    setFailure("");
    setActive("validate");
    const visits: Record<string, number> = {};
    const out: RunResult = { error: null, extraErrors: 0, response: null, billing: null, visits, ms: 0 };
    const started = clock();
    try {
      const res = await fetch("/api/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...byok.headers() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      let critiques = 0;
      await readNdjson(res, (e) => {
        if (e.type === "error") throw new Error(String(e.message));
        if (e.type !== "node") return;
        const node = String(e.node);
        const u = e.update as Record<string, unknown>;
        visits[node] = (visits[node] ?? 0) + 1;
        if (node === "critique") critiques++;
        if (node === "validate") {
          out.error = (u.error as ApiError) ?? null;
          out.extraErrors = (u.extraErrors as number) ?? 0;
        }
        if (node === "account") {
          out.response = u.response as Record<string, unknown>;
          out.billing = u.billing as Billing;
        }
        setResult({ ...out, visits: { ...visits }, ms: clock() - started });
        setActive(predictNext(node, body, critiques, !!out.error || (body.simulateRefusal && !body.fallbacks)));
      });
      out.ms = clock() - started;
      if (!out.error && body.cacheSystem) {
        // Each hit or write refreshes the TTL, like the real cache.
        setCachedSig(`${body.model}|${body.system}|${body.docTokens}`);
        if (cacheTimer.current) clearTimeout(cacheTimer.current);
        cacheTimer.current = setTimeout(() => setCachedSig(null), CACHE_TTL_MS);
      }
      setResult({ ...out, visits: { ...visits } });
      return out;
    } catch (err) {
      setFailure(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setActive(null);
    }
  }

  async function go(patch?: Partial<SandboxInput>) {
    if (patch) setInput((p) => ({ ...DEFAULT_INPUT, prompt: p.prompt, system: p.system, docTokens: p.docTokens, ...patch }));
    setRunning(true);
    await run(patch ? { ...DEFAULT_INPUT, prompt: input.prompt, system: input.system, docTokens: input.docTokens, ...patch } : undefined);
    setRunning(false);
  }

  async function runSweep() {
    setSweeping(true);
    setRunning(true);
    setSweep([]);
    for (const effort of EFFORTS) {
      setInput((p) => ({ ...p, effort }));
      const r = await run({ effort, thinking: "omit", prefill: "", toolChoice: "none", temperature: false, simulateRefusal: false });
      if (!r) break;
      setSweep((s) => [...s, { effort, billing: r.billing, ms: r.ms }]);
    }
    setSweeping(false);
    setRunning(false);
  }

  const resp = result?.response as
    | {
        content?: { type: string; text?: string; thinking?: string }[];
        stop_reason?: string;
        stop_details?: { category?: string } | null;
        usage?: Record<string, number>;
        _simulator?: { served_by?: string };
      }
    | null;
  const thinking = resp?.content?.find((c) => c.type === "thinking");
  const text = resp?.content?.find((c) => c.type === "text")?.text;
  const needsKey = !byok.apiKey;

  return (
    <section id="sandbox" className="mx-auto max-w-7xl px-4 py-14">
      <Heading
        kicker="HANDS-ON · NO FABLE ACCESS NEEDED"
        title="The Fable 5.1 Sandbox"
        color="text-pink"
        sub="Build a real claude-fable-5-1 request, then run it through a LangGraph simulator that enforces the Fable 5.1 API contract. Text is generated by your Groq model — the rules, effort behaviour, usage and pricing follow Fable 5.1."
      />
      <div className="soft-card mt-4 flex flex-wrap items-center gap-2 border-amber bg-amber/10 p-3 text-sm">
        <span className="chip bg-amber/30">⚠️ Simulation</span>
        <span className="text-ink-2">
          Responses are <b>not</b> Fable 5.1 output, and token counts are estimates (~4 chars/token). Use it to teach the API surface and cost
          mechanics; use the real API (or <code>count_tokens</code>) for true numbers.
        </span>
      </div>

      <div className="mt-6">
        <div className="text-sm font-extrabold">⚡ One-click demos</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMOS.map((d) => (
            <button key={d.label} className="chip hover:bg-bg-2" title={d.note} disabled={running} onClick={() => go(d.patch)}>
              {d.emoji} {d.label}
            </button>
          ))}
          <button className="chip fill-violet" disabled={running || needsKey} onClick={runSweep} title="Runs the same prompt at all five effort levels">
            📈 Effort sweep (low → max)
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Request builder */}
        <div className="card space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-extrabold">model</span>
              <select className="field mt-1" value={input.model} onChange={(e) => set("model", e.target.value as ModelId)}>
                {Object.values(MODELS).map((m) => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold">max_tokens</span>
              <input className="field mt-1" type="number" min={1} max={200000} value={input.maxTokens} onChange={(e) => set("maxTokens", Number(e.target.value))} />
            </label>
          </div>

          <div>
            <span className="text-xs font-extrabold">output_config.effort</span>
            <div className="mt-1 grid grid-cols-5 gap-1.5">
              {EFFORTS.map((e) => (
                <button
                  key={e}
                  className={`rounded-xl border-2 border-ink py-2 text-xs font-extrabold transition ${input.effort === e ? "shadow-[2px_2px_0_var(--ink)]" : "opacity-70"}`}
                  style={{ background: input.effort === e ? `color-mix(in srgb, ${EFFORT_COLORS[e]} 45%, var(--card))` : "var(--card)" }}
                  onClick={() => set("effort", e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <p className="text-ink-3 mt-1 text-xs">
              Simulated as LangGraph passes: low = answer · medium = plan+answer · high/xhigh = +1 self-review · max = +2 reviews.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-extrabold">thinking</span>
              <select className="field mt-1" value={input.thinking} onChange={(e) => set("thinking", e.target.value as ThinkingMode)}>
                <option value="omit">(omitted — recommended)</option>
                <option value="adaptive">{`{type: "adaptive"}`}</option>
                <option value="disabled">{`{type: "disabled"}`}</option>
                <option value="budget">{`{type: "enabled", budget_tokens}`}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold">thinking.display</span>
              <select className="field mt-1" value={input.display} onChange={(e) => set("display", e.target.value as DisplayMode)}>
                <option value="omitted">omitted (default)</option>
                <option value="summarized">summarized</option>
                <option value="updates">updates (beta)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold">tool_choice</span>
              <select className="field mt-1" value={input.toolChoice} onChange={(e) => set("toolChoice", e.target.value as ToolChoice)}>
                <option value="none">(no tools)</option>
                <option value="auto">auto</option>
                <option value="any">any</option>
                <option value="tool">tool: run_sql</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-extrabold">assistant prefill</span>
              <input className="field mt-1 font-mono" placeholder="(none)" value={input.prefill} onChange={(e) => set("prefill", e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-extrabold">system</span>
            <textarea className="field mt-1" rows={2} value={input.system} onChange={(e) => set("system", e.target.value)} />
          </label>

          <label className="block">
            <span className="flex justify-between text-xs font-extrabold">
              <span>📎 attached reference document (simulated, in cached prefix)</span>
              <span className="font-mono">{input.docTokens.toLocaleString()} tok</span>
            </span>
            <input className="mt-2 w-full accent-[var(--c-violet)]" type="range" min={0} max={300000} step={5000} value={input.docTokens} onChange={(e) => set("docTokens", Number(e.target.value))} />
          </label>

          <label className="block">
            <span className="text-xs font-extrabold">user message</span>
            <textarea className="field mt-1" rows={4} value={input.prompt} onChange={(e) => set("prompt", e.target.value)} />
          </label>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={input.cacheSystem} onChange={(e) => set("cacheSystem", e.target.checked)} /> cache_control on prefix</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={input.fallbacks} onChange={(e) => set("fallbacks", e.target.checked)} /> fallbacks: &quot;default&quot;</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={input.temperature} onChange={(e) => set("temperature", e.target.checked)} /> temperature: 0.2</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={input.simulateRefusal} onChange={(e) => set("simulateRefusal", e.target.checked)} /> simulate safety refusal</label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn fill-pink" disabled={running} onClick={() => go()}>
              {running && !sweeping ? "Running…" : "▶ Send request"}
            </button>
            <button className="chip" disabled={running} onClick={() => { setInput(DEFAULT_INPUT); setResult(null); setFailure(""); }}>Reset</button>
            <span className={`chip ${cacheWarm ? "bg-teal/30" : ""}`}>{cacheWarm ? "🧊 cache warm (<5 min)" : "❄️ cache cold"}</span>
          </div>
          {needsKey && <p className="text-xs font-bold text-amber">Add a Groq key (top-right) to generate answers. The 400-error demos work without one.</p>}
        </div>

        {/* Output */}
        <div className="min-w-0 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold">🕸️ LangGraph execution</span>
              {result && <span className="font-mono text-xs text-ink-3">{(result.ms / 1000).toFixed(1)}s</span>}
            </div>
            <div className="mt-3">
              <GraphViz nodes={NODES} visits={result?.visits ?? {}} active={active} />
            </div>
          </div>

          <div className="card min-w-0 p-4">
            <button className="flex w-full items-center justify-between text-sm font-extrabold" onClick={() => setShowJson((s) => !s)}>
              <span>📤 Request body (what the real API would receive)</span>
              <span>{showJson ? "▲" : "▼"}</span>
            </button>
            {showJson && <pre className="code mt-3 max-h-80 !text-[11.5px]">{JSON.stringify(requestPreview, null, 2)}</pre>}
          </div>

          {failure && <div className="card fill-red p-4 text-sm font-bold">⚠️ {failure}</div>}

          {result?.error && (
            <div className="card pop-in p-4" style={{ background: "color-mix(in srgb, var(--c-red) 14%, var(--card))" }}>
              <div className="flex items-center gap-2">
                <span className="chip fill-red">HTTP {result.error.status}</span>
                <span className="font-mono text-sm font-bold">{result.error.type}</span>
              </div>
              <pre className="code mt-3 !whitespace-pre-wrap !text-[12px]">{JSON.stringify({ type: "error", error: { type: result.error.type, message: result.error.message } }, null, 2)}</pre>
              <p className="mt-3 text-sm"><b>✅ Fix:</b> {result.error.fix}</p>
              {result.extraErrors > 0 && <p className="text-ink-3 mt-1 text-xs">+{result.extraErrors} more problem(s) in this request — fix this one and resend.</p>}
            </div>
          )}

          {resp && !result?.error && (
            <div className="card pop-in min-w-0 space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${resp.stop_reason === "end_turn" ? "bg-teal/30" : resp.stop_reason === "refusal" ? "fill-red" : "bg-amber/40"}`}>
                  stop_reason: {resp.stop_reason}
                </span>
                {resp.stop_details?.category && <span className="chip">category: {resp.stop_details.category}</span>}
                {resp._simulator?.served_by && resp._simulator.served_by !== input.model && <span className="chip bg-blue/20">🛟 served by {resp._simulator.served_by}</span>}
              </div>

              {thinking && (
                <div className="rounded-xl border-2 border-dashed border-line p-3">
                  <div className="text-xs font-extrabold text-ink-3">thinking block · display: {input.display}</div>
                  <div className="text-ink-2 mt-1 whitespace-pre-wrap text-sm">
                    {thinking.thinking ? thinking.thinking : <i>&quot;&quot; — empty by default. Thinking still happened and is billed as output.</i>}
                  </div>
                </div>
              )}

              {text ? (
                <div className="prose-chat max-h-96 overflow-y-auto whitespace-pre-wrap text-sm">{text}</div>
              ) : (
                resp.stop_reason !== "refusal" && <p className="text-sm italic text-ink-3">No text block — the max_tokens budget was used up by thinking.</p>
              )}
              {resp.stop_reason === "refusal" && <p className="text-sm">Content is empty. Always check <code>stop_reason</code> before reading <code>content</code> — or enable fallbacks.</p>}
            </div>
          )}

          {result?.billing && !result.error && <BillingCard b={result.billing} model={input.model} />}
        </div>
      </div>

      {sweep.length > 0 && <SweepChart rows={sweep} running={sweeping} />}
    </section>
  );
}

function predictNext(node: string, i: SandboxInput, critiques: number, stops: boolean): string | null {
  const rounds = i.effort === "max" ? 2 : i.effort === "high" || i.effort === "xhigh" ? 1 : 0;
  switch (node) {
    case "validate":
      return stops ? "account" : i.effort === "low" ? "respond" : "plan";
    case "plan":
      return "respond";
    case "respond":
      return rounds ? "critique" : "account";
    case "critique":
      return "refine";
    case "refine":
      return critiques < rounds ? "critique" : "account";
    default:
      return null;
  }
}

function BillingCard({ b, model }: { b: Billing; model: ModelId }) {
  const rows = [
    { label: "Fresh input", tok: b.input, color: "var(--c-blue)" },
    { label: "Cache write (1.25×)", tok: b.cacheWrite, color: "var(--c-amber)" },
    { label: "Cache read", tok: b.cacheRead, color: "var(--c-teal)" },
    { label: "Thinking (billed as output)", tok: b.thinking, color: "var(--c-violet)" },
    { label: "Visible text", tok: Math.max(0, b.output - b.thinking), color: "var(--c-pink)" },
  ];
  const max = Math.max(...rows.map((r) => r.tok), 1);
  const others: ModelId[] = ["claude-fable-5-1", "claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
  const costOn = (id: ModelId) => {
    const p = MODELS[id];
    return (b.input * p.input + b.output * p.output + b.cacheWrite * p.input * 1.25 + b.cacheRead * p.cacheRead) / 1e6;
  };
  const cachePrefix = b.cacheRead + b.cacheWrite;

  return (
    <div className="card pop-in p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-extrabold">🧾 Usage & cost ({MODELS[model].name} prices)</span>
        <span className="text-3xl font-extrabold">{usd(b.cost)}</span>
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[150px_1fr_70px] items-center gap-2 text-xs sm:grid-cols-[190px_1fr_80px]">
            <span className="font-bold">{r.label}</span>
            <div className="h-3 rounded-full bg-bg-2">
              <div className="h-3 rounded-full" style={{ width: `${(r.tok / max) * 100}%`, background: r.color }} />
            </div>
            <span className="text-right font-mono">{r.tok.toLocaleString()}</span>
          </div>
        ))}
      </div>
      {cachePrefix === 0 && b.input > 0 && (
        <p className="mt-2 text-xs text-ink-3">No cache activity — caching is off or the prefix is under the {MIN_CACHEABLE}-token minimum.</p>
      )}
      <div className="mt-4 text-xs font-extrabold text-ink-3">SAME USAGE ON OTHER MODELS (illustrative — real token counts and effort behaviour differ)</div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {others.map((id) => (
          <div key={id} className={`rounded-xl border-2 p-2 text-center ${id === model ? "border-ink" : "border-line"}`}>
            <div className="text-xs font-bold">{MODELS[id].emoji} {MODELS[id].name}</div>
            <div className="font-mono text-sm font-extrabold">{usd(costOn(id))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SweepChart({ rows, running }: { rows: { effort: Effort; billing: Billing | null; ms: number }[]; running: boolean }) {
  const maxOut = Math.max(...rows.map((r) => r.billing?.output ?? 0), 1);
  return (
    <div className="card mt-8 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-2xl font-extrabold">📈 Effort sweep {running && <span className="text-sm text-ink-3">running…</span>}</h3>
        <p className="text-ink-3 text-sm">Output tokens (thinking + text) and cost per request at Fable 5.1 prices</p>
      </div>
      <div className="mt-5 flex h-56 items-end gap-3 sm:gap-6">
        {EFFORTS.map((e) => {
          const r = rows.find((x) => x.effort === e);
          const h = r?.billing ? (r.billing.output / maxOut) * 100 : 0;
          return (
            <div key={e} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
              {r?.billing && <span className="font-mono text-[11px] font-bold">{usd(r.billing.cost)}</span>}
              <div className="w-full rounded-t-xl border-2 border-ink transition-all duration-500" style={{ height: `${Math.max(h, r ? 3 : 0)}%`, background: EFFORT_COLORS[e] }} />
              <span className="text-xs font-extrabold">{e}</span>
              <span className="font-mono text-[11px] text-ink-3">{r?.billing ? `${r.billing.output.toLocaleString()} tok` : "—"}</span>
            </div>
          );
        })}
      </div>
      <p className="text-ink-2 mt-4 text-sm">
        Teaching point: effort is the first quality-vs-cost lever. Start at <b>high</b>, step down where evals hold, and judge cost per
        completed task — not per request.
      </p>
    </div>
  );
}
