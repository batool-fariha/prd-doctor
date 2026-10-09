/**
 * PRD Doctor analysis engine.
 *
 * Deterministic and transparent: each category is a rubric of "signals"
 * (regex patterns with weights). A category's score is the sum of the weights
 * of the signals found in the text. Every finding quotes the user's own
 * sentences; nothing is generated that isn't either (a) a quote from the PRD or
 * (b) a clearly bracketed [placeholder] for the PM to fill in.
 */

export type CategoryId =
  | "problem"
  | "user"
  | "evidence"
  | "pain"
  | "scope"
  | "metrics"
  | "criteria"
  | "risks"
  | "edge"
  | "deps"
  | "priority"
  | "experiment";

export type Status = "strong" | "ok" | "weak";

export interface Quote {
  text: string;
  /** found = sentence that satisfies part of the rubric; anchor = nearest context; vague = flagged fuzzy wording */
  kind: "found" | "anchor" | "vague";
}

export interface CategoryResult {
  id: CategoryId;
  label: string;
  weight: number;
  score: number; // 0-100
  status: Status;
  found: string[]; // signal labels detected
  missing: string[]; // signal labels not detected
  quote: Quote | null;
  why: string;
  add: string;
  question: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: number;
  overall: number;
  words: number;
  categories: CategoryResult[];
  weakest: CategoryId[]; // top 3 by weighted points lost
  strongest: CategoryId;
  rewrite: string;
}

interface Signal {
  label: string;
  weight: number;
  test: RegExp;
  /** minimum number of distinct matching lines/sentences required */
  min?: number;
}

interface Rubric {
  id: CategoryId;
  label: string;
  weight: number;
  signals: Signal[];
  why: string;
  /** {q} is replaced with the quoted PRD sentence (or a generic stand-in) */
  add: string;
  question: string;
  rewriteHeading: string;
  rewriteFill: string;
}

