"use client";
import { useState, useSyncExternalStore } from "react";
import { CATEGORY_ORDER } from "@/lib/analyzer";
import { track } from "@/lib/analytics";
import { SITE } from "@/lib/site";
import { readFeedback, setFeedback, subscribe } from "@/lib/storage";
import { Check, X } from "./icons";

type Direction = "high" | "low" | "unsure";

/**
 * "Does this score feel right?" Sends only the score, a rating and category names to analytics. Never document text.
 * It exists to find where the scoring disagrees with real reviewers.
 */
export function Feedback({ id, score }: { id: string; score: number }) {
  const stored = useSyncExternalStore(subscribe, () => readFeedback(id), () => undefined);
  const [detail, setDetail] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [dir, setDir] = useState<Direction | null>(null);

  if (stored === undefined) return null; // not on the client yet
  if (stored) {
    return (
      <div className="no-print rise mb-10 rounded-xl border bg-surface/70 px-5 py-4 text-sm text-ink2" role="status">
        Thanks, that helps tune the scoring.{" "}
        <a href={`${SITE.repo}/issues/new`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">Report a problem</a>
      </div>
    );
  }

  function send(rating: "right" | "off") {
    track("score_feedback", { rating, score, direction: dir ?? "none", categories: picked.join(",") });
    setFeedback(id, rating);
  }

  const toggle = (c: string) => setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const chip = (on: boolean) => `chip-pick rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-[#A78BFA] bg-softlav text-violet2" : "bg-surface/70 text-ink2 hover:text-foreground"}`;

  return (
    <section aria-labelledby="fb-q" className="no-print rise mb-10 rounded-xl border bg-surface/70 px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="fb-q" className="text-sm font-medium">Does this score feel right?</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => send("right")} className="btn-line inline-flex h-9 items-center gap-2 px-3.5 text-[13px]"><Check />Feels right</button>
          <button type="button" aria-expanded={detail} onClick={() => setDetail(true)} className="btn-line inline-flex h-9 items-center gap-2 px-3.5 text-[13px]"><X />Feels off</button>
        </div>
      </div>

      {detail && (
        <div className="mt-4 border-t pt-4">
          <p className="eyebrow mb-3">Which categories felt wrong?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Categories that felt wrong">
            {CATEGORY_ORDER.map((c) => (
              <button key={c.id} type="button" aria-pressed={picked.includes(c.id)} onClick={() => toggle(c.id)} className={chip(picked.includes(c.id))}>{c.label}</button>
            ))}
          </div>
          <p className="eyebrow mb-3 mt-5">Overall, the score is</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Overall direction">
            {([["high", "Too high"], ["low", "Too low"], ["unsure", "Not sure"]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={dir === v} onClick={() => setDir(v)} className={chip(dir === v)}>{label}</button>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => send("off")} className="btn-solid inline-flex h-9 items-center px-4 text-[13px] font-medium">Send feedback</button>
            <span className="text-xs text-ink3">Sends only the score and the categories you pick. Never your PRD.</span>
          </div>
        </div>
      )}
    </section>
  );
}
