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
    const move = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".glow, .panel, .lift") as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("pointermove", move, { passive: true });
    onScroll();
    return () => { removeEventListener("scroll", onScroll); removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
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
