"use client";
import { CATEGORY_ORDER } from "@/lib/analyzer";

interface Props {
  scores: number[];
  /** index of the highlighted category */
  active?: number | null;
  onActive?: (i: number | null) => void;
  onSelect?: (i: number) => void;
}

export function RadarChart({ scores, active = null, onActive, onSelect }: Props) {
  const size = 400, c = size / 2, R = 120, n = scores.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const ring = (l: number) => scores.map((_, i) => pt(i, (R * l) / 100).join(",")).join(" ");
  const interactive = Boolean(onActive);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[400px]" role="img" aria-label="Radar chart of the 12 category scores">
        {[25, 50, 75, 100].map((l) => (
          <polygon key={l} points={ring(l)} fill="none" stroke="var(--grid)" strokeWidth={1} />
        ))}
        {scores.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke={active === i ? "#6D4AFF" : "var(--grid)"} strokeWidth={active === i ? 2 : 1} style={{ transition: "stroke 200ms" }} />;
        })}
        <g className="radar-draw">
          <polygon points={scores.map((s, i) => pt(i, (R * s) / 100).join(",")).join(" ")} fill="rgba(124,92,255,0.16)" stroke="#6D4AFF" strokeWidth={1.75} strokeLinejoin="round" />
          {scores.map((s, i) => {
            const [x, y] = pt(i, (R * s) / 100);
            const [lx, ly] = pt(i, R + 26);
            const on = active === i;
            return (
              <g key={i}>
                {on && <circle cx={x} cy={y} r={11} fill="rgba(109,74,255,0.18)" />}
                <circle cx={x} cy={y} r={on ? 5 : 3} fill="#6D4AFF" stroke="var(--surface)" strokeWidth={1.5} style={{ transition: "r 200ms" }} />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={on ? "var(--foreground)" : "var(--ink-2)"} fontSize={11} fontWeight={on ? 700 : 500}>
                  {CATEGORY_ORDER[i].label.split(" ")[0]}
                </text>
                {interactive && (
                  <circle
                    cx={(x + lx) / 2} cy={(y + ly) / 2} r={22} fill="transparent"
                    style={{ cursor: onSelect ? "pointer" : "default" }}
                    onMouseEnter={() => onActive?.(i)} onMouseLeave={() => onActive?.(null)}
                    onClick={() => onSelect?.(i)}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {interactive && (
        <figcaption className="mt-1 h-6 text-center font-mono text-xs text-ink3" aria-live="polite">
          {active !== null ? `${CATEGORY_ORDER[active].label} · ${scores[active]}` : "Hover a point to inspect"}
        </figcaption>
      )}
    </figure>
  );
}
