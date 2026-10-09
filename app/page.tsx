"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { CountUp } from "@/components/count-up";
import { ArrowRight } from "@/components/icons";
import { analyzePRD, CATEGORY_ORDER, countWords, MIN_WORDS } from "@/lib/analyzer";
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
      setError(`Needs at least ${MIN_WORDS} words to say anything useful. You have ${words}.`);
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
    <main className="mx-auto w-full max-w-5xl px-6">
      <header className="flex items-baseline justify-between border-b py-6">
        <span className="serif flex items-center gap-2 text-xl"><span className="size-2.5 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#6D4AFF]" />PRD Doctor</span>
        <span className="font-mono text-xs text-muted-foreground">Private · runs in your browser</span>
      </header>

      <section className="grid items-center gap-14 py-16 md:grid-cols-[1.15fr_1fr] md:py-24">
        <div>
          <p className="eyebrow rise mb-5" style={{ "--i": 0 } as React.CSSProperties}>A second reader for your spec</p>
          <h1 className="serif rise text-5xl leading-[1.04] sm:text-6xl" style={{ "--i": 1 } as React.CSSProperties}>
            Is your PRD <em className="mark">ready</em> for review?
          </h1>
          <p className="rise mt-6 max-w-md text-[15px] text-muted-foreground" style={{ "--i": 2 } as React.CSSProperties}>
            Paste it in. You get a score out of 100 across twelve categories, and every fix quotes the sentence it is about. Nothing is invented on your behalf.
          </p>
          <a href="#paste" className="btn-solid rise mt-8 inline-flex h-10 items-center gap-2 px-5 text-sm font-medium" style={{ "--i": 3 } as React.CSSProperties}>
            Paste a PRD <ArrowRight />
          </a>
        </div>
        <Specimen />
      </section>

      <div className="rise -mx-6 mb-20 overflow-hidden border-y py-4 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]" style={{ "--i": 5 } as React.CSSProperties} aria-hidden>
        <div className="marquee gap-3 pr-3">
          {[...CATEGORY_ORDER, ...CATEGORY_ORDER].map((c, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border bg-white/70 px-4 py-1.5 text-sm">{c.label}</span>
          ))}
        </div>
      </div>

      <section id="paste" className="rise scroll-mt-8 pb-24" style={{ "--i": 6 } as React.CSSProperties}>
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") analyze(); }}
          placeholder="Paste your PRD here."
          className="min-h-[340px] resize-y rounded-xl border bg-white/90 p-6 text-[15px] leading-relaxed shadow-none"
          aria-label="PRD text"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span>{words} words</span>
            <button type="button" onClick={() => setText(SAMPLE)} className="underline-offset-4 hover:text-foreground hover:underline">
              Use a sample
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
              <kbd className="rounded border bg-[#F4F1FB] px-1.5 py-0.5 font-mono text-[11px]">⌘</kbd>
              <kbd className="rounded border bg-[#F4F1FB] px-1.5 py-0.5 font-mono text-[11px]">↵</kbd>
            </span>
            <button type="button" onClick={analyze} className="btn-solid inline-flex h-10 items-center gap-2 px-5 text-sm font-medium">
              Analyze PRD <ArrowRight />
            </button>
          </div>
        </div>
        {error && <p role="alert" className="mt-4 text-sm" style={{ color: "#9F2F2D" }}>{error}</p>}
      </section>
    </main>
  );
}

/** Illustrative sample only: not computed from anything the visitor typed. */
function Specimen() {
  const rows: [string, number][] = [["Problem clarity", 92], ["Success metrics", 74], ["Edge cases", 38], ["Risks", 16]];
  return (
    <div className="float panel relative mx-auto w-full max-w-sm p-6" aria-hidden>
      <div className="mb-5 flex items-center justify-between">
        <span className="eyebrow">Sample reading</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.05em]" style={{ background: "#FBF3DB", color: "#956400" }}>Needs work</span>
      </div>
      <div className="flex items-start gap-2">
        <CountUp value={61} className="serif score-grad text-7xl leading-none tabular-nums" />
        <span className="serif mt-2 text-lg text-muted-foreground">/100</span>
      </div>
      <div className="mt-6 space-y-3">
        {rows.map(([k, v], i) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-xs"><span>{k}</span><span className="font-mono text-muted-foreground">{v}</span></div>
            <div className="h-[3px] rounded-full bg-[#E7E1F7]"><div className="bar-fill now h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6D4AFF]" style={{ "--w": `${v}%`, transitionDelay: `${400 + i * 120}ms` } as React.CSSProperties} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
