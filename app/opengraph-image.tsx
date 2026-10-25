import { ImageResponse } from "next/og";

export const alt = "PRD Doctor: score your product requirements doc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Illustrative sample only: not computed from any document. */
const SAMPLE = [88, 62, 70, 55, 90, 74, 66, 30, 40, 58, 72, 24];

function Radar() {
  const S = 360, c = S / 2, R = 140, n = SAMPLE.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
  };
  const ring = (l: number) => SAMPLE.map((_, i) => pt(i, (R * l) / 100).join(",")).join(" ");
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      {[25, 50, 75, 100].map((l) => <polygon key={l} points={ring(l)} fill="none" stroke="#CFC4EE" strokeWidth={1.5} />)}
      {SAMPLE.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#CFC4EE" strokeWidth={1.5} />; })}
      <polygon points={SAMPLE.map((v, i) => pt(i, (R * v) / 100).join(",")).join(" ")} fill="rgba(124,92,255,0.25)" stroke="#6D4AFF" strokeWidth={4} strokeLinejoin="round" />
      {SAMPLE.map((v, i) => { const [x, y] = pt(i, (R * v) / 100); return <circle key={i} cx={x} cy={y} r={6} fill="#6D4AFF" stroke="#fff" strokeWidth={2.5} />; })}
    </svg>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg, #FBFAFE 0%, #ECE6FF 55%, #D9CEFF 100%)", color: "#17132B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34 }}>
          <svg width="56" height="56" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#6D4AFF" /><path d="M5.5 17h5l2.8-7.2 4.4 12.4 3-8.2 1.6 3H26.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          PRD Doctor
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 650 }}>
            <div style={{ display: "flex", fontSize: 80, lineHeight: 1.04, letterSpacing: -2 }}>Is your PRD ready for review?</div>
            <div style={{ display: "flex", fontSize: 30, opacity: 0.7 }}>Score it out of 100 across 12 categories. Every fix quotes your own words.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <Radar />
            <div style={{ display: "flex", fontSize: 20, opacity: 0.55 }}>Sample reading</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, opacity: 0.7 }}>
          <div style={{ display: "flex" }}>prd-doctor.vercel.app</div>
          <div style={{ display: "flex" }}>Free · no account · runs in your browser</div>
        </div>
      </div>
    ),
    size,
  );
}
