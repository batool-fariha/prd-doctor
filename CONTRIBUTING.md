# Contributing to PRD Doctor

Thanks for helping. PRD Doctor is a small, deterministic tool, and the most valuable contributions are the ones that make its scores more trustworthy: a document where the score felt wrong, a fix for a misread heading, or a clearer explanation.

## Ways to help

- **Report a score that felt wrong.** Use the [score feedback template](https://github.com/batool-fariha/prd-doctor/issues/new?template=score_felt_wrong.md). Say what you expected and which categories looked off. **Never paste confidential text**: a short anonymised excerpt of the misread section is enough.
- **Report a bug** or **suggest a feature** with the matching issue template.
- **Improve the docs.** Corrections to [`docs/`](docs/) and the README are always welcome.
- **Send a pull request.** For anything larger than a small fix, open an issue first so we can agree on the approach.

## Setup

```bash
git clone https://github.com/batool-fariha/prd-doctor.git
cd prd-doctor
npm install
cp .env.example .env.local   # optional; analytics stay off without a key
npm run dev                  # http://localhost:3000
```

Node 20 or newer runs the app. The `check`, `paste`, `fuzz` and `docs` scripts need Node 22.6 or newer. See [docs/deployment.md](docs/deployment.md).

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then `tsc --noEmit` |
| `npm test` | `check` (scoring regression), `paste` (paste converter), `fuzz` (hostile inputs) and `docs:check` |
| `npm run docs` | Regenerate `docs/scoring.md` from the live rubric |

## Where things live

[docs/architecture.md](docs/architecture.md) has the full module map. In short:

| Path | Purpose |
|---|---|
| `lib/analyzer.ts` | The scoring engine: rubrics, section parsing, scoring, quotes, rewrite |
| `lib/paste.ts`, `lib/files.ts`, `lib/validate.ts` | Input handling |
| `app/`, `components/` | The Next.js UI and routes |
| `scripts/` | Regression, paste, fuzz and docs scripts |
| `docs/` | Documentation; `docs/scoring.md` is generated |

## Ground rules

1. **The engine stays deterministic and private.** `lib/analyzer.ts` must not make network calls or use randomness in scoring. The same text must always give the same score.
2. **Never invent content.** The report may only show sentences copied from the user's PRD, fixed rubric text, and `[bracketed blanks]`. If nothing relevant exists, it says so.
3. **Fix rules, not documents.** If a real PRD scores wrongly, find the general cause and fix that. Do not add a special case for one document. Re-run everything so one fix cannot break another.
4. **Scoring changes need a test.** Add or adjust a case in `scripts/score-check.mts` (or `scripts/paste-check.mts` for paste handling) that fails without your change.
5. **Keep confidential documents out of the repo.** Use `scripts/private/` (git-ignored) for your own calibration files. See [docs/calibration.md](docs/calibration.md).
6. **Respect accessibility.** Keep visible focus, labelled controls, one `h1` per page and reduced-motion support. `scripts/axe-snippet.js` describes how to re-run the axe audit.
7. **Share links are a contract.** Changing the number of categories or the payload shape breaks existing links. See [docs/architecture.md](docs/architecture.md#sharing-without-a-database).

## Before opening a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If you changed the rubric, also run `npm run docs` and commit the regenerated `docs/scoring.md`. Update `CHANGELOG.md` under **Unreleased**. GitHub Actions runs the same checks on every pull request.

## Commit messages

Write a short imperative summary of what changed and, when it is not obvious, why. For example: `Stop a one-line timeline counting as prioritization`.

## Versioning and releases

Releases follow [Semantic Versioning](https://semver.org/), applied to what a visitor can observe:

| Bump | When |
|---|---|
| **Patch** (1.0.x) | Bug fixes, copy and layout fixes, dependency updates, and scoring fixes that do not materially change scores |
| **Minor** (1.x.0) | New features, and rubric or scoring changes that move scores for real documents |
| **Major** (x.0.0) | Anything that breaks existing share links or the shared payload, such as changing the number of categories |

Maintainers cut a release by moving the **Unreleased** notes in `CHANGELOG.md` under a new version heading, running `npm version <x.y.z> --no-git-tag-version`, merging, and creating a GitHub Release with the same notes. Contributors only need to add a line under **Unreleased**.

## Code of conduct

By taking part you agree to the [code of conduct](CODE_OF_CONDUCT.md).
