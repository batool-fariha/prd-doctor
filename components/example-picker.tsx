"use client";
import { useEffect, useRef, useState } from "react";
import { EXAMPLES, type Example } from "@/lib/examples";

/** Small menu for the editor toolbar: pick a weak, average or strong example. */
export function ExamplePicker({ onPick }: { onPick: (e: Example) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("pointerdown", away);
    addEventListener("keydown", esc);
    return () => { removeEventListener("pointerdown", away); removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="chip-btn">Examples</button>
      {open && (
        <div role="menu" aria-label="Example PRDs" className="absolute right-0 z-30 mt-1 w-72 overflow-hidden rounded-xl border bg-surface shadow-lg">
          {EXAMPLES.map((e) => (
            <button key={e.id} type="button" role="menuitem" onClick={() => { setOpen(false); onPick(e); }} className="block w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-surface2">
              <span className="serif block text-lg leading-tight">{e.label}</span>
              <span className="mt-0.5 block text-xs text-ink3">{e.blurb}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
