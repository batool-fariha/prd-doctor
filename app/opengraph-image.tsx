import { ImageResponse } from "next/og";

export const alt = "PRD Doctor: score your product requirements doc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #FBFAFE 0%, #ECE6FF 55%, #D9CEFF 100%)", color: "#17132B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34 }}>
          <svg width="56" height="56" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#6D4AFF" /><path d="M5.5 17h5l2.8-7.2 4.4 12.4 3-8.2 1.6 3H26.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          PRD Doctor
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 92, lineHeight: 1.04, letterSpacing: -2, maxWidth: 900 }}>Is your PRD ready for review?</div>
          <div style={{ display: "flex", fontSize: 32, opacity: 0.7, maxWidth: 860 }}>Score it out of 100 across 12 categories. Every fix quotes your own words.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>prd-doctor.vercel.app</div>
      </div>
    ),
    size,
  );
}
