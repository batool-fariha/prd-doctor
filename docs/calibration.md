# Calibration

How the scoring was checked against human judgement, what it has and has not been tested on, and how to add your own documents.

PRD Doctor checks **structure and specifics, not whether an idea is good**. A keyword engine can tell that a PRD discusses risks; it cannot tell whether they are the right risks. Calibration exists to keep that limitation honest and measurable.

## Method

1. A real PRD is scored by hand first, as a careful reviewer would, before running the tool on it.
2. The tool is run and the overall score and each category are compared with the reviewer's judgement.
3. Where the tool is wrong, the cause is found in the rules (a heading read as a section, a plan counted as evidence, a product's own vocabulary counted as a plan) and the rule is fixed in general terms, never by special-casing one document.
4. All earlier documents are re-run, so a fix for one cannot quietly break another.

The documents themselves are confidential and are not in this repository. Only their results are recorded here.

## Results on real PRDs

| Document | Reviewer's score | Tool's score | Difference |
|---|---:|---:|---:|
| A | 73 | 73 | 0 |
| B | 72 | 68 | −4 |
| C | 69 | 66 | −3 |
| D | 70 | 68 | −2 |

Across these four the mean absolute difference is about 2 points and the largest is 4. In every case the tool was at or below the reviewer, so it errs on the side of under-scoring, not flattering. A fifth document was used to fix heading handling but has no recorded reviewer score, so it is not counted.

## What this does not show

- **One author.** All four documents come from one author's well-structured template. Weak, messy and unstructured real-world PRDs are the least tested area.
- **Prose without headings** was the weakest case and is still the least tested. A made-up 430-word PRD written as plain prose (a clear problem with numbers, interviews, a named segment, explicit non-goals, a metric with baseline and target, testable behaviour, edge cases, a named risk owner and a staged rollout) first scored **61** where a careful reviewer would say roughly **70 to 85**. Three general causes were fixed: role nouns such as "technicians" are now recognised as a user segment (with "should be able to" read as what the user wants to do), phrasings such as "does not include" now count as non-goals, and "at least N matches" signals now count matching sentences as well as lines, so a paragraph of testable statements is no longer a single hit. Prose requirement sentences ("must" or "shall") now count like a checklist. The document now scores **73**, and no other score in the regression set, including the real PRDs, moved. The expected range is the maintainer's estimate for a document written for this test, not an independent rating, and one made-up document is a thin basis: prose PRDs in other domains may still be under-scored.
- **Four documents is a small sample.** It is enough to find bugs, not enough to claim a general accuracy figure.
- **English only.** Non-English documents are detected and the report says the score is probably too low.
- **Gaming.** A PRD written to the rubric, or stuffed with keywords, can score well.

## Regression checks in the repository

`npm run check` (`scripts/score-check.mts`) keeps these in range on every change:

| Input | Accepted overall score |
|---|---|
| Rough example PRD (fictional) | 0 to 15 |
| Decent example PRD (fictional) | 45 to 65 |
| Strong example PRD (fictional) | 78 to 100 |
| A vague one-liner | 0 to 12 |
| A short but specific draft | 45 to 65 |
| A draft whose sections are placeholders (`Risks: none`, `TBD`) | 45 to 65, with Risks, Edge cases and Experiment design near zero |
| A PRD with numbered Markdown headings | 30 to 80 |
| A chat message with no structure | 5 to 25 |
| A flat feature list | 5 to 25, with prioritization low |
| A buzzword pitch | 3 to 22 |
| Specific prose with no headings | 50 to 80, with acceptance criteria, edge cases and evidence found |
| Strong 430-word prose PRD with no headings | 70 to 85, with Target user, Scope and Acceptance criteria at 55 or more |
| Non-English text (French, Spanish) | flagged as probably not English; English and very terse English notes are not |

Ranges are deliberately wide: they exist to catch a rule change that moves a score somewhere a reviewer would not accept, not to pin an exact number.

## Adding your own calibration set

You can check the tool against your own documents without putting them in the repository.

1. Score a document yourself first, honestly.
2. Save it as `scripts/private/<name>.expect-<score>.md`, for example `onboarding.expect-68.md`. The folder is git-ignored.
3. Run `npm run check`. Each private document must land within ±5 of the score in its name.
4. To see why a score came out the way it did:

```bash
VERBOSE=1 node --experimental-strip-types scripts/score-check.mts scripts/private/onboarding.expect-68.md
```

This prints each category with the checks that fired and the checks that did not.

## Help improve it

The most useful contribution is a document where the score felt wrong. Open a [score feedback issue](https://github.com/batool-fariha/prd-doctor/issues/new?template=score_felt_wrong.md) with the score you expected and which categories looked off. **Do not paste confidential text.** A short anonymised excerpt of the section that was misread is enough.
