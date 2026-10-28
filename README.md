# PRD Doctor

**Paste a PRD, get a score out of 100 and the exact sentences to fix.** Free, no account, and your document never leaves your browser.

[![CI](https://github.com/batool-fariha/prd-doctor/actions/workflows/ci.yml/badge.svg)](https://github.com/batool-fariha/prd-doctor/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-6D4AFF.svg)](LICENSE)

[![PRD Doctor result card](https://prd-doctor.vercel.app/opengraph-image)](https://prd-doctor.vercel.app)

**Try it: https://prd-doctor.vercel.app** · Built with Next.js 16, TypeScript, Tailwind 4, shadcn/ui and PostHog.

PRD Doctor scores a product requirements document across 12 categories (problem, users, evidence, pain, scope, metrics, acceptance criteria, risks, edge cases, dependencies, prioritization, experiment design). For every weak category it says what is missing, why it matters, what to add, and one question to answer. Each fix quotes a sentence **from your own PRD**, or says "No mention found". It never writes your PRD and never makes anything up.

## Contents

- [Why it exists](#why-it-exists)
- [What it does](#what-it-does)
- [How scoring works](#how-scoring-works)
- [How well does it match a human reviewer?](#how-well-does-it-match-a-human-reviewer)
- [Privacy](#privacy)
- [Run it locally](#run-it-locally)
- [Testing and tuning the scoring](#testing-and-tuning-the-scoring)
- [Architecture](#architecture)
- [Tradeoffs](#tradeoffs)
- [Roadmap](#roadmap)

## Why it exists

PRDs are the most reviewed and least measured document in product work. Feedback is slow and social: reviewers catch what they happen to care about, and gaps (no non-goals, no baseline for the metric, no rollback plan) surface at kickoff or after launch. There was no fast, private way to ask "is this ready for review?" before the meeting.

**Who it is for:** product managers who write PRDs weekly, plus founders and designers writing specs without a PM, and anyone learning to write one.

**The bet:** if you get a specific, quote-anchored critique in about 10 seconds, before sending the PRD out, you fix more gaps before review. Success looks like a high `analysis_completed / analysis_started`, repeat analyses of the same PRD with rising scores, and a healthy `share_clicked` rate per `score_viewed`.

## What it does

**Input**
- Paste text (Google Docs and Notion formatting is converted to headings and lists), or drop in a **PDF, Word (.docx), `.md` or `.txt`** file. Files are read in your browser and never uploaded.
- Not supported, with a clear message: scanned PDFs with no selectable text, legacy `.doc`, input under 40 words or over 60,000 characters, and code-like or repeated text.
- Three fictional examples (rough, decent, strong) so you can see the range before using your own.

**Results**
- Overall score and verdict, a radar chart, and per-category bars. Hover to link the chart with the list; click to jump to the fix.
- A **Fix this first** button that opens the weakest category, the top three weaknesses, your strongest section, and a suggested rewrite scaffold that keeps your own lines and leaves `[bracketed blanks]`.
- Every fix can be copied (one at a time or **all at once**) and marked as addressed.

**Iteration**
- **Edit and re-score** puts your text back in the editor and shows `+N since last time`. Recent analyses are listed on the home page.
- Export as Markdown, download `.md`, or print and save as PDF.

**Sharing**
- A score card (PNG) and a short public link (`/r/<18 characters>`) that opens the score on any device. The link carries **scores only**, never your text.
- After an improving re-score, a **before and after** card (`55 to 67`, with the previous radar dashed underneath).
- Post to LinkedIn or X from the result page.

**Polish**
- Dark mode, mobile layout with comfortable tap targets, keyboard focus, reduced-motion support, print styles.
- A "Does this score feel right?" prompt that sends only the score and category names, to find where the scoring disagrees with real reviewers.

## How scoring works

Twelve categories, each scored 0 to 100, combined by weight. The weights sum to 100, so `overall = Σ(score × weight / 100)`.

| Category | Weight | | Category | Weight |
|---|---|---|---|---|
| Problem clarity | 12 | | User pain severity | 8 |
| Success metrics | 11 | | Risks | 7 |
| Target user clarity | 10 | | Edge cases | 6 |
| Evidence | 10 | | Prioritization | 6 |
| Acceptance criteria | 10 | | Experiment design | 6 |
| Scope | 9 | | Dependencies | 5 |

Each category is a rubric of three to five **signals**, each with a weight and a pattern (see `RUBRICS` in `lib/analyzer.ts`). For *Success metrics*, for example: a named KPI, a numeric target or baseline, a concrete metric such as conversion or retention, and a time frame. A category's score is the sum of the signals found. The live rubric is also shown in the app at [/how-scoring-works](https://prd-doctor.vercel.app/how-scoring-works), generated from the same code so the page cannot drift.

Status per category: **strong** 70 and above, **ok** 40 to 69, **weak** below 40. The top three weaknesses are ranked by points lost, `(100 − score) × weight`, so a missing success metric outranks a missing dependency list.

### How it avoids cheap wins

- **Section-aware.** The PRD is split into sections (`# Heading`, numbered headings, `**Bold**`, `Label:` lines, or a plain standalone line like `Risks`, as in most Word and PDF files). A filled section with real content earns its category's headline signal. Front matter (Version, Status, Owner) is ignored.
- **Placeholders do not count.** `Risks: none`, `TBD`, `N/A` or an empty heading are detected and capped at 15.
- **One sentence cannot pay everywhere.** A sentence earns credit in at most four categories, with the section it sits in first.
- **Plans are not evidence.** A planned interview or an example query does not count as proof of the problem, and a PRD whose *product* is about experiments or prioritization does not get credit for those words. Experiment and prioritization credit comes only from the PRD's own plan sections.
- **Specifics are rewarded.** Numbers and named owners add a small bonus; vague words ("fast", "seamless", "better") are penalised in metrics and acceptance criteria, and "everyone" under target user.

### No hallucination

The output is only ever (a) sentences copied from your PRD, (b) fixed rubric text, and (c) `[bracketed placeholders]`. Quote labels tell you what you are looking at: *You wrote* (a sentence that satisfied part of the rubric), *Vague wording*, *Placeholder section*, and *Nearest text* (the closest sentence to where the section would go). Quotes are distinct across categories. When nothing is relevant, the report says "No mention found in your PRD" instead of quoting something unrelated.

## How well does it match a human reviewer?

It checks **structure and specifics, not whether the idea is good**. A keyword engine detects that a PRD talks about risks, not that the risks are the right ones.

To keep it honest, the engine was calibrated against real PRDs I scored by hand first, then tuned until it landed close without changing the rule for any single document:

| PRD (real, confidential, not in this repo) | My score | Engine |
|---|---|---|
| A | 73 | 73 |
| B | 72 | 68 |
| C | 69 | 66 |
| D | 70 | 68 |

Mean absolute error is about 2 points and the engine has so far been at or below my score. Caveats: all four come from one author's well-structured template, so the zone least tested is weak and messy real-world PRDs. The regression ranges in `scripts/score-check.mts` also cover three fictional examples (about 3, 58 and 88) plus hand-written samples. If a score feels wrong to you, the in-app feedback prompt is how it gets better.

## Privacy

- **Analysis runs in your browser.** There is no server-side analysis, no database and no LLM call.
- **Where your text lives.** The result, including the PRD text (so you can edit and re-score), is stored in `localStorage` on your device only. "Clear history" wipes it. If storage is blocked, results still open for the session.
- **Share links contain scores only.** `/r/<code>` encodes the overall score and 12 category scores. Anyone opening it sees the score, radar and bars, never the document.
- **Analytics are minimal.** PostHog is initialised with session replay, autocapture, surveys and dead-click capture all **disabled** (`lib/analytics.ts`), so the text you type is never recorded. Six events are sent, with counts, scores and category names only: `analysis_started`, `analysis_completed`, `share_clicked`, `score_viewed`, `score_feedback`, `example_loaded`. Without `NEXT_PUBLIC_POSTHOG_KEY`, analytics are a no-op.

## Run it locally

Requires Node 20 or newer for the app, and Node 22.6 or newer for the `check` and `fuzz` scripts (they use `--experimental-strip-types`).

```bash
npm install
cp .env.example .env.local   # optional: add NEXT_PUBLIC_POSTHOG_KEY
npm run dev                  # http://localhost:3000
```

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run check` | Scoring regression check (see below) |
| `npm run paste` | Checks the rich-text paste converter on Google Docs, Notion and Confluence-style HTML |
| `npm run fuzz` | Hostile-input check |
| `npm test` | `check`, `paste` and `fuzz` together (what CI runs) |

**Environment variables** (both optional):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key. Public by design. Leave empty to disable analytics. |
| `NEXT_PUBLIC_POSTHOG_HOST` | Defaults to `https://us.i.posthog.com`. |

**Deploying.** It deploys to Vercel with no configuration (Hobby tier is enough; share cards are CDN-cached so a traffic spike stays cheap). Add the two variables above in the project settings if you want analytics. It also runs anywhere Node does. The site address used in share cards and metadata lives in `lib/site.ts`; change it if you fork the project.

## Testing and tuning the scoring

Run after any change to `lib/analyzer.ts`:

```bash
npm run check                                   # regression ranges, all must pass
node --experimental-strip-types scripts/score-check.mts path/to/prd.md
VERBOSE=1 node --experimental-strip-types scripts/score-check.mts path/to/prd.md
npm run fuzz
```

After a change to `lib/paste.ts`, run `npm run paste`. It feeds the converter HTML shaped like Google Docs, Notion and Confluence clipboards and includes regression cases for two bugs found by hand (lost soft line breaks, a list in a table cell pasted twice).

- `score-check` runs the fictional examples and hand-written samples against the range a careful reviewer would accept. Pass a file path to see a per-category breakdown of any PRD, so confidential documents never need to enter the repo. `VERBOSE=1` shows which checks fired.
- To track your own calibration set, drop files named `<name>.expect-<score>.md` into `scripts/private/` (git-ignored). `score-check` then verifies each is within ±5 of the score you gave it.
- `fuzz` runs 20 hostile inputs (empty, 60,000 characters, nested markdown, RTL and emoji text, null bytes, pathological repeats): no crashes, scores stay within 0 to 100, and the slowest case takes well under 100 ms.

## Architecture

```
app/page.tsx                 editor → analyzePRD() in the browser → localStorage → /result/[id]
app/result/[id]/page.tsx     server shell; generateMetadata() sets the preview image
app/r/[code]/page.tsx        public score page from a short code
app/api/og/route.tsx         1200×630 share card PNG (next/og), also the "Download card" file
app/how-scoring-works/       rubric page generated from the live code
lib/analyzer.ts              rubrics, section parsing, scoring, quotes, rewrite, share payload
lib/examples.ts              the three fictional example PRDs
lib/storage.ts               localStorage: results, history, draft, addressed fixes, feedback
lib/files.ts                 PDF / Word / text reading, fully client-side
lib/paste.ts                 rich-text paste to markdown-ish text
lib/validate.ts              input checks (length, junk, repetition)
lib/report.ts                Markdown report and per-fix export
lib/analytics.ts             PostHog wrapper (no-op without a key)
lib/site.ts                  site name, URL, author links
components/result-view.tsx   hero, radar, bars, fixes, rewrite, share controls
components/                  diagnosis overlay, example picker, feedback, footer, theme toggle, charts
scripts/                     score-check.mts and fuzz.mts
```

Key decisions:
- **Deterministic engine.** The same text always gives the same score, which makes it testable and explainable.
- **Stateless sharing.** The short code packs the scores into 13 bytes (18 characters) so there is nothing to store.
- **Hand-rolled radar and bars** instead of a chart library: about 40 lines, no dependency.
- **Heavy parsers load on demand.** `mammoth` (Word) and `unpdf` (PDF) are only fetched when someone uploads that file type.

## Tradeoffs

- **Heuristics over an LLM.** Free, instant, private, explainable, testable, and unable to fabricate facts. The cost: it detects *presence*, not *quality*. A PRD that says "risks: none" is caught, but one with irrelevant risks still gets credit. Patterns are English only and can be gamed by keyword stuffing.
- **Stateless sharing over a database.** No infrastructure and nothing to leak. The cost: the public link cannot show the full report, and anyone can hand-craft a link to show a fake score. The card is a self-reported signal, not a certificate.
- **Results in `localStorage`.** Clearing the browser loses them. Fine for an anonymous tool.

## Roadmap

This is a finished v1, lightly maintained. Ideas, roughly in order, not promises:

1. **A bigger calibration set.** More PRDs from other authors, especially weak and messy ones, to widen the range the scoring has been checked on.
2. **An optional LLM second pass.** Keep the rubric and quoting contract; have a model grade *quality*, and require its evidence to be a verbatim substring of your PRD (reject otherwise).
3. **Customisable rubrics** per team (for example a compliance category for regulated products).
4. **Import** from Notion, Google Docs or Confluence.
5. **Localisation** beyond English.

## Contributing

Issues and pull requests are welcome, especially a PRD where the score felt wrong (remove anything confidential first). Run `npm run lint`, `npm run typecheck` and `npm test` before opening a PR; GitHub Actions runs the same checks plus a production build. Dependabot opens weekly pull requests for dependency updates.

## License

[MIT](LICENSE) © Fariha Batool.

## Author

Designed and built by [Fariha Batool](https://www.linkedin.com/in/fariha-batool/). Source: https://github.com/batool-fariha/prd-doctor
