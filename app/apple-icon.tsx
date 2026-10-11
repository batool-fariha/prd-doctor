import { ImageResponse } from "next/og";

// iOS home-screen icon. Full-bleed square: iOS applies its own rounded corners.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #B9A4FF 0%, #5B3FD6 100%)" }}>
        <svg width="128" height="128" viewBox="0 0 32 32">
          <path d="M5.5 17h5l2.8-7.2 4.4 12.4 3-8.2 1.6 3H26.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size,
  );
}
