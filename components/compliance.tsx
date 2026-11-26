"use client";
import { useMemo, useSyncExternalStore } from "react";
import { analyzeCompliance } from "@/lib/compliance";

/** Turning the check on is a per-browser preference, so teams in regulated areas only switch it on once. */
const KEY = "prd-doctor:compliance";
const listeners = new Set<() => void>();
const read = () => { try { return localStorage.getItem(KEY) === "on"; } catch { return false; } };
const write = (on: boolean) => {
  try { if (on) localStorage.setItem(KEY, "on"); else localStorage.removeItem(KEY); } catch { /* blocked storage: stays on for this view only */ }
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/**
 * Optional compliance coverage for regulated products. A separate score that never changes the 0-100 total.
 * Computed in the browser from the PRD text already stored there; nothing is sent anywhere.
 */
export function Compliance({ text }: { text: string }) {
  const on = useSyncExternalStore(subscribe, read, () => false);
  const res = useMemo(() => (on ? analyzeCompliance(text) : null), [on, text]);

  return (
    <section className="border-t pt-8 pb-14" aria-labelledby="compliance-h">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 id="compliance-h" className="eyebrow">Compliance · optional</h2>
        <button type="button" aria-pressed={on} onClick={() => write(!on)} className="btn-line no-print inline-flex h-8 items-center px-3 text-xs">
          {on ? "Turn off" : "Check compliance coverage"}
        </button>
      </div>
      {!res ? (
        <p className="max-w-2xl text-sm text-ink2">
          For health, finance and other regulated products: checks that the PRD covers data handling, an audit trail, the regulations that apply, sign-off and incident handling. It is a separate score and does not change your 0–100.
        </p>
      ) : (
        <div className="max-w-3xl">
          <p className="text-sm text-ink2">
            <span className="serif mr-2 text-3xl tabular-nums text-foreground">{res.score}</span>
            out of 100 for compliance coverage. A separate score: your 0–100 total is unchanged. It checks that these topics are written down, not that the product is compliant.
          </p>
          <ul className="mt-6 border-t">
            {res.found.map((f) => (
              <li key={f.id} className="border-b py-4">
                <p className="text-sm"><span className="font-medium">Covered:</span> {f.label}</p>
                <blockquote className="mt-1 border-l-2 border-[#A78BFA] pl-3 text-sm italic text-ink2">“{f.quote}”</blockquote>
              </li>
            ))}
            {res.missing.map((m) => (
              <li key={m.id} className="border-b py-4">
                <p className="text-sm"><span className="font-medium">Missing:</span> {m.label}</p>
                <p className="mt-1 text-sm text-ink2">{m.add}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
