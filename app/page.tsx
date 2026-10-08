"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzePRD, countWords, MIN_WORDS } from "@/lib/analyzer";
import { track } from "@/lib/analytics";
import { saveResult } from "@/lib/storage";

const SAMPLE = `# Saved Filters for Reports
Problem: Support managers struggle to re-create the same report filters every morning because filters reset on each visit. In 6 of 9 interviews last month, managers said they spend about 10 minutes a day rebuilding them.
Users: Support managers at mid-size teams (20-100 agents).
Goals: Let users save and reuse filters. Out of scope: sharing filters between users.
Success metrics: Reduce time to first report from 10 minutes to 2 minutes within 60 days of launch.
Acceptance criteria: Given a saved filter, when the manager opens Reports, then the filter is applied automatically.
Dependencies: Requires the Reports API from the platform team.`;

export default function Home() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const words = countWords(text);

  function analyze() {
    if (words < MIN_WORDS) {
      setError(`Paste a bit more: PRD Doctor needs at least ${MIN_WORDS} words to give useful feedback (you have ${words}).`);
      return;
    }
    setError("");
    const t0 = performance.now();
    track("analysis_started", { words, chars: text.length });
    const result = analyzePRD(text);
    saveResult(result);
    track("analysis_completed", {
      score: result.overall,
      words,
      duration_ms: Math.round(performance.now() - t0),
      weak_categories: result.categories.filter((c) => c.status === "weak").length,
    });
    router.push(`/result/${result.id}`);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-20">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <Stethoscope className="size-6" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">PRD Doctor</h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-muted-foreground">
          Paste your product requirements doc. Get a 0-100 score across 12 categories, with fixes that quote your own words.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setError(""); }}
        placeholder="Paste your PRD here…"
        className="min-h-[360px] resize-y rounded-xl p-4 text-sm leading-relaxed shadow-sm"
        aria-label="PRD text"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {words} words · Analysis runs in your browser. Your PRD is never uploaded.
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>Try a sample</Button>
          <Button size="lg" onClick={analyze}>Analyze PRD</Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </main>
  );
}
