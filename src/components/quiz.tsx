"use client";

import { useState } from "react";
import { QUIZ } from "@/lib/fable-data";
import { Heading } from "./learn";

const OPTION_COLORS = ["var(--c-violet)", "var(--c-pink)", "var(--c-blue)", "var(--c-orange)"];

export function Quiz() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const done = idx >= QUIZ.length;
  const item = QUIZ[idx];

  return (
    <section id="quiz" className="mx-auto max-w-4xl px-4 py-14">
      <Heading kicker="LIGHTNING ROUND" title="Fable 5.1 Quiz 🏆" color="text-amber" />
      <div className="card mt-8 p-6">
        {done ? (
          <div className="pop-in py-8 text-center">
            <div className="text-7xl">{score === QUIZ.length ? "🏆" : score >= QUIZ.length * 0.6 ? "🎉" : "📚"}</div>
            <div className="mt-3 text-4xl font-extrabold">{score} / {QUIZ.length}</div>
            <p className="text-ink-2 mt-2">{score === QUIZ.length ? "Flawless. You could teach this session." : "Revisit the Capabilities and Token Lab sections, then try again."}</p>
            <button className="btn fill-violet mt-5" onClick={() => { setIdx(0); setScore(0); setPicked(null); }}>Play again</button>
          </div>
        ) : (
          <div key={idx} className="pop-in">
            <div className="flex items-center justify-between text-sm font-bold text-ink-3">
              <span>Question {idx + 1} of {QUIZ.length}</span>
              <span>Score: {score}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-bg-2">
              <div className="rainbow-bar h-2 rounded-full transition-all" style={{ width: `${(idx / QUIZ.length) * 100}%` }} />
            </div>
            <h3 className="mt-5 text-2xl font-extrabold">{item.q}</h3>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {item.options.map((o, i) => {
                const reveal = picked !== null;
                const correct = i === item.answer;
                const bg = !reveal
                  ? `color-mix(in srgb, ${OPTION_COLORS[i]} 14%, var(--card))`
                  : correct
                    ? "color-mix(in srgb, var(--c-lime) 40%, var(--card))"
                    : i === picked
                      ? "color-mix(in srgb, var(--c-red) 30%, var(--card))"
                      : "var(--card)";
                return (
                  <button
                    key={o}
                    disabled={reveal}
                    onClick={() => {
                      setPicked(i);
                      if (correct) setScore((s) => s + 1);
                    }}
                    className="rounded-2xl border-2 border-ink p-4 text-left font-bold transition hover:-translate-y-0.5 disabled:hover:translate-y-0"
                    style={{ background: bg, opacity: reveal && !correct && i !== picked ? 0.55 : 1 }}
                  >
                    <span className="mr-2 font-mono">{"ABCD"[i]}.</span>
                    {o} {reveal && correct && "✅"} {reveal && i === picked && !correct && "❌"}
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="pop-in mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-ink-2 text-sm"><b>{picked === item.answer ? "Correct!" : "Not quite."}</b> {item.why}</p>
                <button className="btn fill-pink shrink-0" onClick={() => { setIdx((n) => n + 1); setPicked(null); }}>
                  {idx + 1 === QUIZ.length ? "See score" : "Next →"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
