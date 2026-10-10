import { ImageResponse } from "next/og";
import { CATEGORY_ORDER, decodePayload, grade, shareMetrics } from "@/lib/analyzer";

function headline(score: number, best: string, worst: string) {
  if (score >= 80) return "Ready for review.";
  if (score >= 60) return `Strongest: ${best.toLowerCase()}. Biggest gap: ${worst.toLowerCase()}.`;
  if (score >= 40) return `Best: ${best.toLowerCase()}. Start with ${worst.toLowerCase()}.`;
  return `An early draft. Start with ${worst.toLowerCase()}.`;
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const p = decodePayload(searchParams.get("s"));
  if (!p) return new Response("Bad payload", { status: 400 });
  const g = grade(p.o);
  const metrics = shareMetrics(p);
  const rows = CATEGORY_ORDER.map((m, i) => ({ label: m.label, score: p.c[i] }));
  const best = [...rows].sort((a, b) => b.score - a.score)[0].label;
  const worst = [...rows].sort((a, b) => a.score - b.score)[0].label;
  const id = (searchParams.get("id") ?? "").match(/^[a-z0-9]{4,16}$/)?.[0];
  const link = origin.replace(/^https?:\/\//, "") + (id ? `/result/${id}` : "");

  const S = 380, c = S / 2, R = 150, n = rows.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const ring = (l: number) => rows.map((_, i) => pt(i, (R * l) / 100).join(",")).join(" ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "44px 64px 48px", background: "linear-gradient(135deg, #FBFAFE 0%, #ECE6FF 55%, #D9CEFF 100%)", color: "#17132B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28 }}>
          <svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#6D4AFF" /><path d="M5.5 17h5l2.8-7.2 4.4 12.4 3-8.2 1.6 3H26.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          PRD Doctor
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", fontSize: 28, opacity: 0.7 }}>My PRD scored</div>
              <div style={{ display: "flex", fontSize: 20, padding: "4px 14px", borderRadius: 999, background: g.bg, color: g.color }}>{g.label}</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 190, fontWeight: 700, lineHeight: 1, color: "#4B2FC9" }}>{p.o}</div>
              <div style={{ display: "flex", fontSize: 40, opacity: 0.6, paddingBottom: 22 }}>/100</div>
            </div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 34, lineHeight: 1.2, letterSpacing: -0.5 }}>{headline(p.o, best, worst)}</div>
          </div>
          <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
            {[25, 50, 75, 100].map((l) => <polygon key={l} points={ring(l)} fill="none" stroke="#CFC4EE" strokeWidth={1.5} />)}
            {rows.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#CFC4EE" strokeWidth={1.5} />; })}
            <polygon points={rows.map((r, i) => pt(i, (R * r.score) / 100).join(",")).join(" ")} fill="rgba(124,92,255,0.25)" stroke="#6D4AFF" strokeWidth={4} strokeLinejoin="round" />
            {rows.map((r, i) => { const [x, y] = pt(i, (R * r.score) / 100); return <circle key={i} cx={x} cy={y} r={6} fill="#6D4AFF" stroke="#fff" strokeWidth={2.5} />; })}
          </svg>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {metrics.map((m) => (
              <div key={m.k} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.85)", border: "1px solid #D9CEFF", borderRadius: 14, padding: "12px 20px" }}>
                <div style={{ display: "flex", fontSize: 17, opacity: 0.6 }}>{m.k}</div>
                <div style={{ display: "flex", fontSize: 24, fontWeight: 600 }}>{m.v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", fontSize: 22, opacity: 0.75 }}>{link}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
