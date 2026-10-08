import { CATEGORY_ORDER } from "@/lib/analyzer";

export function RadarChart({ scores }: { scores: number[] }) {
  const size = 360, c = size / 2, R = 110, n = scores.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const poly = scores.map((s, i) => pt(i, (R * s) / 100).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto" role="img" aria-label="Radar chart of category scores">
      {[25, 50, 75, 100].map((l) => (
        <polygon key={l} points={scores.map((_, i) => pt(i, (R * l) / 100).join(",")).join(" ")} fill="none" className="stroke-border" strokeWidth={1} />
      ))}
      {scores.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} className="stroke-border" />;
      })}
      <polygon points={poly} className="fill-primary/20 stroke-primary" strokeWidth={2} />
      {scores.map((s, i) => {
        const [x, y] = pt(i, (R * s) / 100);
        const [lx, ly] = pt(i, R + 22);
        const label = CATEGORY_ORDER[i].label.split(" ")[0];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} className="fill-primary" />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground" fontSize={10}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
