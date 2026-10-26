"use client";

import { useState } from "react";
import { useByok } from "./byok";

export function KeyVault({ onClose }: { onClose: () => void }) {
  const byok = useByok();
  const [draft, setDraft] = useState("");
  const [remember, setRemember] = useState(byok.remember);
  const [show, setShow] = useState(false);

  const masked = byok.apiKey ? `${byok.apiKey.slice(0, 7)}••••••••${byok.apiKey.slice(-4)}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20" onClick={onClose}>
      <div className="card pop-in w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">🔑 Key Vault <span className="text-ink-3 text-base font-bold">BYOK</span></h2>
          <button className="text-2xl leading-none" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="text-ink-2 mt-2 text-sm">
          Bring your own <b>Groq</b> API key. It stays in your browser and is sent only as a request header to this app&apos;s
          server, which forwards it to Groq and never stores or logs it. Get one free at{" "}
          <a className="text-violet font-bold underline" href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
        </p>

        {byok.apiKey && (
          <div className="soft-card mt-4 flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="font-mono text-sm truncate">{masked}</div>
              <div className={`text-xs font-bold ${byok.status === "ok" ? "text-teal" : byok.status === "bad" ? "text-red" : "text-ink-3"}`}>
                {byok.status === "checking" ? "Checking…" : byok.statusMsg || "Saved — not verified yet"}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button className="chip" onClick={() => byok.verify()}>Test</button>
              <button className="chip text-red" onClick={byok.clear}>Remove</button>
            </div>
          </div>
        )}

        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            byok.setKey(draft, remember);
            setDraft("");
          }}
        >
          <label className="block text-sm font-bold">{byok.apiKey ? "Replace key" : "Groq API key"}</label>
          <div className="flex gap-2">
            <input
              className="field font-mono"
              type={show ? "text" : "password"}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="chip shrink-0" onClick={() => setShow((s) => !s)}>{show ? "Hide" : "Show"}</button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember on this device (otherwise cleared when the tab closes)
          </label>
          {byok.status === "bad" && !byok.apiKey && <p className="text-red text-sm font-bold">{byok.statusMsg}</p>}
          <button className="btn fill-violet w-full" disabled={!draft.trim()}>Save & verify key</button>
        </form>

        <div className="mt-5">
          <label className="block text-sm font-bold">Groq model powering the Coach & Sandbox</label>
          <select className="field mt-1" value={byok.model} onChange={(e) => byok.setModel(e.target.value)}>
            {byok.models.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <p className="text-ink-3 mt-1 text-xs">The list loads from your key&apos;s live Groq model catalogue once verified.</p>
        </div>

        <div className="soft-card mt-5 bg-bg-2 p-3 text-xs text-ink-2">
          <b>Presenter tip:</b> on a shared screen, use “Show” sparingly and leave “Remember” off so the key disappears when you close the tab.
        </div>
      </div>
    </div>
  );
}