const RUBRICS: Rubric[] = [
  {
    id: "problem",
    label: "Problem clarity",
    weight: 12,
    signals: [
      { label: "an explicit problem statement", weight: 25, test: /\b(problem|pain ?points?|struggl\w+|challenges?|frustrat\w+|difficult\w*|unable|can't|cannot|lack\w*|fail\w*|friction|broken)\b/i },
      { label: "a cause (why the problem exists)", weight: 20, test: /\b(because|due to|as a result|root cause|which (causes|leads)|results? in)\b/i },
      { label: "a Problem / Background / Context section", weight: 20, test: /^\s*(#+\s*|\*\*)?(problem|background|context|overview|motivation|why)\b/im },
      { label: "the situation in which it happens", weight: 15, test: /\b(when|while|during|whenever|every time)\b/i },
      { label: "the cost of leaving it unsolved", weight: 20, test: /\b(cost\w*|los(e|ing|s)|waste\w*|churn\w*|drop\w*|abandon\w*|slow\w*|hours|minutes)\b/i },
    ],
    why: "A PRD that starts from a solution can't be challenged, prioritised or measured. The problem statement is what the team returns to when scope and trade-offs get argued.",
    add: "Add a 2-3 sentence problem statement: who is blocked, in what situation, why it happens, and what it costs. Rewrite {q} as a problem, not a feature.",
    question: "If we shipped nothing, what specifically would keep going wrong, and for whom?",
    rewriteHeading: "Problem",
    rewriteFill: "[Who] is unable to [task] when [situation] because [cause], which costs [impact].",
  },
  {
    id: "user",
    label: "Target user clarity",
    weight: 10,
    signals: [
      { label: "a named user segment or persona", weight: 30, test: /\b(personas?|segments?|target (users?|customers?|audience)|ICP|user types?|admins?|managers?|developers?|engineers?|designers?|marketers?|founders?|buyers?|students?|teachers?|patients?|shoppers?|merchants?|sellers?|drivers?|product managers?|customer success|sales reps?|SMBs?|enterprise)\b/i },
      { label: "a Users / Persona / Audience section", weight: 20, test: /^\s*(#+\s*|\*\*)?(users?|personas?|audience|target|who)\b/im },
      { label: "what the user is trying to get done", weight: 20, test: /\b(jobs? to be done|JTBD|workflow|trying to|wants? to|needs? to|goal is)\b/i },
      { label: "user stories (“As a …”)", weight: 15, test: /\bas an? [a-z][\w\s-]{2,40},? i (want|need|can)\b/i },
      { label: "how many of them there are", weight: 15, test: /\b\d[\d,.]*\s*(users|customers|teams|companies|accounts|merchants|sellers)\b|\d+\s?% of (our )?(users|customers|accounts)/i },
    ],
    why: "“Everyone” is not a user. Without a specific segment you can't recruit research participants, judge usability, or know whether a metric moved for the right people.",
    add: "Name one primary user segment, their role and context, and the job they're hiring this for. Tie {q} to that specific person.",
    question: "Who is the one primary user, and what would they say they were doing right before they hit this problem?",
    rewriteHeading: "Target user",
    rewriteFill: "Primary: [role/segment, size]. Secondary: [segment]. Job to be done: [job].",
  },
  {
    id: "evidence",
    label: "Evidence",
    weight: 10,
    signals: [
      { label: "a research or data source (interviews, analytics, tickets…)", weight: 35, test: /\b(interviews?|surveys?|user research|usability|customer (feedback|calls?)|support tickets?|tickets?|NPS|CSAT|analytics|data (shows?|suggests?)|we (saw|found|observed|heard)|session recordings?|a\/b|study|benchmark|competitors?)\b/i },
      { label: "specific numbers with units", weight: 30, test: /\b\d+(\.\d+)?\s?(%|percent|x\b|users|customers|tickets|interviews|respondents|hours|minutes|days)/i },
      { label: "a source reference (n=, link, report name)", weight: 15, test: /\bn\s?=\s?\d+|https?:\/\/|\b(report|dashboard|deck|doc)\b/i },
      { label: "a direct customer quote", weight: 10, test: /["“”][^"“”]{15,}["“”]/ },
      { label: "a date or time window for the data", weight: 10, test: /\b(last (week|month|quarter|year)|Q[1-4]|20\d\d)\b/i },
    ],
    why: "Opinions are cheap. Evidence is what separates a bet from a hunch and lets reviewers decide whether the problem is real before spending engineering time.",
    add: "Cite at least one source with a number: how many users/tickets/interviews, from when, and what they said. Back up {q} with it.",
    question: "What is the single strongest piece of evidence that this problem exists, and where does it come from?",
    rewriteHeading: "Evidence",
    rewriteFill: "[N] [interviews/tickets/sessions] from [date range] show [finding]. Source: [link].",
  },
  {
    id: "pain",
    label: "User pain severity",
    weight: 8,
    signals: [
      { label: "severity language (critical, blocker, costly…)", weight: 30, test: /\b(critical|severe|blockers?|blocking|major|painful|costly|urgent|top (issue|complaint|request)|churn\w*|cancel\w*)\b/i },
      { label: "how often it happens", weight: 25, test: /\b(daily|weekly|monthly|often|frequently|per (day|week|month)|every (day|week|time)|\d+\s*(times|x)\b)/i },
      { label: "a quantified impact (money, time, tickets)", weight: 30, test: /(\$\s?\d|\b\d+\s?(%|hours|minutes|tickets)\b|\b(revenue|retention|conversion)\b)/i },
      { label: "the current workaround", weight: 15, test: /\b(workaround|currently|today|manual\w*|spreadsheets?|copy.?paste|alternatives?)\b/i },
    ],
    why: "Severity decides priority. A frequent, expensive pain justifies a roadmap slot; a rare annoyance doesn't, no matter how elegant the solution.",
    add: "State how often the pain occurs, what it costs (time, money, churn) and what people do today instead. Quantify {q}.",
    question: "How often does a user hit this, and what do they do today when they do?",
    rewriteHeading: "Pain severity",
    rewriteFill: "Occurs [frequency]. Costs [time/money/churn]. Today users [workaround].",
  },
  {
    id: "scope",
    label: "Scope",
    weight: 9,
    signals: [
      { label: "goals or in-scope items", weight: 30, test: /\b(in[- ]scope|scope|goals?|objectives?|will include|must have|MVP|v1|phase 1)\b/i },
      { label: "non-goals / out-of-scope items", weight: 35, test: /\b(out of scope|non-?goals?|not in scope|not included|won't|will not|excluded|deferred|not (doing|building))\b/i },
      { label: "phases, milestones or timeline", weight: 20, test: /\b(phase|milestone|release|sprint|launch|timeline|deadline)\b/i },
      { label: "a structured list of requirements", weight: 15, test: /^\s*([-*•]|\d+[.)])\s+\S/m, min: 3 },
    ],
    why: "Unwritten non-goals become scope creep. Explicit boundaries let engineering estimate honestly and let stakeholders disagree early, on paper.",
    add: "Split requirements into In scope for v1 and Explicitly out of scope. List at least three things you are deliberately not doing, starting with anything adjacent to {q}.",
    question: "What is the smallest version that still solves the problem, and what are we explicitly not building?",
    rewriteHeading: "Scope",
    rewriteFill: "In scope (v1): [..]. Out of scope: [..]. Later: [..].",
  },
  {
    id: "metrics",
    label: "Success metrics",
    weight: 11,
    signals: [
      { label: "a named success metric / KPI", weight: 30, test: /\b(success metrics?|KPIs?|OKRs?|north star|key results?|we will measure|measured by)\b/i },
      { label: "a numeric target or baseline", weight: 30, test: /(\b\d+(\.\d+)?\s?%|\b(increase|reduce|decrease|improve|grow|lift|cut)\w*\b[^.\n]{0,40}\bby\b[^.\n]{0,15}\d|\bfrom\b[^.\n]{0,20}\d[^.\n]{0,15}\bto\b[^.\n]{0,10}\d)/i },
      { label: "a concrete metric (conversion, retention, time-to-X…)", weight: 25, test: /\b(conversion|retention|activation|engagement|NPS|CSAT|DAU|MAU|WAU|churn|time[- ]to|adoption|ARPU|CTR|completion rate|task success|latency)\b/i },
      { label: "a time frame for hitting it", weight: 15, test: /\b(within|by (end of )?(Q[1-4]|\w+ \d+)|\d+\s*(days|weeks|months)|after launch)\b/i },
    ],
    why: "If you can't say how you'll know it worked, you can't tell a win from a miss, and the launch review turns into opinion.",
    add: "Define one primary metric with a baseline, target and date, plus one guardrail metric that must not get worse. Replace {q} with something like “Increase [metric] from [baseline] to [target] within [N days] of launch.”",
    question: "Which one number would tell us in 30 days that this worked, and what is it today?",
    rewriteHeading: "Success metrics",
    rewriteFill: "Primary: [metric] from [baseline] to [target] by [date]. Guardrail: [metric] must not drop below [x].",
  },
  {
    id: "criteria",
    label: "Acceptance criteria",
    weight: 10,
    signals: [
      { label: "Given / When / Then style behaviour", weight: 35, test: /\bgiven\b[\s\S]{0,250}\bwhen\b[\s\S]{0,250}\bthen\b/i },
      { label: "an Acceptance Criteria section", weight: 25, test: /acceptance criteria|definition of done|\bDoD\b/i },
      { label: "testable wording (must, only, at least, within…)", weight: 20, test: /\b(must|shall|only|at least|at most|no more than|cannot|within \d)\b/i, min: 3 },
      { label: "a checklist or numbered requirements", weight: 20, test: /^\s*(([-*]\s*\[[ xX]\])|(\d+[.)]))\s*\S/m, min: 2 },
    ],
    why: "Acceptance criteria are the contract between PM, design, engineering and QA. Without them, “done” is whatever the loudest person remembers.",
    add: "Write 5-8 pass/fail criteria in Given/When/Then form. Convert {q} into a statement a tester could verify without asking you.",
    question: "How would QA prove this feature is done without asking you?",
    rewriteHeading: "Acceptance criteria",
    rewriteFill: "Given [state], when [action], then [observable result]. (repeat for each requirement)",
  },
  {
    id: "risks",
    label: "Risks",
    weight: 7,
    signals: [
      { label: "named risks or concerns", weight: 40, test: /\b(risks?|concerns?|uncertain\w*|unknowns?|worst case|downsides?)\b/i },
      { label: "stated assumptions", weight: 20, test: /\b(assum(e|es|ed|ption|ptions)|hypothes[ie]s)\b/i },
      { label: "mitigation or rollback plans", weight: 20, test: /\b(mitigat\w+|rollback|roll back|fallback|contingency|kill switch|feature flag)\b/i },
      { label: "security, privacy, legal or abuse considerations", weight: 20, test: /\b(privacy|security|GDPR|compliance|legal|abuse|fraud|PII|permissions?)\b/i },
    ],
    why: "Every plan has failure modes. Naming them early is cheap; discovering them in production, or in legal review the week before launch, is not.",
    add: "List the top 3 risks (technical, adoption, legal/privacy) each with likelihood, impact and a mitigation. State the assumptions that {q} depends on.",
    question: "What is the most likely way this fails, and what's our plan when it does?",
    rewriteHeading: "Risks & assumptions",
    rewriteFill: "Assumes [..]. Risk 1: [..] → mitigation [..]. Rollback: [..].",
  },
  {
    id: "edge",
    label: "Edge cases",
    weight: 6,
    signals: [
      { label: "edge cases or failure handling", weight: 45, test: /\b(edge cases?|corner cases?|errors?|fail(s|ure|ures)?|invalid|timeouts?|offline|duplicates?|race condition|rate limit\w*|concurrent|retry|retries)\b/i },
      { label: "non-happy-path states (empty, loading, expired…)", weight: 25, test: /\b(empty state|loading|zero state|first[- ]time|expired|deleted|cancel(led|ed)?)\b/i },
      { label: "limits and boundaries (max, locale, accessibility…)", weight: 30, test: /\b(max(imum)?|min(imum)?|limits?|exceed\w*|special characters|unicode|accessib\w+|locali[sz]\w+|time ?zones?|mobile)\b/i },
    ],
    why: "Most production bugs and support tickets live off the happy path. Edge cases decide whether engineering estimates are real.",
    add: "List what happens when the input is empty, huge, duplicated, unauthorised, offline, or mid-flight cancelled. Start with the flow described in {q}.",
    question: "What should the user see when this fails halfway through?",
    rewriteHeading: "Edge cases",
    rewriteFill: "Empty: [..]. Error: [..]. Limits: [..]. Permissions: [..]. Offline/timeout: [..].",
  },
  {
    id: "deps",
    label: "Dependencies",
    weight: 5,
    signals: [
      { label: "named dependencies or integrations", weight: 40, test: /\b(depend(s|ency|encies)?|blocked by|requires?|prerequisite|integrat\w+|APIs?|third[- ]party|vendor|backend|infra\w*)\b/i },
      { label: "owning teams", weight: 25, test: /\b(team|owner|DRI|engineering|design|legal|data|platform|security|support|marketing)\b/i },
      { label: "handoff, lead time or sequencing", weight: 15, test: /\b(blocked|unblock\w*|hand-?off|lead time|SLA|ETA|sequenc\w+)\b/i },
      { label: "specific systems or services", weight: 20, test: /\b(Stripe|Salesforce|Slack|Segment|Zendesk|HubSpot|Twilio|AWS|GCP|Azure|Okta|Auth0|Firebase|Postgres|Kafka|SSO|webhooks?)\b/i },
    ],
    why: "Features slip because of what they wait on, not what they build. Unowned dependencies are the most common cause of surprise delays.",
    add: "List each system, team or vendor this needs, who owns it, and by when. Check what {q} requires from others.",
    question: "What does this need from another team that we don't control?",
    rewriteHeading: "Dependencies",
    rewriteFill: "[Team/system] provides [thing] by [date] (owner: [name]).",
  },
  {
    id: "priority",
    label: "Prioritization",
    weight: 6,
    signals: [
      { label: "priority labels (P0/P1, must/should/could)", weight: 40, test: /\b(P[0-3]|MoSCoW|must[- ]have|should[- ]have|nice[- ]to[- ]have|could[- ]have|priority|prioriti[sz]\w+)\b/i },
      { label: "a prioritisation rationale (impact, effort, RICE…)", weight: 30, test: /\b(RICE|ICE|impact|effort|ROI|trade-?offs?|Kano|opportunity cost)\b/i },
      { label: "sequencing (v1/v2, now/next/later)", weight: 30, test: /\b(phase \d|v1|v2|MVP|roadmap|now\/next\/later|fast follow)\b/i },
    ],
    why: "When everything is a must-have, nothing is. Ranked requirements are what let the team cut scope calmly when the schedule slips.",
    add: "Label every requirement P0/P1/P2 and give a one-line reason for the P0s. Rank the items around {q}.",
    question: "If we had to ship half of this, which half?",
    rewriteHeading: "Prioritization",
    rewriteFill: "P0: [..] because [..]. P1: [..]. P2: [..].",
  },
  {
    id: "experiment",
    label: "Experiment design",
    weight: 6,
    signals: [
      { label: "an experiment, pilot or staged rollout", weight: 40, test: /\b(experiments?|A\/B|split test|hypothesis|control|variant|treatment|holdout|pilot|beta|rollout|canary|feature flag)\b/i },
      { label: "sample size, duration or significance", weight: 30, test: /\b(sample size|statistical\w*|significan\w+|confidence|power|MDE|p-?value|run for|\d+\s*(weeks|days))\b/i },
      { label: "decision criteria (ship / kill / guardrail)", weight: 30, test: /\b(ship if|kill|success criteria|go\/no-go|guardrail|stop (if|when)|decision rule)\b/i },
    ],
    why: "A PRD without a test plan is a belief. An experiment turns it into a decision you can defend and reverse.",
    add: "State the hypothesis (“We believe X will cause Y for Z”), who sees the variant, how long it runs, and the threshold at which you ship, iterate or kill. Test the claim in {q}.",
    question: "What result would make us kill this?",
    rewriteHeading: "Experiment design",
    rewriteFill: "We believe [change] will [effect] for [segment]. Run [N] weeks on [x]% traffic. Ship if [metric ≥ target]; kill if [guardrail breached].",
  },
];

// ---------- text helpers ----------

const VAGUE =
  /\b(fast|quick(ly)?|easy|easily|intuitive|user[- ]friendly|seamless(ly)?|robust|better|improved?|modern|simple|scalable|great|delight\w*|etc\.?)\b/i;

const GENERIC_USER = /\b(everyone|everybody|all users|any user|anyone|all customers)\b/i;

function splitUnits(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z“"(\[])/)
    .map((s) => s.replace(/^\s*(#+|[-*•]|\d+[.)])\s*/, "").trim())
    .filter((s) => s.length >= 12);
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

function matches(units: string[], re: RegExp): string[] {
  const flags = re.flags.replace("g", "");
  const r = new RegExp(re.source, flags);
  return units.filter((u) => r.test(u));
}

function signalHit(text: string, units: string[], s: Signal): { hit: boolean; units: string[] } {
  const r = new RegExp(s.test.source, s.test.flags.replace("g", ""));
  const hitUnits = matches(units, s.test);
  if (s.min) {
    // count per line for list-style signals
    const lineHits = text.split("\n").filter((l) => r.test(l)).length;
    return { hit: lineHits >= s.min, units: hitUnits };
  }
  return { hit: r.test(text) || hitUnits.length > 0, units: hitUnits };
}

function status(score: number): Status {
  return score >= 70 ? "strong" : score >= 40 ? "ok" : "weak";
}

function fillQuote(template: string, q: Quote | null): string {
  const stand = q ? `“${q.text.replace(/[.…]+$/, "")}”` : "your problem statement";
  return template.replace(/\{q\}/g, stand);
}

/** The sentence most worth anchoring to when a category has no direct evidence. */
function anchorSentence(units: string[]): string | null {
  const re = /\b(goals?|build|launch|let users?|allow|enable|introduce|feature|we want|propos\w+|implement)\b/i;
  return units.find((u) => re.test(u)) ?? units[0] ?? null;
}

function titleOf(text: string): string {
  const heading = text.match(/^\s*#\s+(.+)$/m)?.[1];
  const first = text.split("\n").find((l) => l.trim().length > 0) ?? "Untitled PRD";
  return clip((heading ?? first).replace(/^#+\s*/, ""), 80);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

// ---------- main ----------

export const MIN_WORDS = 40;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function analyzePRD(text: string): AnalysisResult {
  const units = splitUnits(text);
  const anchor = anchorSentence(units);

  const categories: CategoryResult[] = RUBRICS.map((rb) => {
    let score = 0;
    const found: string[] = [];
    const missing: string[] = [];
    let bestUnit: string | null = null;
    let bestScore = 0;

    for (const s of rb.signals) {
      const { hit, units: hu } = signalHit(text, units, s);
      if (hit) {
        score += s.weight;
        found.push(s.label);
        if (hu.length && s.weight > bestScore) {
          bestScore = s.weight;
          bestUnit = hu[0];
        }
      } else missing.push(s.label);
    }

    // Penalise fuzzy wording where precision is the whole point.
    let vagueUnit: string | null = null;
    if (rb.id === "metrics" || rb.id === "criteria") {
      vagueUnit = matches(units, VAGUE)[0] ?? null;
      if (vagueUnit) score -= 15;
    } else if (rb.id === "user") {
      vagueUnit = matches(units, GENERIC_USER)[0] ?? null;
      if (vagueUnit) score -= 15;
    }

    score = Math.max(0, Math.min(100, score));

    let quote: Quote | null = null;
    if (vagueUnit && status(score) !== "strong") quote = { text: clip(vagueUnit), kind: "vague" };
    else if (bestUnit) quote = { text: clip(bestUnit), kind: "found" };
    else if (anchor) quote = { text: clip(anchor), kind: "anchor" };

    return {
      id: rb.id,
      label: rb.label,
      weight: rb.weight,
      score,
      status: status(score),
      found,
      missing,
      quote,
      why: rb.why,
      add: fillQuote(rb.add, quote),
      question: rb.question,
    };
  });

  const overall = Math.round(categories.reduce((a, c) => a + (c.score * c.weight) / 100, 0));

  const weakest = [...categories]
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)
    .slice(0, 3)
    .map((c) => c.id);

  const strongest = [...categories].sort((a, b) => b.score - a.score || b.weight - a.weight)[0].id;

  const rewrite = buildRewrite(text, categories);

  return {
    id: shortId(),
    createdAt: Date.now(),
    overall,
    words: countWords(text),
    categories,
    weakest,
    strongest,
    rewrite,
  };
}

function buildRewrite(text: string, cats: CategoryResult[]): string {
  const lines: string[] = [
    `# ${titleOf(text)}`,
    "",
    "> Suggested structure. Quoted lines are yours; [brackets] are blanks only you can fill. Nothing here is invented.",
    "",
  ];
  for (const rb of RUBRICS) {
    const c = cats.find((x) => x.id === rb.id)!;
    lines.push(`## ${rb.rewriteHeading}`);
    if (c.quote && c.quote.kind === "found") lines.push(`Your text: “${c.quote.text}”`);
    if (c.status === "strong") {
      lines.push("Looks solid. Keep as is.");
    } else {
      if (c.quote && c.quote.kind !== "found") lines.push(`Starting from: “${c.quote.text}”`);
      lines.push(`Fill in: ${rb.rewriteFill}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ---------- compact share payload (scores only, never the PRD text) ----------

export interface SharePayload {
  v: 1;
  o: number; // overall
  c: number[]; // category scores, RUBRICS order
}

export const CATEGORY_ORDER = RUBRICS.map((r) => ({ id: r.id, label: r.label, weight: r.weight }));

export function toSharePayload(r: AnalysisResult): SharePayload {
  return { v: 1, o: r.overall, c: CATEGORY_ORDER.map((m) => r.categories.find((c) => c.id === m.id)!.score) };
}

export function encodePayload(p: SharePayload): string {
  return btoa(JSON.stringify(p)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePayload(s: string | undefined | null): SharePayload | null {
  if (!s) return null;
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const p = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    if (p?.v !== 1 || typeof p.o !== "number" || !Array.isArray(p.c) || p.c.length !== CATEGORY_ORDER.length) return null;
    if (![p.o, ...p.c].every((n) => Number.isFinite(n) && n >= 0 && n <= 100)) return null;
    return p as SharePayload;
  } catch {
    return null;
  }
}

/** Three headline metrics for the share card. */
export function shareMetrics(p: SharePayload) {
  const rows = CATEGORY_ORDER.map((m, i) => ({ label: m.label, score: p.c[i] }));
  const best = [...rows].sort((a, b) => b.score - a.score)[0];
  const worst = [...rows].sort((a, b) => a.score - b.score)[0];
  const healthy = rows.filter((r) => r.score >= 70).length;
  return [
    { k: "Strongest", v: `${best.label} · ${best.score}` },
    { k: "Biggest gap", v: `${worst.label} · ${worst.score}` },
    { k: "Healthy categories", v: `${healthy}/${rows.length}` },
  ];
}

export function grade(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: "Ready for review", color: "#346538", bg: "#EDF3EC" };
  if (score >= 60) return { label: "Almost there", color: "#346538", bg: "#EDF3EC" };
  if (score >= 40) return { label: "Needs work", color: "#956400", bg: "#FBF3DB" };
  return { label: "Early draft", color: "#9F2F2D", bg: "#FDEBEC" };
}

export function statusTone(s: Status): { bg: string; color: string; label: string } {
  return s === "strong"
    ? { bg: "#EDF3EC", color: "#346538", label: "Strong" }
    : s === "ok"
      ? { bg: "#FBF3DB", color: "#956400", label: "Partial" }
      : { bg: "#FDEBEC", color: "#9F2F2D", label: "Weak" };
}
