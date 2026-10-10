# PRD Doctor

**Live:** https://prd-doctor.vercel.app

Paste a product requirements document, click **Analyze PRD**, get a 0-100 score across 12 categories. Every weak category comes with what's missing, why it matters, exactly what to add, and one question, each anchored to a sentence **quoted from your own PRD**.

Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · PostHog. No auth, no database, no API keys required.

## Problem

PRDs are the most-reviewed and least-measured artifact in product work. Feedback is slow, inconsistent and social: reviewers catch what they happen to care about, and gaps (no non-goals, no baseline for the metric, no rollback plan) surface at kickoff or after launch. PMs have no fast, private, objective way to ask "is this ready for review?"

## Target user

Primary: product managers (IC to group PM) at startups and scale-ups, who write PRDs weekly and review them with engineering and design. Secondary: founders and designers writing specs without a PM, and PM leads who want a consistent bar across a team.

## Product hypothesis

> If a PM gets a specific, quote-anchored critique in under 10 seconds, before sending the PRD for review, they will fix more gaps pre-review and share the score as a quality signal.

Success looks like: high `analysis_completed / analysis_started`, repeat analyses of the same PRD with rising scores, and a healthy `share_clicked` rate per `score_viewed`.

## Scoring model

Twelve categories, each scored 0-100, combined into the overall score by weight:

| Category | Weight | | Category | Weight |
|---|---|---|---|---|
| Problem clarity | 12 | | Risks | 7 |
| Success metrics | 11 | | Edge cases | 6 |
| Target user clarity | 10 | | Prioritization | 6 |
| Evidence | 10 | | Experiment design | 6 |
| Acceptance criteria | 10 | | Dependencies | 5 |
| Scope | 9 | | User pain severity | 8 |

Weights sum to 100, so `overall = Σ(score × weight / 100)`.

Each category is a **rubric of 3-5 signals** (see `RUBRICS` in `lib/analyzer.ts`), each with a weight and a pattern, e.g. for *Success metrics*: a named KPI (30), a numeric target/baseline (30), a concrete metric such as conversion or retention (25), a time frame (15). A category's score is the sum of detected signal weights. Two penalties: −15 for vague wording in Metrics/Acceptance criteria (“fast”, “seamless”, “better”) and −15 for generic users (“everyone”) in Target user.

Status: **strong** ≥ 70, **ok** 40-69, **weak** < 40. The **top 3 weaknesses** are ranked by weighted points lost, `(100 − score) × weight`, so a missing success metric outranks a missing dependency list. The **strongest section** is the highest raw score.

### How the checks avoid cheap wins

- **Section-aware.** The PRD is split into sections (`# Heading`, `**Bold**`, or `Label:` lines). A matching section that has real content earns the category's headline signal.
- **Placeholders don't count.** `Risks: none`, `TBD`, `N/A`, or an empty heading are detected, capped at 15, and shown as a "Placeholder section" quote.
- **One sentence can't pay everywhere.** A sentence earns credit in at most three categories: the section it sits in first, then its best matches. Heading-only lines never score.
- **Specifics are rewarded.** Numbers (limits, counts) and named owners add a small bonus where they matter.
- **Vague words are penalised** in metrics and acceptance criteria; "everyone" is penalised under target user.

### No hallucination

The engine only ever outputs (a) sentences copied from your PRD, (b) fixed rubric text, and (c) `[bracketed placeholders]`. The suggested rewrite is a scaffold: it keeps your quoted lines and leaves blanks. It never invents users, numbers or evidence. Quote kinds: *You wrote* (a sentence that satisfied part of the rubric), *Vague wording* (flagged as unmeasurable), *Placeholder section* (e.g. `Risks: none`), and *Nearest text* (the sentence closest to where the section would go). Quotes are chosen to be distinct across categories, and when nothing is relevant the report says "No mention found in your PRD" instead of quoting something unrelated.

## Features

