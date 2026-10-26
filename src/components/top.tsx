"use client";

import { useEffect, useState } from "react";
import { AGENDA } from "@/lib/fable-data";
import { useByok } from "./byok";
import { KeyVault } from "./key-vault";

const LINKS = [
  { id: "agenda", label: "Agenda" },
  { id: "capabilities", label: "Capabilities" },
  { id: "models", label: "Models" },
  { id: "sandbox", label: "Sandbox" },
  { id: "tokens", label: "Token Lab" },
  { id: "usecases", label: "Use cases" },
  { id: "coach", label: "AI Coach" },
  { id: "quiz", label: "Quiz" },
];

export function TopBar() {
  const byok = useByok();
  const [open, setOpen] = useState(false);
  const dot = byok.status === "ok" ? "bg-teal" : byok.status === "bad" ? "bg-red" : byok.apiKey ? "bg-amber" : "bg-ink-3";

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-ink bg-bg/90 backdrop-blur">
        <div className="rainbow-bar h-1.5" />
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <a href="#top" className="flex shrink-0 items-center gap-2 text-lg font-extrabold">
            <span className="text-2xl">🐉</span>
            <span className="hidden sm:inline">Fable 5.1 <span className="rainbow-text">Studio</span></span>
          </a>
          <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto text-sm font-bold [scrollbar-width:none]">
            {LINKS.map((l) => (
              <a key={l.id} href={`#${l.id}`} className="shrink-0 rounded-full px-3 py-1 hover:bg-bg-2">
                {l.label}
              </a>
            ))}
          </nav>
          <button className="chip shrink-0" onClick={() => setOpen(true)}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
            {byok.apiKey ? "Groq key" : "Add key"}
          </button>
        </div>
      </header>
      {open && <KeyVault onClose={() => setOpen(false)} />}
    </>
  );
}

export function Hero() {
  return (
    <section id="top" className="mx-auto grid grid-cols-1 max-w-7xl items-center gap-10 px-4 pb-10 pt-12 lg:grid-cols-[1.2fr_1fr]">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="chip bg-amber/20">⏱️ 60-minute masterclass</span>
          <span className="chip bg-pink/20">🧪 Hands-on sandbox</span>
          <span className="chip bg-teal/20">🕸️ LangGraph · BYOK Groq</span>
        </div>
        <h1 className="mt-5 text-[2.6rem] font-extrabold break-words leading-[0.95] tracking-tight sm:text-7xl">
          Meet <span className="rainbow-text">Claude Fable 5.1</span>
          <br />
          the hard-mode model.
        </h1>
        <p className="text-ink-2 mt-5 max-w-xl text-lg">
          Anthropic&apos;s most capable widely released model — 1M context, 128K output, always-on thinking and five effort
          levels. Learn when it pays for itself, how to keep the token bill sane, and try its API contract live in a sandbox
          that needs no Fable access.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="#sandbox" className="btn fill-pink">Open the sandbox →</a>
          <a href="#agenda" className="btn bg-card">See the run-of-show</a>
        </div>
      </div>
      <div className="relative min-w-0">
        <div className="card rotate-1 p-5">
          <div className="flex items-center justify-between">
            <span className="chip">claude-fable-5-1</span>
            <span className="text-3xl floaty">🐉</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              ["1M", "context window", "fill-violet"],
              ["128K", "max output", "fill-pink"],
              ["$10 / $50", "per 1M in / out", "fill-orange"],
              ["0.025×", "cache-read price", "fill-teal"],
            ].map(([big, small, bg]) => (
              <div key={small} className={`${bg} rounded-2xl border-2 border-ink p-4 text-white`}>
                <div className="text-2xl font-extrabold sm:text-3xl">{big}</div>
                <div className="text-xs font-bold opacity-90">{small}</div>
              </div>
            ))}
          </div>
          <div className="code mt-4 text-xs">{`output_config: { effort: "high" }  // low → max\n// thinking: always on — don't configure it`}</div>
        </div>
      </div>
    </section>
  );
}

export function Agenda() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => Math.min(e + 1, 3600)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const minute = elapsed / 60;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <section id="agenda" className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-bold text-pink">RUN-OF-SHOW</p>
          <h2 className="section-title">Sixty power-packed minutes</h2>
        </div>
        <div className="card flex items-center gap-3 px-4 py-2">
          <span className="font-mono text-3xl font-extrabold tabular-nums">{mm}:{ss}</span>
          <button className="btn bg-lime px-3 py-1.5 text-ink" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : elapsed ? "Resume" : "Start"}</button>
          <button className="chip" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</button>
        </div>
      </div>

      <div className="mt-6 h-4 overflow-hidden rounded-full border-2 border-ink bg-card">
        <div className="rainbow-bar h-full transition-all" style={{ width: `${(elapsed / 3600) * 100}%` }} />
      </div>

      <ol className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {AGENDA.map((a) => {
          const now = running || elapsed > 0 ? minute >= a.start && minute < a.end : false;
          const done = minute >= a.end;
          return (
            <li key={a.title}>
              <a
                href={`#${a.section === "hero" ? "top" : a.section}`}
                className={`soft-card block h-full p-4 transition ${now ? "!border-2 !border-pink ring-4 ring-pink/20" : ""} ${done ? "opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-ink-3">
                  <span>{a.start}–{a.end} min</span>
                  {now && <span className="chip fill-pink">NOW</span>}
                  {done && <span>✓</span>}
                </div>
                <div className="mt-1 text-lg font-extrabold">{a.emoji} {a.title}</div>
                <p className="text-ink-2 mt-1 text-sm">{a.what}</p>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
