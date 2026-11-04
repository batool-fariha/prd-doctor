# Scoring reference

> This file is generated from `RUBRICS` in [`lib/analyzer.ts`](../lib/analyzer.ts) by `npm run docs`. Do not edit it by hand: CI fails if it is out of date. The live version of the same table is on the site at [/how-scoring-works](https://prd-doctor.vercel.app/how-scoring-works).

PRD Doctor scores a document across twelve categories. Each category is scored 0 to 100, and the overall score is the weighted sum:

```
overall = Σ (category score × weight / 100)
```

Weights add up to 100. Input must be at least 40 words and at most 60,000 characters.

## Categories at a glance

| Category | Weight | Signals |
|---|---:|---:|
| [Problem clarity](#problem-clarity) | 12 | 5 |
| [Target user clarity](#target-user-clarity) | 10 | 5 |
| [Evidence](#evidence) | 10 | 5 |
| [User pain severity](#user-pain-severity) | 8 | 4 |
| [Scope](#scope) | 9 | 4 |
| [Success metrics](#success-metrics) | 11 | 4 |
| [Acceptance criteria](#acceptance-criteria) | 10 | 5 |
| [Risks](#risks) | 7 | 4 |
| [Edge cases](#edge-cases) | 6 | 3 |
| [Dependencies](#dependencies) | 5 | 4 |
| [Prioritization](#prioritization) | 6 | 3 |
| [Experiment design](#experiment-design) | 6 | 3 |

A category's score is the sum of the weights of the signals found in it, plus a small bonus for specifics (numbers, named owners) where they matter, minus penalties for vague wording, generic users and placeholder sections. The result is clamped to 0 to 100.

Status per category: **strong** is 70 and above, **ok** is 40 to 69, **weak** is below 40.

## How a document is read

- **Section-aware.** The text is split into sections (`# Heading`, numbered headings, `**Bold**`, `Label:` lines, or a plain standalone line such as `Risks`). A section with real content under it earns its category's headline signal. Front matter such as Version, Status and Owner is ignored.
- **Placeholders do not count.** `Risks: none`, `TBD`, `N/A` and empty headings are detected and capped at 15 for that category.
- **One sentence cannot pay everywhere.** A sentence earns credit in at most four categories, with the section it sits in considered first.
- **Plans are not evidence.** A planned interview or an example query does not count as proof of the problem. Experiment and prioritization credit comes only from the PRD's own plan sections, never from a product description that merely uses the words.
- **Vague words cost points.** Words such as "fast", "seamless" and "better" are penalised in Success metrics and Acceptance criteria, and "everyone" is penalised under Target user clarity.
- **Specifics are rewarded.** Numbers and named owners add a bonus in the categories where they matter.

## Top weaknesses

The weaknesses shown first are ranked by points lost, `(100 − score) × weight`, so a missing success metric outranks a missing dependency list. Only categories below 70 are listed as things to fix.

## Category rubrics

### Problem clarity

**Weight 12.** A PRD that starts from a solution can't be challenged, prioritised or measured. The problem statement is what the team returns to when scope and trade-offs get argued.

| Signal | Points |
|---|---:|
| an explicit problem statement | 25 |
| a cause (why the problem exists) | 20 |
| a Problem / Background / Context section | 20 |
| the situation in which it happens | 15 |
| the cost of leaving it unsolved | 20 |

Signals add up to 100.

### Target user clarity

**Weight 10.** “Everyone” is not a user. Without a specific segment you can't recruit research participants, judge usability, or know whether a metric moved for the right people.

| Signal | Points |
|---|---:|
| a named user segment or persona | 30 |
| a Users / Persona / Audience section | 20 |
| what the user is trying to get done | 20 |
| user stories (“As a …”) | 15 |
| how many of them there are | 15 |

Signals add up to 100.

### Evidence

**Weight 10.** Opinions are cheap. Evidence is what separates a bet from a hunch and lets reviewers decide whether the problem is real before spending engineering time.

| Signal | Points |
|---|---:|
| a research or data source (interviews, analytics, tickets…) | 35 |
| specific numbers with units | 30 |
| a source reference (n=, link, report name) | 15 |
| a direct customer quote | 10 |
| a date or time window for the data | 10 |

Signals add up to 100.

### User pain severity

**Weight 8.** Severity decides priority. A frequent, expensive pain justifies a roadmap slot; a rare annoyance doesn't, no matter how elegant the solution.

| Signal | Points |
|---|---:|
| severity language (critical, blocker, costly…) | 25 |
| how often it happens | 20 |
| a quantified impact (money, time, tickets) | 35 |
| the current workaround | 20 |

Signals add up to 100.

### Scope

**Weight 9.** Unwritten non-goals become scope creep. Explicit boundaries let engineering estimate honestly and let stakeholders disagree early, on paper.

| Signal | Points |
|---|---:|
| goals or in-scope items | 30 |
| non-goals / out-of-scope items | 35 |
| phases, milestones or timeline | 20 |
| a structured list of requirements | 15 |

Signals add up to 100.

### Success metrics

**Weight 11.** If you can't say how you'll know it worked, you can't tell a win from a miss, and the launch review turns into opinion.

| Signal | Points |
|---|---:|
| a named success metric / KPI | 30 |
| a numeric target or baseline | 30 |
| a concrete metric (conversion, retention, time-to-X…) | 25 |
| a time frame for hitting it | 15 |

Signals add up to 100.

### Acceptance criteria

**Weight 10.** Acceptance criteria are the contract between PM, design, engineering and QA. Without them, “done” is whatever the loudest person remembers.

| Signal | Points |
|---|---:|
| Given / When / Then style behaviour | 20 |
| an Acceptance Criteria section | 30 |
| testable wording (must, only, at least, within…) | 25 |
| a checklist or numbered requirements | 25 |
| stated behaviour for a condition (if X, show or return Y) | 15 |

Signals add up to 115; the category score is capped at 100.

### Risks

**Weight 7.** Every plan has failure modes. Naming them early is cheap; discovering them in production, or in legal review the week before launch, is not.

| Signal | Points |
|---|---:|
| named risks or concerns | 40 |
| stated assumptions | 20 |
| mitigation or rollback plans | 20 |
| security, privacy, legal or abuse considerations | 20 |

Signals add up to 100.

### Edge cases

**Weight 6.** Most production bugs and support tickets live off the happy path. Edge cases decide whether engineering estimates are real.

| Signal | Points |
|---|---:|
| edge cases or failure handling | 45 |
| non-happy-path states (empty, loading, expired…) | 25 |
| limits and boundaries (max, locale, accessibility…) | 30 |

Signals add up to 100.

### Dependencies

**Weight 5.** Features slip because of what they wait on, not what they build. Unowned dependencies are the most common cause of surprise delays.

| Signal | Points |
|---|---:|
| named dependencies or integrations | 40 |
| owning teams | 25 |
| handoff, lead time or sequencing | 15 |
| specific systems or services | 20 |

Signals add up to 100.

### Prioritization

**Weight 6.** When everything is a must-have, nothing is. Ranked requirements are what let the team cut scope calmly when the schedule slips.

| Signal | Points |
|---|---:|
| priority labels (P0/P1, must/should/could) | 40 |
| a prioritisation rationale (impact, effort, RICE…) | 30 |
| sequencing (v1/v2, now/next/later) | 30 |

Signals add up to 100.

### Experiment design

**Weight 6.** A PRD without a test plan is a belief. An experiment turns it into a decision you can defend and reverse.

| Signal | Points |
|---|---:|
| an experiment, pilot or staged rollout | 40 |
| sample size, duration or significance | 30 |
| decision criteria (ship / kill / guardrail) | 30 |

Signals add up to 100.

## What the score does not mean

It checks structure and specifics, not whether the idea is good, true or well researched. A section can look complete and still say nothing useful, and a PRD written to the rubric can score well. Patterns are English only. See [calibration.md](calibration.md) for how the scoring was checked against real documents and where it is least tested.
