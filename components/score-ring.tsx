import { grade } from "@/lib/analyzer";

export function ScoreRing({ score }: { score: number }) {
  const r = 70, circ = 2 * Math.PI * r, g = grade(score);
  return (
    <div className="relative size-44 shrink-0">
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx={90} cy={90} r={r} fill="none" className="stroke-muted" strokeWidth={14} />
        <circle cx={90} cy={90} r={r} fill="none" stroke={g.color} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-5xl font-semibold tabular-nums">{score}</div>
          <div className="text-xs text-muted-foreground">out of 100</div>
        </div>
      </div>
    </div>
  );
}
