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
  kind: "found" | "anchor" | "vague" | "empty";
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
  title: string;
  /** Normalised PRD text, kept only in the browser so the user can edit and re-score. */
  text?: string;
  prev?: { id: string; overall: number; createdAt: number; c?: number[] };
}

interface Signal {
  label: string;
  weight: number;
  test: RegExp;
  /** minimum number of distinct matching lines required */
  min?: number;
  /** counts as found when the matching PRD section exists and has real content */
  section?: boolean;
  /** tested against the whole text instead of single sentences (multi-line patterns) */
  text?: boolean;
  /** only counts when an earlier signal in the same category already matched */
  gated?: boolean;
  /** counts when a filled section with a matching title exists (e.g. a "Not doing" list) */
  sectionTitle?: RegExp;
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
      { label: "an explicit problem statement", weight: 25, test: /\b(problem|pain ?points?|painful|annoying|complain\w*|struggl\w+|challenges?|frustrat\w+|difficult\w*|hard to|no way to|unable|can't|cannot|lack\w*|fail\w*|friction|broken|drop-?off|go(es)? unanswered|missed)\b/i },
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
      { label: "a research or data source (interviews, analytics, tickets…)", weight: 35, test: /^(?=.*\b(interviews?|surveys?|user research|usability|customer (feedback|calls?)|support tickets?|tickets?|NPS|CSAT|analytics|data (shows?|suggests?)|session recordings?|a\/b|study|benchmark|competitors?)\b)(?=.*(\d|\b(found|showed|told us|said|reported|observed|heard|saw|according to)\b)).*/i },
      { label: "specific numbers with units", weight: 30, test: /\b\d+(\.\d+)?\s?(%|percent|x\b|users|customers|tickets|interviews|respondents|hours|minutes|days)/i },
      { label: "a source reference (n=, link, report name)", weight: 15, test: /\bn\s?=\s?\d+|https?:\/\/|\b(according to|sources?:|per the)\b/i },
      { label: "a direct customer quote", weight: 10, test: /\b(said|says|told|wrote|according to|customers?|users?|participants?|interviewees?)\b[^"“”\n]{0,60}["“][^"“”\n]{15,}["”]|["“][^"“”\n]{15,}["”][^\n]{0,40}\b(said|says|told|wrote|customers?|users?|participants?)\b/i },
      { label: "a date or time window for the data", weight: 10, gated: true, test: /\b(last (week|month|quarter|year)|Q[1-4]|20\d\d)\b/i },
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
      { label: "severity language (critical, blocker, costly…)", weight: 25, test: /\b(critical|severe|blockers?|blocking|major|painful|costly|urgent|top (issue|complaint|request)|churn\w*|cancel\w*)\b/i },
      { label: "how often it happens", weight: 20, test: /\b(daily|weekly|monthly|often|frequently|per (day|week|month)|every (day|week|time)|\d+\s*(times|x)\b)/i },
      { label: "a quantified impact (money, time, tickets)", weight: 35, test: /(\$\s?\d|\b\d+\s?(%|hours|minutes|tickets|days|weeks)\b|\b\d+x\b)/i },
      { label: "the current workaround", weight: 20, test: /\b(workaround|currently|today|manual\w*|spreadsheets?|copy.?paste|alternatives?)\b/i },
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
      { label: "non-goals / out-of-scope items", weight: 35, sectionTitle: /\b(non-?goals?|not (doing|building)|out of scope|won'?t)\b/i, test: /\b(out of scope|non-?goals?|not in scope|not included|won't|will not|excluded|deferred|not (doing|building))\b/i },
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
      { label: "a concrete metric (conversion, retention, time-to-X…)", weight: 25, test: /\b(conversion|retention|activation|engagement|NPS|CSAT|DAU|MAU|WAU|churn|time[- ]to|adoption|ARPU|CTR|(completion|reply|response|error|bounce|success|drop-?off) rate|drop-?off|first response|task success|latency)\b/i },
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
      { label: "Given / When / Then style behaviour", weight: 20, test: /\bgiven\b[^\n]{0,200}\bwhen\b[^\n]{0,200}\bthen\b|^\s*[-*]?\s*given\b[^\n]*\n\s*[-*]?\s*when\b[^\n]*\n\s*[-*]?\s*then\b/im },
      { label: "an Acceptance Criteria section", weight: 30, test: /acceptance criteria|definition of done|\bDoD\b/i },
      { label: "testable wording (must, only, at least, within…)", weight: 25, test: /\b(must|shall|only|at least|at most|no more than|cannot|within \d|then)\b/i, min: 3 },
      { label: "a checklist or numbered requirements", weight: 25, test: /^\s*(([-*]\s*\[[ xX]\])|(\d+[.)])|([-*•]\s+(given|when|if|a user|users?|the user|the system|an admin|admins?|every|each|all)\b))\s*\S/im, min: 2 },
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
      { label: "edge cases or failure handling", weight: 45, test: /\b(edge cases?|corner cases?|errors?|fail(s|ed|ure|ures)?|invalid|timeouts?|offline|duplicates?|race condition|rate limit\w*|concurrent|retry|retries|lock(ed|out)|expir\w+|too many)\b/i },
      { label: "non-happy-path states (empty, loading, expired…)", weight: 25, test: /\b(empty state|loading|zero state|first[- ]time|expir\w+|deleted|cancel(led|ed)?|locked)\b/i },
      { label: "limits and boundaries (max, locale, accessibility…)", weight: 30, test: /\b(max(imum)?|min(imum)?|limits?|exceed\w*|older than|more than|special characters|unicode|accessib\w+|locali[sz]\w+|time ?zones?|mobile)\b/i },
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
      { label: "priority labels (P0/P1, must/should/could)", weight: 40, test: /\bP[0-3]\b|\bMoSCoW\b|\b(must|should|could)-have\b|\b(must|should|could) have:|\bnice[- ]to[- ]have\b|\b[Pp]rioriti[sz]\w+|\b[Pp]riority\b/ },
      { label: "a prioritisation rationale (impact, effort, RICE…)", weight: 30, test: /\bRICE\b|\bICE score\b|impact\s*(vs\.?|and|\/|versus)\s*effort|effort\s*(vs\.?|and|\/|versus)\s*impact|\bKano\b|opportunity cost|\bROI\b|prioriti[sz]ed (by|because|based)|ranked by/i },
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
      { label: "an experiment, pilot or staged rollout", weight: 40, test: /\b(experiments?|A\/B|split test|hypothesis|control group|variant|treatment|holdout|pilot|beta (users|testers|test)|rollout|canary|feature flag|test(ed|ing)? with|early adopters?|design partners?)\b/i },
      { label: "sample size, duration or significance", weight: 30, test: /\b(sample size|statistical\w*|significan\w+|confidence (interval|level)|statistical power|MDE|p-?value|run for|\d+\s*(weeks|days))\b/i },
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
const PLACEHOLDER =
  /^(none|n\/?a|na|nil|nothing|tbd|tba|todo|wip|unknown|to be (decided|determined|defined|confirmed)|not applicable|\?+|-+|…|\.{2,})[.!]*$/i;

/** Public description of the rubric (labels and weights only), used by the "How scoring works" page. */
export const RUBRIC_SUMMARY = RUBRICS.map((r) => ({ id: r.id, label: r.label, weight: r.weight, why: r.why, signals: r.signals.map((sg) => ({ label: sg.label, weight: sg.weight })) }));

// A signal flagged `section` also counts when the matching section is present and filled.
RUBRICS.forEach((rb) => {
  rb.signals[0].section = true;
  rb.signals.forEach((sg) => {
    if (/section/i.test(sg.label)) sg.section = true;
    if (/Given \/ When/.test(sg.label)) { sg.text = true; sg.section = false; } // a format signal needs the format, not just a section
  });
});

const SECTION_RE: Record<CategoryId, RegExp> = {
  problem: /\b(problem|background|context|motivation|overview|why|opportunity|challenges?|current state)\b/i,
  user: /\b(users?|personas?|audience|target|who|who is it for|for whom|customers?)\b/i,
  evidence: /\b(evidence|research|insights?|discovery)\b/i,
  pain: /\b(pain|severity|impact|urgency)\b/i,
  scope: /\b(scope|non-?goals?|goals?|objectives?|not doing|not building|won'?t|out of scope)\b/i,
  metrics: /\b(success|metrics?|kpis?|okrs?|measures?)\b/i,
  criteria: /\b(acceptance|criteria|definition of done)\b/i,
  risks: /\b(risks?|assumptions?|mitigations?)\b/i,
  edge: /\b(edge|errors?|failures?|corner)\b/i,
  deps: /\b(dependenc\w*|integrations?|prerequisites?|blockers?)\b/i,
  priority: /\b(priorit\w*|roadmap|phases?|milestones?|timeline|schedule|must[- ]have|should[- ]have|could[- ]have|later)\b/i,
  experiment: /\b(experiments?|a\/b|test plan|pilot|beta|design partners?|rollout|launch plan|validation)\b/i,
};

/** Where a section *would* apply, used to pick the nearest sentence when nothing matches. */
const TOPIC_RE: Record<CategoryId, RegExp> = {
  problem: /\b(problem|issue|struggl\w+|slow|manual|hard|can't|cannot|pain|today|currently)\b/i,
  user: /\b(users?|customers?|managers?|teams?|people|admins?|buyers?)\b/i,
  evidence: /(?!)/, // nothing counts as nearby evidence: report "no mention found" rather than quoting an unrelated line
  pain: /\b(slow|manual|every|often|hours?|time|costly|hard)\b/i,
  scope: /\b(add|build|include|feature|let|allow|enable|should|will)\b/i,
  metrics: /\b(improve|increase|reduce|better|faster|grow|goal|success)\b/i,
  criteria: /\b(must|should|will|can|let|allow|enable|when|then)\b/i,
  risks: /\b(launch|release|ship|data|payment|permission|migrat\w+|new|integrat\w+)\b/i,
  edge: /\b(input|upload|save|submit|form|filter|login|search|import|export|flow)\b/i,
  deps: /\b(api|service|team|integrat\w+|vendor|backend|data)\b/i,
  priority: /\b(feature|should|must|will|let|allow|enable|add|build)\b/i,
  experiment: /\b(launch|release|rollout|users?|improve|increase|expect|believe)\b/i,
};

const CONTEXT_CATS = new Set<CategoryId>(["problem", "user", "evidence", "pain"]);
const SOLUTION_CATS = new Set<CategoryId>(["metrics", "criteria", "risks", "edge", "deps", "priority", "experiment"]);
const BONUS_NUMBERS = new Set<CategoryId>(["scope", "priority", "risks", "deps", "edge", "criteria"]);
const BONUS_OWNER = new Set<CategoryId>(["deps", "risks", "experiment", "criteria", "priority"]);

/** Cleans pasted text: odd whitespace, zero-width characters, fancy bullets, blank-line runs. */
export function normalizeText(t: string): string {
  return t
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    .replace(/[​-‍﻿]/g, "")
    .replace(/^[ \t]*[•◦▪▫‣●○■□–—]\s+/gm, "- ")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitUnits(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z“"(\[])/)
    .map((s) => s.replace(/^\s*(#+|[-*•]|\d+[.)])\s*/, "").trim())
    .filter((s) => s.length >= 8);
}

function clip(s: string, n = 160): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

const reOf = (re: RegExp) => new RegExp(re.source, re.flags.replace("g", ""));

function matches(units: string[], re: RegExp): string[] {
  const r = reOf(re);
  return units.filter((u) => r.test(u));
}

function status(score: number): Status {
  return score >= 70 ? "strong" : score >= 40 ? "ok" : "weak";
}

function fillQuote(template: string, q: Quote | null): string {
  const stand = q ? `“${q.text.replace(/[.…]+$/, "")}”` : "the claims in your PRD";
  return template.replace(/\{q\}/g, stand);
}

export function titleOf(text: string): string {
  const heading = text.match(/^\s*#\s+(.+)$/m)?.[1];
  const first = text.split("\n").find((l) => l.trim().length > 0) ?? "Untitled PRD";
  return clip((heading ?? first).replace(/^#+\s*/, ""), 80);
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

// ---------- structure ----------

interface Section {
  title: string;
  body: string;
  level: number; // 0 for "Label:" style
  /** the heading line started with a number ("4. Goals"): a parent of the unnumbered headings below it */
  numbered?: boolean;
}

/** Strips markdown and leading numbering: "## 10. Success Metrics" and "**6.2 Risks**" both become the plain title. */
const cleanTitle = (t: string) =>
  t.replace(/[*_`]/g, "").replace(/^[^\p{L}\p{N}]+/u, "").replace(/:$/, "").replace(/^(?:\d+(?:\.\d+)*[.):]?|[A-Z][.)])\s+/, "").trim();

const wordCount = (t: string) => t.split(/\s+/).filter(Boolean).length;
const isKnownTitle = (t: string) => wordCount(t) <= 6 && RUBRICS.some((rb) => SECTION_RE[rb.id].test(t));
const catOf = (t: string) => RUBRICS.findIndex((rb) => SECTION_RE[rb.id].test(t));

/** A short standalone line such as "Risks" or "Success metrics": how most Word and PDF documents mark sections. */
const isBareHeading = (l: string) =>
  !/^[-*•]\s/.test(l) && l.length <= 48 && wordCount(l) <= 5 && !/[.!?,;:]$/.test(l) && isKnownTitle(cleanTitle(l));

const isHeadingLine = (l: string) =>
  /^#{1,6}\s+\S/.test(l) ||
  /^\*\*[^*]{2,60}\*\*:?$/.test(l) ||
  (/^[A-Z][A-Za-z0-9 /&'-]{1,40}:$/.test(l) && wordCount(l) <= 6) ||
  isBareHeading(l);

type LineClass = { kind: "text" } | { kind: "section"; title: string; rest: string; level: number; numbered?: boolean };

/**
 * One place that decides what a line is. A "Label: text" line starts a section only when it looks like a
 * real label (at most 5 words). Inside a markdown heading, only labels we recognise (Risks:, Acceptance criteria:)
 * start a section; sentences like "The initial product will not attempt to:" stay part of their parent section.
 */
function classifyLine(line: string, openLevel: number | null): LineClass {
  let m: RegExpMatchArray | null;
  if ((m = line.match(/^(#{1,6})\s+(.+?)\s*#*$/))) return { kind: "section", title: cleanTitle(m[2]), rest: "", level: m[1].length };
  let title: string | null = null;
  let rest = "";
  if ((m = line.match(/^\*\*(.{2,60}?)\*\*:?\s*(.*)$/))) { title = cleanTitle(m[1]); rest = m[2] ?? ""; }
  else if ((m = line.match(/^([A-Z][A-Za-z0-9 /&'-]{1,40}):\s*(.*)$/)) && wordCount(m[1]) <= 5) { title = cleanTitle(m[1]); rest = m[2]; }
  if (title !== null) {
    if (isKnownTitle(title) || openLevel === null || openLevel === 0) return { kind: "section", title, rest, level: 0 };
    return { kind: "text" };
  }
  if (isBareHeading(line)) return { kind: "section", title: cleanTitle(line), rest: "", level: 1, numbered: /^\d+(\.\d+)*[.)]\s/.test(line) };
  return { kind: "text" };
}

function isPlaceholderLine(line: string): boolean {
  const l = line.replace(/^\s*([-*•]|\d+[.)])\s*/, "").replace(/\*\*/g, "");
  const m = l.match(/^[^:]{1,40}:\s*(.+)$/);
  return PLACEHOLDER.test((m ? m[1] : l).trim());
}

function parseSections(lines: string[]): Section[] {
  const out: Section[] = [];
  let cur: Section | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    const c = classifyLine(line, cur ? cur.level : null);
    if (c.kind === "section") {
      if (cur) out.push(cur);
      cur = { title: c.title, body: c.rest, level: c.level, numbered: c.numbered };
    } else if (cur && line) {
      cur.body += (cur.body ? "\n" : "") + line;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function sectionState(sections: Section[], i: number): "filled" | "placeholder" {
  const s = sections[i];
  const flat = s.body.replace(/^[\s>*\-•\d.)]+/gm, "").replace(/\s+/g, " ").trim();
  if (!flat) {
    // A heading whose content is organised under sub-headings or bold sub-labels is not empty.
    if (s.level > 0) {
      const child = sections[i + 1];
      if (child && !(child.level > 0 && child.level <= s.level)) return "filled";
      // Plain-text documents: "4. Goals and Non-Goals" followed by unnumbered "Goals", "Non-Goals" headings.
      if (child && s.numbered && !child.numbered) return "filled";
    }
    return "placeholder";
  }
  if (PLACEHOLDER.test(flat)) return "placeholder";
  return flat.split(" ").length >= 3 || /\d/.test(flat) ? "filled" : "placeholder";
}

// ---------- main ----------

export const MIN_WORDS = 40;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function analyzePRD(input: string): AnalysisResult {
  const text = normalizeText(input);
  const lines = text.split("\n");
  const sections = parseSections(lines);
  // Heading-only lines and placeholder lines ("Risks: none") never earn credit.
  const clean = lines.filter((l) => l.trim() && !isHeadingLine(l.trim()) && !isPlaceholderLine(l.trim())).join("\n");
  const units = splitUnits(clean);

  // 1. Raw signal hits per category.
  const raw = RUBRICS.map((rb) =>
    rb.signals.map((sg) => {
      const r = reOf(sg.test);
      if (sg.min) return { sg, units: [] as string[], textHit: clean.split("\n").filter((l) => r.test(l)).length >= sg.min };
      if (sg.text) return { sg, units: [] as string[], textHit: r.test(clean) };
      return { sg, units: matches(units, sg.test), textHit: false };
    }),
  );

  // 2. A sentence earns credit in at most 3 categories: the section it sits in, then its best matches.
  const owner = new Map<string, number>();
  let cur = -1;
  let base = 0; // heading level that set `cur`; deeper sub-headings with unknown titles inherit it
  let openLevel: number | null = null;
  for (const l0 of lines) {
    const l = l0.trim();
    const c = classifyLine(l, openLevel);
    if (c.kind === "section") {
      const cat = catOf(c.title);
      if (cat >= 0) {
        // A deeper known heading inside a known parent switches category but keeps the parent's level,
        // so later unknown sibling sub-headings still inherit from the parent section.
        if (!(base > 0 && c.level > base && cur >= 0)) base = c.level;
        cur = cat;
      }
      else if (!(c.level > 0 && base > 0 && c.level > base && cur >= 0)) { cur = -1; base = 0; }
      openLevel = c.level;
    }
    if (cur >= 0 && l && !isHeadingLine(l) && !isPlaceholderLine(l)) splitUnits(l).forEach((u) => owner.set(u, cur));
  }
  const credit = new Map<string, Map<number, number>>();
  raw.forEach((sigs, ci) =>
    sigs.forEach((r) =>
      r.units.forEach((u) => {
        const m = credit.get(u) ?? new Map<number, number>();
        m.set(ci, Math.max(m.get(ci) ?? 0, r.sg.weight + (owner.get(u) === ci ? 1000 : 0)));
        credit.set(u, m);
      }),
    ),
  );
  const allowed = new Set<string>();
  credit.forEach((m, u) => {
    const ow = owner.get(u);
    const owCat = ow !== undefined && ow >= 0 ? RUBRICS[ow].id : null;
    // Words in "Success metrics" or "Risks" (e.g. retention, conversion) cannot prove the problem, user, evidence or pain.
    const solutionish = owCat !== null && (SOLUTION_CATS.has(owCat) || (owCat === "scope" && wordCount(u) < 7));
    const eligible = [...m.entries()].filter(([ci]) => !(CONTEXT_CATS.has(RUBRICS[ci].id) && solutionish && ow !== ci));
    eligible.sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 4).forEach(([ci]) => allowed.add(`${ci}|${u}`));
  });

  // 3. Score each category.
  const partial = RUBRICS.map((rb, ci) => {
    const secIdx = sections.findIndex((x) => SECTION_RE[rb.id].test(x.title));
    const secState = secIdx < 0 ? null : sectionState(sections, secIdx);
    let score = 0;
    const found: string[] = [];
    const missing: string[] = [];
    const cands: { u: string; w: number }[] = [];

    raw[ci].forEach(({ sg, units: us, textHit }) => {
      const ok = us.filter((u) => allowed.has(`${ci}|${u}`));
      const gateOk = !sg.gated || score > 0;
      const titled = sg.sectionTitle ? sections.some((x, i) => sg.sectionTitle!.test(x.title) && sectionState(sections, i) === "filled") : false;
      if (gateOk && (textHit || ok.length > 0 || titled || (sg.section && secState === "filled"))) {
        score += sg.weight;
        found.push(sg.label);
        ok.forEach((u) => cands.push({ u, w: sg.weight }));
      } else missing.push(sg.label);
    });
    if (secState === "filled" && secIdx >= 0) {
      const first = splitUnits(sections[secIdx].body)[0];
      if (first && !cands.some((c) => c.u === first)) cands.push({ u: first, w: 1 });
    }

    // Reward specifics: numbers and named owners.
    if (BONUS_NUMBERS.has(rb.id) && cands.some((c) => /\d/.test(c.u))) { score += 10; found.push("specific numbers"); }
    if (BONUS_OWNER.has(rb.id) && cands.some((c) => /\bowner:\s*\S|\bDRI\b|\bowned by\b|\bassigned to\b|@\w+/i.test(c.u))) {
      score += 10;
      found.push("a named owner");
    }

    // Penalise vague wording and placeholder sections.
    // Vague wording only counts where it affects this category: inside its own section, or anywhere if it has none.
    const scoped = (re: RegExp) => {
      const hits = matches(units, re);
      return hits.find((u) => owner.get(u) === ci) ?? (secIdx < 0 ? hits.find((u) => !owner.has(u)) : undefined) ?? null;
    };
    let vagueUnit: string | null = null;
    if (rb.id === "metrics" || rb.id === "criteria") vagueUnit = scoped(VAGUE);
    else if (rb.id === "user") vagueUnit = scoped(GENERIC_USER);
    if (vagueUnit) score -= 15;

    let emptyText: string | null = null;
    if (secState === "placeholder" && secIdx >= 0) {
      const flat = sections[secIdx].body.replace(/\s+/g, " ").trim();
      emptyText = `${sections[secIdx].title}: ${flat || "(empty)"}`;
      score = Math.min(score, 15);
      missing.unshift("real content (your section is only a placeholder)");
    }

    score = Math.max(0, Math.min(100, score));
    // Prefer real sentences from the category's own section; avoid lead-ins ("...:"), table rows and one-word fragments.
    const rank = (c: { u: string; w: number }) =>
      c.w + (owner.get(c.u) === ci ? 1000 : 0) - (c.u.endsWith(":") ? 500 : 0) - (c.u.startsWith("|") ? 300 : 0) + Math.min(12, wordCount(c.u)) / 2;
    cands.sort((a, b) => rank(b) - rank(a));
    return { rb, score, found, missing, cands, vagueUnit, emptyText };
  });

  // 4. Pick quotes, keeping them distinct across categories where possible (most constrained first).
  const used = new Set<string>();
  const quotes = new Map<CategoryId, Quote | null>();
  [...partial].sort((a, b) => (a.cands.length || 99) - (b.cands.length || 99)).forEach((p) => {
    const st = status(p.score);
    let q: Quote | null = null;
    if (p.emptyText) q = { text: clip(p.emptyText), kind: "empty" };
    else if (p.vagueUnit && st !== "strong") q = { text: clip(p.vagueUnit), kind: "vague" };
    else if (p.cands.length) {
      const pick = p.cands.find((c) => !used.has(c.u)) ?? p.cands[0];
      used.add(pick.u);
      q = { text: clip(pick.u), kind: "found" };
    } else {
      const near = units.find((u) => TOPIC_RE[p.rb.id].test(u) && !used.has(u));
      if (near) { used.add(near); q = { text: clip(near), kind: "anchor" }; }
    }
    quotes.set(p.rb.id, q);
  });

  const categories: CategoryResult[] = partial.map((p) => {
    const q = quotes.get(p.rb.id) ?? null;
    const prefix = !q
      ? "Nothing in your PRD covers this yet. "
      : q.kind === "empty"
        ? "This section exists but is only a placeholder. "
        : "";
    return {
      id: p.rb.id,
      label: p.rb.label,
      weight: p.rb.weight,
      score: p.score,
      status: status(p.score),
      found: p.found,
      missing: p.missing,
      quote: q,
      why: p.rb.why,
      add: prefix + fillQuote(p.rb.add, q),
      question: p.rb.question,
    };
  });

  const overall = Math.round(categories.reduce((a, c) => a + (c.score * c.weight) / 100, 0));
  const weakest = [...categories]
    .sort((a, b) => (100 - b.score) * b.weight - (100 - a.score) * a.weight)
    .slice(0, 3)
    .map((c) => c.id);
  const strongest = [...categories].sort((a, b) => b.score - a.score || b.weight - a.weight)[0].id;

  return {
    id: shortId(),
    createdAt: Date.now(),
    overall,
    words: countWords(text),
    categories,
    weakest,
    strongest,
    rewrite: buildRewrite(text, categories),
    title: titleOf(text),
    text,
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
    if (c.quote && c.quote.kind === "empty") lines.push(`Currently a placeholder: “${c.quote.text}”`);
    if (c.status === "strong") {
      lines.push("Looks solid. Keep as is.");
    } else {
      if (c.quote && c.quote.kind === "anchor") lines.push(`Nearest text: “${c.quote.text}”`);
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

/** Compact public code for a score: 13 bytes (overall + 12 categories) as 18 URL-safe characters. */
export function encodeShort(p: SharePayload): string {
  return btoa(String.fromCharCode(p.o, ...p.c)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShort(code: string | undefined | null): SharePayload | null {
  if (!code) return null;
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    if (bin.length !== CATEGORY_ORDER.length + 1) return null;
    const n = [...bin].map((ch) => ch.charCodeAt(0));
    if (n.some((v) => v > 100)) return null;
    return { v: 1, o: n[0], c: n.slice(1) };
  } catch {
    return null;
  }
}

/** Previous run, for the before/after share card. Scores only; `c` is absent for older history entries. */
export interface PrevPayload { o: number; c?: number[] }

export function encodePrev(p: PrevPayload): string {
  return btoa(JSON.stringify(p)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePrev(s: string | undefined | null): PrevPayload | null {
  if (!s) return null;
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const p = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
    if (typeof p?.o !== "number" || p.o < 0 || p.o > 100) return null;
    const c = Array.isArray(p.c) && p.c.length === CATEGORY_ORDER.length && p.c.every((n: unknown) => typeof n === "number" && n >= 0 && n <= 100) ? (p.c as number[]) : undefined;
    return { o: p.o, c };
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

export interface Grade { label: string; verdict: string; color: string; bg: string }

/** Tone of voice for each score band. */
export interface Grade { label: string; verdict: string; color: string; bg: string }

/** Tone of voice for each score band. */
export function grade(score: number): Grade {
  if (score >= 85) return { label: "Cleared for review", verdict: "Ready to send. Reviewers should have few questions.", color: "#346538", bg: "#EDF3EC" };
  if (score >= 70) return { label: "Healthy", verdict: "Reads like a PRD people can build from.", color: "#346538", bg: "#EDF3EC" };
  if (score >= 50) return { label: "On the mend", verdict: "Solid foundations. Close the top gaps and it is ready.", color: "#1F6C9F", bg: "#E1F3FE" };
  if (score >= 30) return { label: "Under observation", verdict: "The basics are there. A few gaps will cost you in review.", color: "#956400", bg: "#FBF3DB" };
  return { label: "Needs bed rest", verdict: "The idea may be good, but the document cannot carry it yet.", color: "#9F2F2D", bg: "#FDEBEC" };
}

export function statusTone(s: Status): { bg: string; color: string; label: string } {
  return s === "strong"
    ? { bg: "#EDF3EC", color: "#346538", label: "Strong" }
    : s === "ok"
      ? { bg: "#FBF3DB", color: "#956400", label: "Partial" }
      : { bg: "#FDEBEC", color: "#9F2F2D", label: "Weak" };
}
