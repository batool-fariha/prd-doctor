/**
 * Checks the rich-text paste converter (lib/paste.ts) against HTML shaped like what Google Docs, Notion and
 * Confluence put on the clipboard. Run: node --experimental-strip-types scripts/paste-check.mts
 * The converter needs a DOM, so this borrows linkedom's parser instead of a browser.
 */
import { DOMParser } from "linkedom";
(globalThis as unknown as { DOMParser: unknown }).DOMParser = DOMParser;
const { htmlToText } = await import("../lib/paste.ts");

let failed = 0;
const check = (name: string, fragment: string, expected: string | null) => {
  // A browser always builds <html><body> around a clipboard fragment; linkedom does not, so do it here.
  const got = htmlToText(`<!doctype html><html><body>${fragment}</body></html>`);
  if (got === expected) console.log(`  ok   ${name}`);
  else {
    failed++;
    console.log(`  FAIL ${name}\n       wanted ${JSON.stringify(expected)}\n       got    ${JSON.stringify(got)}`);
  }
};

console.log("paste converter");

check(
  "Google Docs: heading, paragraph, nested list, table",
  `<meta charset='utf-8'><b style="font-weight:normal;" id="docs-internal-guid-1"><h1 dir="ltr"><span>Problem</span></h1><p dir="ltr"><span>Users abandon onboarding.</span></p><ul><li dir="ltr"><p dir="ltr"><span>Step one</span></p></li><li><p><span>Step two</span></p><ul><li><p><span>Nested</span></p></li></ul></li></ul><div dir="ltr"><table><tbody><tr><td><p><span>Metric</span></p></td><td><p><span>Target</span></p></td></tr><tr><td><p>Activation</p></td><td><p>40%</p></td></tr></tbody></table></div></b>`,
  "\n# Problem\nUsers abandon onboarding.\n- Step one\n- Step two\n  - Nested\nMetric | Target\nActivation | 40%",
);

check(
  "Notion: heading, nested bullets, to-do",
  `<div><h2>Goals</h2><ul><li>Reduce churn<ul><li>by 10%</li></ul></li></ul><p>Plain para</p><ul class="to-do"><li>[ ] Ship beta</li></ul></div>`,
  "\n## Goals\n- Reduce churn\n  - by 10%\nPlain para\n- [ ] Ship beta",
);

// Regression: a soft line break used to vanish, fusing "Problem" and the next line into one word.
check(
  "soft line breaks stay line breaks",
  `<p>Problem<br>Users leave early<br><br>Goals<br>Cut churn</p><ul><li>one</li></ul>`,
  "Problem\nUsers leave early\nGoals\nCut churn\n- one",
);

// Regression: a list inside a table cell was emitted twice (once in the row, once as its own bullet).
check(
  "list inside a table cell is not duplicated",
  `<div><h2>Risks</h2><table><tr><th>Risk</th><th>Owner</th></tr><tr><td>Latency <ul><li>p95 over 2s</li></ul></td><td>Sam</td></tr></table></div>`,
  "\n## Risks\nRisk | Owner\nLatency p95 over 2s | Sam",
);

check("no headings or lists: left to plain text paste", `<div>Problem</div><div>Users leave.</div>`, null);

check(
  "nothing from the HTML is executed or kept",
  `<h2>Scope</h2><p>Keep this</p><script>window.pwned = 1</script><img src=x onerror="window.pwned=1"><ul><li>item</li></ul>`,
  "\n## Scope\nKeep this\n- item",
);

console.log(failed ? `\n${failed} check(s) failed` : "\nall paste checks passed");
process.exit(failed ? 1 : 0);
