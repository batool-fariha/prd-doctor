import { CATEGORY_ORDER } from "@/lib/analyzer";

export function RadarChart({ scores }: { scores: number[] }) {
  const size = 400, c = size / 2, R = 120, n = scores.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const ring = (l: number) => scores.map((_, i) => pt(i, (R * l) / 100).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto w-full max-w-[400px]" role="img" aria-label="Radar chart of the 12 category scores">
      {[25, 50, 75, 100].map((l) => (
        <polygon key={l} points={ring(l)} fill="none" stroke="#DDD6F0" strokeWidth={1} />
      ))}
      {scores.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#DDD6F0" />;
      })}
      <g className="radar-draw">
      <polygon points={scores.map((s, i) => pt(i, (R * s) / 100).join(",")).join(" ")} fill="rgba(124,92,255,0.16)" stroke="#6D4AFF" strokeWidth={1.75} strokeLinejoin="round" />
      {scores.map((s, i) => {
        const [x, y] = pt(i, (R * s) / 100);
        const [lx, ly] = pt(i, R + 26);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill="#6D4AFF" stroke="#fff" strokeWidth={1.5} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill="#3B3650" fontSize={11} fontWeight={500}>
              {CATEGORY_ORDER[i].label.split(" ")[0]}
            </text>
          </g>
        );
      })}
      </g>
    </svg>
  );
}
