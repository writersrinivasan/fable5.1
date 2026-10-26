"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const KEY_RE = /^gsk_[A-Za-z0-9]{20,}$/;
const LS_KEY = "fable-studio.groq-key";
const LS_MODEL = "fable-studio.groq-model";

interface Byok {
  apiKey: string;
  model: string;
  remember: boolean;
  models: string[];
  status: "none" | "unchecked" | "checking" | "ok" | "bad";
  statusMsg: string;
  setKey: (k: string, remember: boolean) => void;
  setModel: (m: string) => void;
  clear: () => void;
  verify: () => Promise<void>;
  headers: () => Record<string, string>;
}

const Ctx = createContext<Byok | null>(null);

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k) ?? sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string, persist: boolean) => {
    try {
      (persist ? localStorage : sessionStorage).setItem(k, v);
      (persist ? sessionStorage : localStorage).removeItem(k);
    } catch {}
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    } catch {}
  },
};

export function ByokProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModelState] = useState(DEFAULT_MODEL);
  const [remember, setRemember] = useState(false);
  const [models, setModels] = useState<string[]>([DEFAULT_MODEL]);
  const [status, setStatus] = useState<Byok["status"]>("none");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    const k = store.get(LS_KEY);
    const m = store.get(LS_MODEL);
    // Restoring from browser storage after hydration is the intended one-time sync.
    if (k && KEY_RE.test(k)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setApiKey(k);
      setStatus("unchecked");
      try {
        setRemember(!!localStorage.getItem(LS_KEY));
      } catch {}
    }
    if (m) setModelState(m);
  }, []);

  const headers = useCallback(
    (): Record<string, string> => (apiKey ? { "x-groq-key": apiKey, "x-groq-model": model } : { "x-groq-model": model }),
    [apiKey, model],
  );

  const verifyWith = useCallback(async (k: string) => {
    setStatus("checking");
    try {
      const res = await fetch("/api/groq-models", { headers: { "x-groq-key": k } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Key check failed");
      const ids: string[] = data.models.map((m: { id: string }) => m.id);
      setModels(ids.length ? ids : [DEFAULT_MODEL]);
      setModelState((cur) => (ids.includes(cur) ? cur : ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0] ?? cur));
      setStatus("ok");
      setStatusMsg(`Key works · ${ids.length} models available`);
    } catch (e) {
      setStatus("bad");
      setStatusMsg(e instanceof Error ? e.message : "Key check failed");
    }
  }, []);

  const value: Byok = {
    apiKey,
    model,
    remember,
    models,
    status,
    statusMsg,
    headers,
    setKey: (k, persist) => {
      const key = k.trim();
      if (!KEY_RE.test(key)) {
        setStatus("bad");
        setStatusMsg("That doesn't look like a Groq key (gsk_…).");
        return;
      }
      setApiKey(key);
      setRemember(persist);
      store.set(LS_KEY, key, persist);
      void verifyWith(key);
    },
    setModel: (m) => {
      setModelState(m);
      store.set(LS_MODEL, m, true);
    },
    clear: () => {
      setApiKey("");
      setStatus("none");
      setStatusMsg("");
      setModels([DEFAULT_MODEL]);
      store.del(LS_KEY);
    },
    verify: () => verifyWith(apiKey),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useByok() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useByok must be used inside ByokProvider");
  return v;
}

// Reads an NDJSON response line by line.
export async function readNdjson(res: Response, onEvent: (e: Record<string, unknown>) => void) {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) onEvent(JSON.parse(line));
    }
  }
}
