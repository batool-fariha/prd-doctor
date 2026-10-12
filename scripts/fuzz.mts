/**
 * Robustness check: hostile inputs must never throw, never leave 0-100, and stay fast.
 * Run: node --experimental-strip-types scripts/fuzz.mts
 */
import { analyzePRD } from "../lib/analyzer.ts";

const words = ["the", "user", "must", "risk", "given", "when", "then", "p1", "metric", "goal:", "##", "- ", "\n", "1.", "TBD", "none"];
const rnd = (n: number) => Array.from({ length: n }, () => words[Math.floor(Math.random() * words.length)]).join(" ");

const cases: Record<string, string> = {
  empty: "", spaces: " \n\t  \n ", oneChar: "a",
  random60k: rnd(12000).slice(0, 60000),
  gwtRepeat: "given when then ".repeat(3750),
  givenOnly: "given ".repeat(10000),
  oneLongToken: "a".repeat(60000),
  colons: "a: ".repeat(20000),
  headings: Array.from({ length: 3000 }, (_, i) => `## Risks ${i}\nTBD`).join("\n"),
  numberedHeadings: Array.from({ length: 3000 }, (_, i) => `## ${i}. Success Metrics\n* item`).join("\n"),
  bullets: Array.from({ length: 5000 }, (_, i) => `- item ${i} must be done within 3 days`).join("\n"),
  crlf: "Problem: users struggle.\r\nGoals: ship it.\r\n".repeat(2000),
  emojiRtl: "مشكلة المستخدم 😀 ".repeat(3000) + "בעיה ".repeat(3000),
  emojiHeadings: "## 🎯 Goal\ntext here for the goal\n## ⚠️ Risks\nTBD\n".repeat(3000),
  nulls: "Problem\u0000: x\u0000 ".repeat(5000),
  table: "| a | b |\n|---|---|\n".repeat(4000),
  nestedStars: "**".repeat(20000),
  hashes: "#".repeat(60000),
  dashes: "- ".repeat(30000),
  longLine: "Sentence one. Sentence Two! Is it? Yes: no; maybe, ".repeat(1200),
};

let bad = 0, worst = 0;
for (const [name, t] of Object.entries(cases)) {
  const t0 = performance.now();
  try {
    const r = analyzePRD(t);
    const ms = performance.now() - t0;
    worst = Math.max(worst, ms);
    const ok = r.overall >= 0 && r.overall <= 100 && r.categories.length === 12 && r.categories.every((c) => Number.isFinite(c.score) && c.score >= 0 && c.score <= 100);
    if (!ok || ms > 1000) bad++;
    console.log(`${ok && ms <= 1000 ? "ok  " : "FAIL"} ${name.padEnd(18)} ${String(t.length).padStart(7)} chars ${ms.toFixed(0).padStart(5)} ms  score ${r.overall}`);
  } catch (e) {
    bad++;
    console.log(`FAIL ${name.padEnd(18)} threw: ${(e as Error).message}`);
  }
}
console.log(bad ? `\n${bad} case(s) failed` : `\nall ${Object.keys(cases).length} cases ok, worst ${worst.toFixed(0)} ms`);
process.exit(bad ? 1 : 0);
