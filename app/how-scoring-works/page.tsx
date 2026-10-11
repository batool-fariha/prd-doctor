import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { RUBRIC_SUMMARY } from "@/lib/analyzer";

export const metadata: Metadata = {
  title: "How scoring works",
  description: "The 12 categories, their weights, what each check looks for, and what the score cannot tell you.",
  alternates: { canonical: "/how-scoring-works" },
};

const rules = [
  ["Section-aware", "A heading or label such as “Risks” counts only if the section has real content under it."],
  ["Placeholders don't count", "“Risks: none”, “TBD”, “N/A” and empty sections are detected and capped at 15 for that category."],
  ["No double-dipping", "A single sentence can earn credit in at most three categories: the section it sits in, then its best matches."],
  ["Specifics are rewarded", "Concrete numbers (limits, counts, dates) and named owners add a small bonus where they matter."],
  ["Vague words cost points", "“Fast”, “seamless” or “better” in metrics and acceptance criteria subtract 15. “Everyone” as a target user does too."],
];

const limits = [
  "It checks structure and specifics, not whether your idea is good, true or well researched.",
  "It reads keywords and layout, so an unusual structure or a non-English PRD can be misread. Treat it as a checklist, not a grade.",
  "A section can look complete and still say nothing useful. The score cannot tell the difference.",
  "Scanned PDFs (pictures of text) can't be read. Export a text PDF or paste the content.",
];

export default function HowScoringWorks() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="flex items-center justify-between border-b py-4">
        <Link href="/" className="serif flex items-center gap-2.5 text-xl"><LogoMark />PRD Doctor</Link>
        <ThemeToggle />
      </header>

      <section className="max-w-2xl py-16 md:py-24">
        <p className="eyebrow mb-4">Method</p>
        <h1 className="serif text-5xl leading-[1.05] sm:text-6xl">How the score works</h1>
        <p className="mt-6 text-[17px] leading-relaxed text-ink2">
          PRD Doctor reads your document against twelve categories a reviewer usually cares about. Each category is a short checklist of things to look for. The score is the weighted sum, and every fix quotes a sentence from your own text. Nothing is generated or guessed on your behalf.
        </p>
      </section>

      <section className="border-t pt-10">
        <h2 className="eyebrow mb-6">The rules</h2>
        <ul className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
          {rules.map(([t, d]) => (
            <li key={t} className="bg-surface/90 p-6">
              <h3 className="serif text-xl">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink2">{d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t pt-10 mt-14">
        <h2 className="eyebrow mb-6">The twelve categories</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {RUBRIC_SUMMARY.map((c) => (
            <article key={c.id} className="rounded-xl border bg-surface p-6">
              <div className="flex items-start justify-between gap-4">
                <h3 className="serif text-2xl leading-tight">{c.label}</h3>
                <span className="shrink-0 rounded-full bg-softlav px-2.5 py-1 font-mono text-[11px] text-violet2">{c.weight}% of score</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink2">{c.why}</p>
              <ul className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                {c.signals.map((sg) => (
                  <li key={sg.label} className="flex justify-between gap-4"><span className="text-ink2">{sg.label}</span><span className="shrink-0 font-mono text-xs text-muted-foreground">+{sg.weight}</span></li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Points within a category add up to 100, then each category counts for its share of the overall score.</p>
      </section>

      <section className="border-t pt-10 mt-14 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="eyebrow mb-6">What it can&apos;t tell you</h2>
          <ul className="space-y-3 text-[15px] leading-relaxed text-ink2">
            {limits.map((l) => <li key={l} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#A78BFA]" />{l}</li>)}
          </ul>
        </div>
        <div>
          <h2 className="eyebrow mb-6">Your document stays yours</h2>
          <p className="text-[15px] leading-relaxed text-ink2">
            Scoring runs entirely in your browser. PDFs and Word files are read on your device, and your text is never uploaded. Results are kept in your own browser storage so you can edit and re-score. Anonymous usage analytics record counts and scores only, never document text. A shared link or card contains scores, not your PRD.
          </p>
        </div>
      </section>

      <div className="mt-16">
        <Link href="/" className="btn-solid inline-flex h-11 items-center gap-2 px-6 text-sm font-medium">Score your PRD <ArrowRight /></Link>
      </div>
    </main>
  );
}