- **Edit and re-score:** returns to the editor with your text; the result shows `+N since last time` for the same PRD title. Recent analyses are listed on the home page.
- **Input:** paste (Google Docs / Notion formatting is converted to headings and lists), or upload / drag in a `.md` or `.txt` file. Validation catches too-short, too-long (60k chars), code-like and repeated input with a clear message.
- **Export:** copy the report as Markdown, download `.md`, or print / save as PDF.
- **Fix tracking:** copy any fix, and mark fixes as addressed with a progress meter.
- **Share:** score card PNG (score, radar, three metrics, result URL) and a link that carries scores only.

## Architecture

```
app/page.tsx                 editor → analyzePRD() in the browser → localStorage → /result/[id]
app/result/[id]/page.tsx     server shell, generateMetadata() sets og:image from ?s=
components/result-view.tsx   score ring, radar, bars, top-3, fixes, rewrite, share controls
app/api/og/route.tsx         1200×630 share card PNG (next/og), also the "Download card" file
lib/analyzer.ts              rubrics, section parsing, scoring, quotes, rewrite, share payload
lib/storage.ts               localStorage: results, history, draft, "addressed" fixes
lib/paste.ts                 rich-text (HTML) paste to markdown-ish text
lib/validate.ts              input checks (length, junk, repetition)
lib/report.ts                Markdown report and per-fix export
lib/analytics.ts             PostHog wrapper (no-op without a key)
```

- **Analysis runs client-side.** The PRD never leaves the browser, which matters because PRDs are confidential. The full result, **including the PRD text** (so you can edit and re-score), is stored in `localStorage` on your device only, and can be wiped with "Clear history".
- **Sharing is stateless.** The share URL is `/result/<id>?s=<base64url>` where `s` holds **only the scores** (overall + 12 numbers), never the text. Anyone opening it sees the score, radar and bars; the full report appears only in the browser that created it. The same `s` drives the social preview image and the downloadable card, which shows the score, three metrics (strongest category, biggest gap, healthy categories out of 12) and the result URL.
- **Analytics events:** `analysis_started`, `analysis_completed`, `share_clicked` (method: native/copy/download), `score_viewed` (source: own/shared). Properties are counts and scores only, never PRD text. Anonymous: `person_profiles: "identified_only"`.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add NEXT_PUBLIC_POSTHOG_KEY
npm run dev                  # http://localhost:3000
npm run build && npm start
```

Deploys to Vercel with zero config (set the two optional PostHog env vars). It also runs anywhere Node does.

## Tradeoffs

- **Heuristics over an LLM.** Deterministic, free, instant, private, explainable and testable, and it can't fabricate facts. The cost: it detects *presence* of structure, not *quality*. A PRD can say “risks: none” and still get credit for mentioning risks. Patterns are English-only and can be gamed by keyword stuffing.
- **Stateless sharing over a database.** No infra, no PII, nothing to leak. The cost: the public link can't show the full report, and anyone can hand-craft a `?s=` payload to display a fake score (the card is a self-reported signal, not a certificate).
- **Results in `localStorage`.** Clearing the browser loses the report. Fine for an anonymous MVP.
- **Hand-rolled radar and bars** instead of a chart library: ~40 lines, no dependency.

## Roadmap

0. **Done:** section-aware scoring, placeholders, distinct quotes, history and re-score, upload and paste cleanup, export.
1. **Test corpus + calibration.** Collect ~50 real PRDs, hand-label them, and tune weights and patterns against reviewer judgement.
2. **LLM judge as an optional second pass.** Keep the rubric and quoting contract; have a model grade *quality* per signal and require its evidence to be a verbatim substring of the PRD (reject otherwise).
3. **Persistent results** (database + short URLs) with an opt-in public report page.
4. **Accounts and history:** score over time, team benchmarks, shared standards per org.
5. **Integrations:** import from Notion, Google Docs, Confluence, Linear; a Slack/GitHub check that comments a score on PRD changes.
6. **Customisable rubrics** per company (e.g. regulated industries need a compliance category).
7. **Localisation** beyond English.

## Analytics privacy

PostHog is initialised with session replay, autocapture, surveys and dead-click capture all **disabled** (`lib/analytics.ts`), so the PRD text typed into the editor is never recorded. Only the four named events are sent, with counts and scores as properties. Set `NEXT_PUBLIC_POSTHOG_KEY` (see `.env.example`); without it analytics are a no-op.
