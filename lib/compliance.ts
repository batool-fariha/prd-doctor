/**
 * Optional compliance check for PRDs in regulated areas (health, finance and similar).
 *
 * It is a separate score: it never changes the 0-100 total or the 12 standard categories, so scores stay
 * comparable between teams that turn it on and teams that don't. Same approach as the main rubric: weighted
 * signals found in the PRD's own sentences, with the sentence quoted as evidence. It checks that the PRD
 * covers these topics, not that the product is compliant.
 */
export interface ComplianceSignal { id: string; label: string; weight: number; test: RegExp; add: string }
export interface ComplianceResult {
  score: number; // 0-100
  found: { id: string; label: string; quote: string }[];
  missing: { id: string; label: string; add: string }[];
}

export const COMPLIANCE_SIGNALS: ComplianceSignal[] = [
  {
    id: "data",
    label: "how sensitive data is handled",
    weight: 25,
    test: /\b(PII|PHI|personal (data|information)|health (data|information)|sensitive data|cardholder data|data (retention|minimi[sz]ation|classification|residency)|retain\w*|encrypt\w*|anonymi[sz]\w*|pseudonymi[sz]\w*|de-?identif\w*|access control|least privilege|consent)\b/i,
    add: "Say what sensitive data the feature touches (for example PHI or card data), where it is stored, who can access it, how long it is kept, and whether it is encrypted.",
  },
  {
    id: "audit",
    label: "an audit trail",
    weight: 20,
    test: /\b(audit (log|logs|trail|trails|logging|history)|audit\w* (who|what|when)|change (log|history)|immutable log|tamper-?(proof|evident)|traceab\w+|record (of )?(who|every))\b/i,
    add: "Say what is logged for audit (who did what, to which record, and when), where the log is kept, and for how long.",
  },
  {
    id: "framework",
    label: "the regulations or standards that apply",
    weight: 20,
    test: /\b(HIPAA|HITECH|GDPR|UK GDPR|CCPA|CPRA|SOC ?2|PCI(-| )?DSS|PCI|SOX|GLBA|FINRA|KYC|AML|PSD2|FDA|21 CFR|IEC 62304|ISO ?(27001|13485|14971)|MDR|IVDR|CE mark\w*|FedRAMP|DORA|NIS2|COPPA|FERPA)\b/i,
    add: "Name the regulations or standards in scope (for example HIPAA, GDPR, PCI DSS or SOC 2), or say explicitly that none apply and why.",
  },
  {
    id: "signoff",
    label: "regulatory or legal sign-off",
    weight: 25,
    test: /\b((legal|compliance|privacy|regulatory|security|risk|quality) (team |)(review|sign-?off|approval|approves?|signs? off)|(sign-?off|approval) (from|by) (legal|compliance|privacy|regulatory|security|the DPO|QA\/RA)|DPO|DPIA|PIA|privacy impact|risk assessment|threat model\w*)\b/i,
    add: "Say who must sign off before launch (legal, compliance, privacy or the DPO), what they review (for example a DPIA or risk assessment), and at which milestone.",
  },
  {
    id: "incident",
    label: "breach or incident handling",
    weight: 10,
    test: /\b(breach\w*|incident (response|process|plan|handling)|notify (users|customers|patients|regulators|the regulator)|notification (deadline|window|obligation)|reporting obligation\w*|72 hours)\b/i,
    add: "Say what happens if data is exposed or the feature fails in a regulated way: who is notified, by when, and who owns the response.",
  },
];

const split = (text: string) =>
  text.split(/\n+|(?<=[.!?])\s+(?=[A-Z“"(\[])/).map((s) => s.replace(/^\s*(#+|[-*•]|\d+[.)])\s*/, "").trim()).filter((s) => s.length >= 8);

const clip = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

/** Scores the PRD text against the compliance signals. Headings alone don't count: a signal needs a sentence. */
export function analyzeCompliance(text: string): ComplianceResult {
  const body = text.split("\n").filter((l) => !/^\s*#{1,6}\s/.test(l)).join("\n");
  const units = split(body).filter((u) => u.split(/\s+/).length >= 3);
  const found: ComplianceResult["found"] = [], missing: ComplianceResult["missing"] = [];
  let score = 0;
  for (const sg of COMPLIANCE_SIGNALS) {
    const hit = units.find((u) => sg.test.test(u));
    if (hit) { score += sg.weight; found.push({ id: sg.id, label: sg.label, quote: clip(hit) }); }
    else missing.push({ id: sg.id, label: sg.label, add: sg.add });
  }
  return { score, found, missing };
}
