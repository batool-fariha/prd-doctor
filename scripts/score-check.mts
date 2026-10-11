/**
 * Scoring regression check. Run: node --experimental-strip-types scripts/score-check.mts
 * Each sample has the overall range a careful reviewer would accept. Add real PRDs here as you tune
 * (keep confidential ones out of the repo: pass a file path as an extra argument to see its breakdown).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { analyzePRD } from "../lib/analyzer.ts";

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
  for (const c of r.categories) console.log(`  ${c.label.padEnd(22)} ${String(c.score).padStart(3)} [${c.status}]  ${c.quote ? `(${c.quote.kind}) ${c.quote.text.slice(0, 70)}` : "no mention"}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
