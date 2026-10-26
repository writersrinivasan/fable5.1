import { ByokProvider } from "@/components/byok";
import { Coach } from "@/components/coach";
import { Capabilities, Models } from "@/components/learn";
import { Quiz } from "@/components/quiz";
import { Sandbox } from "@/components/sandbox";
import { TokenLab, UseCases } from "@/components/token-lab";
import { Agenda, Hero, TopBar } from "@/components/top";

export default function Home() {
  return (
    <ByokProvider>
      <TopBar />
      <main className="flex-1">
        <Hero />
        <Agenda />
        <Capabilities />
        <Models />
        <Sandbox />
        <TokenLab />
        <UseCases />
        <Coach />
        <Quiz />
      </main>
      <footer className="border-t-2 border-ink">
        <div className="rainbow-bar h-1.5" />
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-3">
          <span>🐉 Fable 5.1 Studio · Built with Next.js + LangGraph · AI by your own Groq key</span>
          <span>Facts from the Claude API docs (Oct 2026). Sandbox output is simulated.</span>
        </div>
      </footer>
    </ByokProvider>
  );
}
