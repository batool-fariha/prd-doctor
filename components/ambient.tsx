"use client";
import { useEffect, useRef } from "react";

/** Fixed lavender glow that drifts with scroll, plus a thin reading-progress line. No layout work: transform/opacity only. */
export function Ambient() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - innerHeight;
        const p = max > 0 ? scrollY / max : 0;
        root.current?.style.setProperty("--p", String(p));
        root.current?.style.setProperty("--y", `${scrollY}`);
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div ref={root} aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="grain" />
      <div className="progress" />
    </div>
  );
}
