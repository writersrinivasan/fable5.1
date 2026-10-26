"use client";

export interface VizNode {
  id: string;
  label: string;
  emoji: string;
}

// A row of pill-shaped nodes that light up as LangGraph streams node updates.
export function GraphViz({
  nodes,
  visits,
  active,
}: {
  nodes: VizNode[];
  visits: Record<string, number>;
  active: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {nodes.map((n, i) => {
        const count = visits[n.id] ?? 0;
        const isActive = active === n.id;
        return (
          <div key={n.id} className="flex items-center gap-1.5">
            <div
              className={`relative flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-extrabold transition ${
                isActive
                  ? "node-active fill-pink border-ink"
                  : count
                    ? "fill-teal border-ink"
                    : "border-line text-ink-3 bg-card"
              }`}
            >
              <span>{n.emoji}</span>
              <span>{n.label}</span>
              {count > 1 && <span className="rounded-full bg-white/25 px-1.5">×{count}</span>}
            </div>
            {i < nodes.length - 1 && <span className="text-ink-3 font-bold">→</span>}
          </div>
        );
      })}
    </div>
  );
}
