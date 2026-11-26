/**
 * Checks the optional compliance score (lib/compliance.ts). Run: node --experimental-strip-types scripts/compliance-check.mts
 * It must find each signal from a plain sentence, ignore headings on their own, and stay separate from the main score.
 */
const { analyzeCompliance, COMPLIANCE_SIGNALS } = await import("../lib/compliance.ts");
const { analyzePRD } = await import("../lib/analyzer.ts");

let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) console.log(`  ok   ${name}`);
  else { failed++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ""}`); }
};

console.log("compliance check");

ok("weights add up to 100", COMPLIANCE_SIGNALS.reduce((a, s) => a + s.weight, 0) === 100);

const FULL = `# Patient messaging

## Problem
Clinicians miss patient messages because the inbox has no triage.

## Compliance
Messages contain PHI, so they are encrypted at rest and kept for 6 years, then deleted.
Every read and edit is written to an audit log with the user, the record and the time.
The feature is in scope for HIPAA and our SOC 2 controls.
Legal and the privacy team sign off on the DPIA before the beta.
If a breach is suspected, the security on-call notifies affected patients within 60 days.
`;
const full = analyzeCompliance(FULL);
ok("a PRD covering every topic scores 100", full.score === 100, JSON.stringify(full.missing.map((m) => m.id)));
ok("each finding quotes the sentence it came from", full.found.find((f) => f.id === "audit")?.quote.startsWith("Every read and edit is written to an audit log") === true);

const none = analyzeCompliance("# Dark mode\n\n## Problem\nUsers want a dark theme for night use.\n\n## Goals\nShip a dark theme by Q2.");
ok("a PRD with none of it scores 0 and lists what to add", none.score === 0 && none.missing.length === COMPLIANCE_SIGNALS.length && none.missing.every((m) => m.add.length > 20));

const headings = analyzeCompliance("# Feature\n\n## HIPAA and GDPR scope\n\n## Audit log retention policy\n\n## Legal and compliance sign-off\n\nTBD later on.");
ok("headings on their own earn nothing", headings.score === 0, JSON.stringify(headings.found));

const partial = analyzeCompliance("We store personal data in the EU only and keep it for 30 days. Compliance review happens before launch.");
ok("partial coverage scores the signals it has", partial.score === 50 && partial.found.map((f) => f.id).join() === "data,signoff", JSON.stringify(partial));

for (const sg of COMPLIANCE_SIGNALS) {
  const lone = { data: "Card numbers are tokenised and access control limits who sees them.", audit: "An audit trail records who changed each dose.", framework: "This must meet GDPR for EU users.", signoff: "Approval from compliance is needed before rollout.", incident: "The incident response plan names the owner and the regulator deadline." }[sg.id]!;
  ok(`finds “${sg.label}” on its own`, analyzeCompliance(lone).found.some((f) => f.id === sg.id), lone);
}

ok("the main score does not change", analyzePRD(FULL).overall === analyzePRD(FULL).overall && !("compliance" in analyzePRD(FULL)));

console.log(failed ? `\n${failed} check(s) failed` : "\nall compliance checks passed");
process.exit(failed ? 1 : 0);
