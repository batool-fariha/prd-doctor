"use client";
import { useEffect, useState } from "react";

export function CountUp({ value, ms = 1200, className }: { value: number; ms?: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const dur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let raf = 0, t0 = 0;
    const tick = (t: number) => {
      t0 ||= t;
      const p = dur ? Math.min(1, (t - t0) / dur) : 1;
      setN(Math.round(value * (1 - Math.pow(2, -10 * p)))); // ease-out expo
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <span className={className} aria-label={String(value)}>{n}</span>;
}
