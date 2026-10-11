"use client";
import { useEffect, useRef, useState } from "react";
import { CATEGORY_ORDER } from "@/lib/analyzer";
import { Check } from "./icons";

const TOTAL = CATEGORY_ORDER.length;

/** A short "reading your PRD" sequence between clicking Analyze and the result. Click or Esc to skip. */
export function Diagnosis({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; });
  const go = () => { if (!done.current) { done.current = true; finish.current(); } };

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { go(); return; }
    const tick = setInterval(() => setN((v) => v + 1), 120);
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") go(); };
    addEventListener("keydown", esc);
    return () => { clearInterval(tick); removeEventListener("keydown", esc); };
  }, []);

  useEffect(() => { if (n >= TOTAL + 4) go(); }, [n]);

  return (
    <div role="status" aria-live="polite" onClick={go} className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-background/90 p-6 backdrop-blur-md">
      <div className="diag-in w-full max-w-md text-center">
        <svg viewBox="0 0 320 90" className="mx-auto h-20 w-72" aria-hidden>
          <defs><linearGradient id="pl" x1="0" x2="1"><stop offset="0" stopColor="#B9A4FF" /><stop offset="1" stopColor="#6D4AFF" /></linearGradient></defs>
          <path className="pulse-draw" pathLength={1} d="M0 46h92l14-30 24 64 22-48 12 14h156" fill="none" stroke="url(#pl)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="serif mt-2 text-4xl">Reading your PRD</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{Math.min(n, TOTAL)} of {TOTAL} categories</p>
        <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1.5 text-left text-sm">
          {CATEGORY_ORDER.map((c, i) => (
            <li key={c.id} className={`flex items-center gap-2 transition-opacity duration-300 ${i < n ? "opacity-100" : "opacity-30"}`}>
              <span className={`grid size-4 shrink-0 place-items-center rounded-full ${i < n ? "bg-[#EDF3EC] text-[#346538]" : "border"}`}>{i < n && <Check className="size-3" />}</span>
              <span className="truncate">{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-muted-foreground">Click anywhere to skip</p>
      </div>
    </div>
  );
}
