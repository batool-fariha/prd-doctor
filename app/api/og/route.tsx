import { ImageResponse } from "next/og";
import { decodePayload, grade, shareMetrics } from "@/lib/analyzer";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const p = decodePayload(searchParams.get("s"));
  if (!p) return new Response("Bad payload", { status: 400 });
  const g = grade(p.o);
  const metrics = shareMetrics(p);
  const id = (searchParams.get("id") ?? "").match(/^[a-z0-9]{4,16}$/)?.[0];
  const link = origin.replace(/^https?:\/\//, "") + (id ? `/result/${id}` : "");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "linear-gradient(135deg, #FBFAFE 0%, #ECE6FF 55%, #D9CEFF 100%)", color: "#17132B", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 32, opacity: 0.8, borderBottom: "1px solid #D9CEFF", paddingBottom: 24 }}>PRD Doctor</div>
        <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 220, fontWeight: 600, lineHeight: 1, color: "#4B2FC9" }}>{p.o}</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 24, padding: "6px 16px", borderRadius: 999, background: g.bg, color: g.color, alignSelf: "flex-start" }}>{g.label}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
            {metrics.map((m) => (
              <div key={m.k} style={{ display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.8)", border: "1px solid #D9CEFF", borderRadius: 12, padding: "18px 26px" }}>
                <div style={{ display: "flex", fontSize: 22, opacity: 0.6 }}>{m.k}</div>
                <div style={{ display: "flex", fontSize: 34, fontWeight: 600 }}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.7 }}>Score your PRD → {link}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
