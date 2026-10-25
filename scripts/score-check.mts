/**
 * Scoring regression check. Run: node --experimental-strip-types scripts/score-check.mts
 * Each sample has the overall range a careful reviewer would accept. Add real PRDs here as you tune
 * (keep confidential ones out of the repo: pass a file path as an extra argument to see its breakdown).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { analyzePRD, looksNotEnglish } from "../lib/analyzer.ts";
import { EXAMPLES } from "../lib/examples.ts";

const SAMPLES: { name: string; text: string; overall: [number, number]; expect?: Record<string, [number, number]> }[] = [
  {
    name: "vague draft",
    overall: [0, 12],
    text: `# Smart Dashboard
We want to build a smart dashboard that is fast and easy to use for everyone. It should look modern and be better than what we have. Engineering will build it next quarter and it should have charts, filters, and export. Let's make it seamless and intuitive for all users.`,
  },
  {
    name: "short but specific",
    overall: [45, 65],
    expect: { problem: [80, 100], metrics: [80, 100], risks: [0, 15], edge: [0, 15] },
    text: `# Saved Filters for Reports
Problem: Support managers struggle to re-create the same report filters every morning because filters reset on each visit. In 6 of 9 interviews last month, managers said they spend about 10 minutes a day rebuilding them.
Users: Support managers at mid-size teams (20-100 agents).
Goals: Let users save and reuse filters. Out of scope: sharing filters between users.
Success metrics: Reduce time to first report from 10 minutes to 2 minutes within 60 days of launch.
Acceptance criteria: Given a saved filter, when the manager opens Reports, then the filter is applied automatically.
Dependencies: Requires the Reports API from the platform team.`,
  },
  {
    name: "placeholders are not content",
    overall: [45, 65],
    expect: { risks: [0, 15], edge: [0, 15], experiment: [0, 15] },
    text: `# Saved Filters for Reports
Problem: Support managers struggle to re-create the same report filters every morning because filters reset on each visit. In 6 of 9 interviews last month, managers said they spend about 10 minutes a day rebuilding them.
Users: Support managers at mid-size teams (20-100 agents).
Goals: Let users save and reuse filters. Out of scope: sharing filters between users.
Success metrics: Reduce time to first report from 10 minutes to 2 minutes within 60 days of launch.
Acceptance criteria: Given a saved filter, when the manager opens Reports, then the filter is applied automatically.
Dependencies: Requires the Reports API from the platform team.
Risks: none
## Edge cases
TBD
## Experiment
N/A`,
  },
  {
    name: "numbered markdown headings",
    overall: [30, 80],
    expect: { metrics: [50, 100], risks: [50, 100], scope: [50, 100] },
    text: `# Export to CSV
## 1. Overview
Admins struggle to get report data into spreadsheets because there is no export, which costs them about 2 hours a week.
## 2. Target Users
Account admins at companies with 50 to 500 seats.
## 3. Goals and Non-goals
### Goals
* Let admins export any report to CSV.
### Non-goals
The first release will not attempt to:
* Schedule recurring exports.
* Export to Excel.
## 4. Success Metrics
* Reduce admin time on reporting from 2 hours to 30 minutes per week within 90 days.
## 5. Risks
* Large exports may time out. Mitigation: cap at 50,000 rows and email a link.`,
  },
  ...EXAMPLES.map((e) => ({ name: `example: ${e.label}`, overall: e.range, text: e.text })),
  {
    name: "messy: chat message with no structure",
    text: "hey team, so we've been getting a lot of complaints about search. users say they can't find stuff. I think we should rebuild search with elasticsearch. Mike says it'll take 3 months but I think we can do it in 6 weeks if we cut some corners. the main thing is that search should be fast and relevant. we should also add filters and maybe autocomplete. design is working on mocks. let's aim for end of Q2. need to check with infra on whether we have capacity. also not sure if legal needs to look at the data retention part. we'll figure out metrics later but obviously we want people to find things easier. thoughts?",
    overall: [5, 25],
  },
  {
    name: "messy: flat feature list",
    text: "Search v2\n\n- better search\n- faster\n- filters (date, type, owner)\n- autocomplete\n- typo tolerance\n- mobile support\n- admin controls\n- analytics dashboard\n- export results\n- saved searches\n- API for partners\n- dark mode\n\nTimeline: Q2\nOwner: Priya\nStatus: draft",
    overall: [5, 25],
    expect: {"priority": [0, 35]},
  },
  {
    name: "messy: buzzword pitch",
    text: "# Vision: The Future of Search\n\nSearch is broken. Everyone knows it. Our users deserve a world-class, seamless, best-in-class experience that delights and wows them every single day. We will leverage cutting-edge AI to revolutionize how people find information, creating a delightful, intuitive, powerful platform that scales.\n\n## Why Now\nThe market is huge and growing. Competitors are moving fast and we must be the leader. This is a massive opportunity to disrupt the industry and capture significant value.\n\n## What We'll Build\nA next-generation, AI-powered, seamless search experience that is fast, accurate, and beautiful. It will be easy to use and users will love it.\n\n## Success\nUsers will be happy and engagement will go up significantly. We'll know we succeeded when the business sees great results.",
    overall: [3, 22],
  },
  {
    name: "messy: specific prose with no headings",
    text: "Search relevance project notes\n\nLast quarter 38% of support tickets (412 of 1,084) mentioned \"can't find\". In interviews with 9 customers, 7 said they gave up after two tries and asked a coworker instead; one admin said she keeps a personal spreadsheet of links because search returns the wrong version of the doc. Median time to first click is 14 seconds, against 6 for the next closest tool we benchmarked.\n\nWe're building a relevance rewrite for workspace admins and members of teams over 20 people. Not building: federated search across third-party tools, or mobile in this phase. We want first-result click-through up from 41% to 55% by end of Q3, measured weekly in the analytics warehouse, with the zero-result rate under 5%.\n\nSearch must return in under 300ms at p95 for workspaces under 50k docs. If a query has zero results, show spelling suggestions and the 3 most recent docs. If the index is stale by more than 10 minutes, show a banner rather than silently serving old results.\n\nBiggest risk is reindex load on the primary database; Dana owns a load test before launch, and we can roll back by flag. Depends on infra adding two nodes by May 12 and legal signing off the retention change. We'll ship to 10% of workspaces first and compare click-through against the holdout.",
    overall: [50, 80],
    expect: {"criteria": [15, 100], "edge": [50, 100], "evidence": [60, 100]},
  },
];

let failed = 0;
const check = (label: string, v: number, [lo, hi]: [number, number]) => {
  const ok = v >= lo && v <= hi;
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label.padEnd(24)} ${String(v).padStart(3)}   expected ${lo}-${hi}`);
};

for (const s of SAMPLES) {
  const r = analyzePRD(s.text);
  console.log(`\n${s.name}`);
  check("overall", r.overall, s.overall);
  for (const [id, range] of Object.entries(s.expect ?? {})) check(id, r.categories.find((c) => c.id === id)!.score, range);
}

// Private calibration set: scripts/private/<name>.expect-<score>.md (git-ignored; may hold confidential real PRDs).
// Each is checked against the overall score the author gave it, within +/- TOLERANCE.
const TOLERANCE = 5;
const privateDir = new URL("./private/", import.meta.url);
if (existsSync(privateDir)) {
  console.log("\nreal PRDs (author's own score)");
  for (const f of readdirSync(privateDir).filter((n) => /\.expect-\d+\.(md|txt)$/.test(n))) {
    const expected = Number(f.match(/\.expect-(\d+)\./)![1]);
    const r = analyzePRD(readFileSync(new URL(f, privateDir), "utf8"));
    check(f.replace(/\.expect-\d+\.(md|txt)$/, ""), r.overall, [expected - TOLERANCE, expected + TOLERANCE]);
  }
}

// Optional: breakdown for any file you pass in, e.g. a confidential PRD you don't want in the repo.
for (const file of process.argv.slice(2)) {
  const r = analyzePRD(readFileSync(file, "utf8"));
  console.log(`\n${file}\n  overall ${r.overall}`);
  for (const c of r.categories) {
    console.log(`  ${c.label.padEnd(22)} ${String(c.score).padStart(3)} [${c.status}]  ${c.quote ? `(${c.quote.kind}) ${c.quote.text.slice(0, 70)}` : "no mention"}`);
    if (process.env.VERBOSE) console.log(`      found: ${c.found.join("; ") || "-"}\n      missing: ${c.missing.join("; ") || "-"}`);
  }
}

// Non-English text should be flagged; English prose (even terse) should not.
{
  const flag = (label: string, got: boolean, want: boolean) => { if (got === want) console.log(`  ok   ${label.padEnd(24)} ${got ? "flagged" : "not flagged"}`); else { failed++; console.log(`  FAIL ${label}: ${got ? "flagged" : "not flagged"}, wanted ${want ? "flagged" : "not flagged"}`); } };
  console.log("\nlanguage check");
  flag("French", looksNotEnglish("Problème: les utilisateurs abandonnent le processus d'inscription parce que le formulaire est trop long et que les étapes ne sont pas claires. Objectif: réduire le taux d'abandon de vingt pour cent d'ici le troisième trimestre. Les utilisateurs cibles sont les petites entreprises qui ont besoin de créer un compte rapidement sans aide du support. Risques: la charge sur le serveur pourrait augmenter pendant les périodes de pointe et nous devons prévoir un plan de retour arrière."), true);
  flag("Spanish", looksNotEnglish("Problema: los usuarios abandonan el proceso de registro porque el formulario es demasiado largo y los pasos no están claros. Objetivo: reducir la tasa de abandono en un veinte por ciento para el tercer trimestre. Los usuarios objetivo son las pequeñas empresas que necesitan crear una cuenta rápidamente sin ayuda del soporte. Riesgos: la carga del servidor podría aumentar en los periodos pico y debemos preparar un plan de reversión."), true);
  flag("terse English bullets", looksNotEnglish("- Reduce signup drop-off 20%\n- Target: SMB admins\n- Metric: completion rate, baseline 62%\n- Risks: server load, rollback via flag\n- Out of scope: SSO, billing\n- Owner: Sam, ship Q3\n- Acceptance: form under 3 steps, errors inline, works on mobile\n- Dependencies: auth team API, design review, legal copy sign-off, analytics events instrumented"), false);
  for (const e of EXAMPLES) flag(`example: ${e.label}`, looksNotEnglish(e.text), false);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
