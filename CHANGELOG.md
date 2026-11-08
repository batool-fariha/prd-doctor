# Changelog

All notable changes to PRD Doctor. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Releases follow [Semantic Versioning](https://semver.org/) (see [CONTRIBUTING.md](CONTRIBUTING.md#versioning-and-releases)). Work before the first tag is grouped by date, newest first.

## Unreleased

Nothing yet.

## [1.1.0] - 2026-11-09

Scoring is fairer to PRDs written as prose, without headings. Real calibration PRDs and the built-in examples score exactly as in 1.0.0.

### Changed
- Scoring for PRDs written as prose without headings: role nouns (technicians, clinicians, operators, dispatchers and similar) count as a named user segment; "should be able to" counts as what the user is trying to do; "does not include", "not part of" and similar phrasings count as non-goals; "at least N matches" signals count matching sentences as well as lines; and two or more "must" or "shall" sentences count like a checklist of requirements. A 430-word prose test PRD moved from 61 to 73. The examples and all real calibration PRDs scored exactly as before.
- The score check supports known gaps (reported without failing, and failing if fully closed). None is open now.

### Added
- A regression case for a strong PRD written as prose without headings.

### Dependencies
- PDF reading moves to `unpdf` 2 (a major version); parsing a real PDF and a Word file was re-checked, and the type check and build pass.
- Minor and patch updates: `posthog-js` 1.444, `lucide-react` 1.66, `cn` 0.5.1 and the dev-only `linkedom`.

## [1.0.0] - 2026-11-05

The first tagged release. Everything below this heading, back to 2026-10-09, was built before tagging and is kept as dated history.

### Added
- Documentation set in `docs/`: architecture, privacy, calibration, deployment and a generated scoring reference (`docs/scoring.md`, kept in sync by `npm run docs` and checked in CI).
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue templates (bug, feature, "the score felt wrong") and a pull request template.
- Screenshots of the share cards and link preview in the README.

## 2026-10-28

### Added
- GitHub Actions CI (type check, lint, tests, production build) and Dependabot for npm and GitHub Actions.
- MIT license.
- `npm run paste`: tests for the rich-text paste converter, with regression cases for two earlier bugs.
- `axe-core` as a dev dependency and `scripts/axe-snippet.js` to repeat the accessibility audit. Audited pages had no violations in light or dark mode.
- Branch protection on `main` (no force-pushes or deletion; CI must pass for pull requests).

### Changed
- Results hero switches to one column below 1024 px, so tablet widths keep readable stat cells and buttons.
- `npm run typecheck` generates Next.js route types first, so a clean checkout passes CI.
- Feature cards on the home page use `h2`, so heading levels do not skip.
- `shadcn` (a build-time tool) moved to dev dependencies.

### Security
- Merged Dependabot updates: `actions/checkout` and `actions/setup-node` 7, ESLint 10, and the React, base-ui, lucide, PostHog and unpdf minor and patch group. Dependabot now ignores major bumps of `typescript` and `@types/node`, with the reasons recorded in `.github/dependabot.yml`.

## 2026-10-26

### Added
- A note on results for documents that do not look English, since the checks are English only.
- Recognition of acceptance criteria written as prose (thresholds such as "under 300 ms", "if X, show Y") and of failure states such as "zero results" and "stale".
- A "Polish next" button label for PRDs scoring 80 and above.
- Link-preview image with a labelled sample radar, and share-card stat cells that match the site.

### Changed
- The suggested rewrite is shown as a document: headings, quoted lines with a rule, and highlighted blanks. "Copy as Markdown" moved to the section header.
- "Where to start" lists only categories that need work and matches "Fix this first"; the Fixes list uses the same order.
- One-line timelines such as "Timeline: Q2" no longer count as prioritization.
- Mobile layout: the empty editor no longer overflows, Analyze is full width, and the stat strip is a compact row.
- Short dates in history ("Oct 26") instead of locale-dependent numeric dates.
- Check marks are visible in dark mode.

### Fixed
- A list inside a table cell was pasted twice.
- Soft line breaks fused two lines into one word when pasting from Google Docs and Confluence.

### Security
- Upgraded Next.js 16.4.0 to 16.4.3 for a published advisory.
- Applied `npm audit` fixes to transitive dependencies; production dependencies report no known vulnerabilities.

## 2026-10-24

### Changed
- README rewritten, and `check`, `fuzz` and `typecheck` scripts added.

## 2026-10-13

### Added
- First-visit hint in the empty editor, a "Fix this first" button, "Copy all fixes", Escape to close the card preview, reduced-motion handling for scroll jumps, and a shorter hero on short laptop screens.

## 2026-10-12

### Added
- Example picker (rough, decent and strong fictional PRDs) and a "Does this score feel right?" prompt that sends only scores and category names.
- A private calibration set in the scoring check (`scripts/private/`, git-ignored, ±5 tolerance).
- CDN caching for share-card images.

### Changed
- Scoring tuned on five real PRDs: numbered and nested headings, front matter, plain-text and PDF-style documents, emoji headings, goal and non-goal sections, source references and pilots, and best-match section categories.
- PRDs whose product is about experiments or prioritization no longer score their own topic as a plan.

## 2026-10-11

### Added
- Short public score links (`/r/<code>`) and a share card that always prints the public address.
- Before and after share card with the previous radar drawn dashed underneath.
- PDF and Word upload, paste cleanup for Google Docs and Notion, export (Markdown, `.md`, print to PDF), and re-scoring with history.
- Diagnosis overlay, score voice, linked radar, dark mode, and the "How scoring works" page.
- Logo, favicon, Apple touch icon, branded error pages, footer links, LinkedIn and X sharing, and link-preview metadata.

### Changed
- Launch hardening: engine fuzzing, storage and clipboard fallbacks, mobile and in-app browser fixes, security headers, and accessibility checks.

## 2026-10-09

### Added
- First version: paste a PRD, get a 0 to 100 score across twelve categories, with fixes that quote the user's own text, a radar chart, a suggested rewrite scaffold, a shareable score card, and PostHog analytics limited to counts and scores.

[1.1.0]: https://github.com/batool-fariha/prd-doctor/releases/tag/v1.1.0
[1.0.0]: https://github.com/batool-fariha/prd-doctor/releases/tag/v1.0.0
