# 🐉 Fable 5.1 Studio

A colorful, hands-on companion app for a one-hour masterclass on **Claude Fable 5.1**, built with Next.js 16 + LangGraph. The AI features run on **your own Groq API key (BYOK)**.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Click **Add key** (top-right) and paste a Groq key (`gsk_…`, free at https://console.groq.com/keys).
The key stays in your browser (session-only unless you tick "Remember") and is sent per request in an `x-groq-key` header. The server never stores or logs it.

## What's inside

| Section | What it does |
|---|---|
| Agenda | 60-minute run-of-show with a presenter timer that highlights the current segment |
| Capabilities | Spec sheet, six capability gains, breaking changes, new API knobs, TypeScript snippets |
| Models | Fable 5.1 vs Fable 5 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5, plus a live "should we use Fable?" wizard |
| **Sandbox** | Builds a real `claude-fable-5-1` request body and runs it through a LangGraph **simulator** that enforces the Fable 5.1 API contract (400s for disabled thinking, `budget_tokens`, prefill, forced `tool_choice`, `temperature`), effort-scaled reasoning passes, thinking display modes, refusals + fallbacks, `max_tokens` truncation, caching, and cost |
| Token Lab | Monthly cost calculator (caching, effort, Batch API) + 10 optimization tips |
| Use cases | Eight industry scenarios, including two where a smaller model is the right call |
| AI Coach | LangGraph agent: router → specialist persona → fact-checker, grounded on a verified knowledge base |
| Quiz | Eight-question lightning round |

## Architecture

- `src/lib/fable-data.ts`: all session content and the `KNOWLEDGE_BASE` that grounds the agents
- `src/lib/graphs/sandbox.ts`: simulator graph `validate → plan → respond → critique ⇄ refine → account`
- `src/lib/graphs/coach.ts`: coach graph `router → specialist → (factcheck) → deliver`
- `src/app/api/*`: route handlers that stream LangGraph node updates as NDJSON

> The sandbox's text comes from a Groq-hosted open model, **not** Fable 5.1. Token counts are ~4 chars/token estimates. Use it to teach the API surface and cost mechanics. For real numbers, use the Claude API and `messages.count_tokens`.
