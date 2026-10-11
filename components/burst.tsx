/** Small lavender burst, used when a re-score improves. Pure CSS, transform/opacity only. */
const COLORS = ["#A78BFA", "#6D4AFF", "#D9CEFF", "#FBD38D"];

export function Burst({ n = 16 }: { n?: number }) {
  return (
    <span aria-hidden className="burst">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} style={{ "--a": `${(360 / n) * i}deg`, "--d": `${64 + (i % 3) * 26}px`, "--c": COLORS[i % COLORS.length], "--t": `${(i % 4) * 45}ms` } as React.CSSProperties} />
      ))}
    </span>
  );
}
