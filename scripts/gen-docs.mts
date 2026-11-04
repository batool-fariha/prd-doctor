/**
 * Generates docs/scoring.md from the live rubric in lib/analyzer.ts, so the reference cannot drift from the code.
 *   node --experimental-strip-types scripts/gen-docs.mts          write docs/scoring.md
 *   node --experimental-strip-types scripts/gen-docs.mts --check  fail if docs/scoring.md is out of date (used by `npm test`)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { RUBRIC_SUMMARY, MIN_WORDS } from "../lib/analyzer.ts";

const out = new URL("../docs/scoring.md", import.meta.url);
// lib/validate.ts uses bundler-style imports that plain Node cannot load, so read the one constant it exports from its source.
const maxChars = Number(/MAX_CHARS\s*=\s*([\d_]+)/.exec(readFileSync(new URL("../lib/validate.ts", import.meta.url), "utf8"))?.[1]?.replace(/_/g, ""));
if (!Number.isFinite(maxChars)) throw new Error("Could not read MAX_CHARS from lib/validate.ts");

const total = RUBRIC_SUMMARY.reduce((n, r) => n + r.weight, 0);
if (total !== 100) throw new Error(`Category weights add up to ${total}, expected 100`);

const lines: string[] = [];
const add = (...l: string[]) => lines.push(...l);

add(
  "# Scoring reference",
  "",
  "> This file is generated from `RUBRICS` in [`lib/analyzer.ts`](../lib/analyzer.ts) by `npm run docs`. Do not edit it by hand: CI fails if it is out of date. The live version of the same table is on the site at [/how-scoring-works](https://prd-doctor.vercel.app/how-scoring-works).",
  "",
  "PRD Doctor scores a document across twelve categories. Each category is scored 0 to 100, and the overall score is the weighted sum:",
  "",
  "```",
  "overall = Σ (category score × weight / 100)",
  "```",
  "",
  `Weights add up to ${total}. Input must be at least ${MIN_WORDS} words and at most ${maxChars.toLocaleString("en-US")} characters.`,
  "",
  "## Categories at a glance",
  "",
  "| Category | Weight | Signals |",
  "|---|---:|---:|",
  ...RUBRIC_SUMMARY.map((r) => `| [${r.label}](#${r.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}) | ${r.weight} | ${r.signals.length} |`),
  "",
  "A category's score is the sum of the weights of the signals found in it, plus a small bonus for specifics (numbers, named owners) where they matter, minus penalties for vague wording, generic users and placeholder sections. The result is clamped to 0 to 100.",
  "",
  "Status per category: **strong** is 70 and above, **ok** is 40 to 69, **weak** is below 40.",
  "",
  "## How a document is read",
  "",
  "- **Section-aware.** The text is split into sections (`# Heading`, numbered headings, `**Bold**`, `Label:` lines, or a plain standalone line such as `Risks`). A section with real content under it earns its category's headline signal. Front matter such as Version, Status and Owner is ignored.",
  "- **Placeholders do not count.** `Risks: none`, `TBD`, `N/A` and empty headings are detected and capped at 15 for that category.",
  "- **One sentence cannot pay everywhere.** A sentence earns credit in at most four categories, with the section it sits in considered first.",
  "- **Plans are not evidence.** A planned interview or an example query does not count as proof of the problem. Experiment and prioritization credit comes only from the PRD's own plan sections, never from a product description that merely uses the words.",
  "- **Vague words cost points.** Words such as \"fast\", \"seamless\" and \"better\" are penalised in Success metrics and Acceptance criteria, and \"everyone\" is penalised under Target user clarity.",
  "- **Specifics are rewarded.** Numbers and named owners add a bonus in the categories where they matter.",
  "",
  "## Top weaknesses",
  "",
  "The weaknesses shown first are ranked by points lost, `(100 − score) × weight`, so a missing success metric outranks a missing dependency list. Only categories below 70 are listed as things to fix.",
  "",
  "## Category rubrics",
  "",
);

for (const r of RUBRIC_SUMMARY) {
  const signalTotal = r.signals.reduce((n, s) => n + s.weight, 0);
  add(
    `### ${r.label}`,
    "",
    `**Weight ${r.weight}.** ${r.why}`,
    "",
    "| Signal | Points |",
    "|---|---:|",
    ...r.signals.map((s) => `| ${s.label} | ${s.weight} |`),
    "",
    signalTotal > 100 ? `Signals add up to ${signalTotal}; the category score is capped at 100.` : `Signals add up to ${signalTotal}.`,
    "",
  );
}

add(
  "## What the score does not mean",
  "",
  "It checks structure and specifics, not whether the idea is good, true or well researched. A section can look complete and still say nothing useful, and a PRD written to the rubric can score well. Patterns are English only. See [calibration.md](calibration.md) for how the scoring was checked against real documents and where it is least tested.",
  "",
);

const text = lines.join("\n");

if (process.argv.includes("--check")) {
  const current = existsSync(out) ? readFileSync(out, "utf8") : "";
  if (current !== text) {
    console.error("docs/scoring.md is out of date. Run `npm run docs` and commit the result.");
    process.exit(1);
  }
  console.log("docs/scoring.md is up to date");
} else {
  mkdirSync(new URL("../docs/", import.meta.url), { recursive: true });
  writeFileSync(out, text);
  console.log("wrote docs/scoring.md");
}
