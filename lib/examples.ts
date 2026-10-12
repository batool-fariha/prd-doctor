/**
 * Three fictional example PRDs so visitors can see the score range before pasting their own.
 * scripts/score-check.mts keeps each one inside the range its label promises.
 */
export interface Example {
  id: "rough" | "decent" | "strong";
  label: string;
  blurb: string;
  /** accepted overall score range, enforced by the regression check */
  range: [number, number];
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "rough",
    label: "Rough draft",
    blurb: "A vague idea with no users, numbers or scope",
    range: [0, 15],
    text: `# Smart Dashboard
We want to build a smart dashboard that is fast and easy to use for everyone. It should look modern and be better than what we have. Engineering will build it next quarter and it should have charts, filters, and export. Let's make it seamless and intuitive for all users, and we can add more features later once people like it.`,
  },
  {
    id: "decent",
    label: "Decent draft",
    blurb: "A clear problem and metric, but no risks or edge cases",
    range: [45, 65],
    text: `# Saved Filters for Reports
Problem: Support managers struggle to re-create the same report filters every morning because filters reset on each visit. In 6 of 9 interviews last month, managers said they spend about 10 minutes a day rebuilding them.
Users: Support managers at mid-size teams (20-100 agents).
Goals: Let users save and reuse filters. Out of scope: sharing filters between users.
Success metrics: Reduce time to first report from 10 minutes to 2 minutes within 60 days of launch.
Acceptance criteria: Given a saved filter, when the manager opens Reports, then the filter is applied automatically.
Dependencies: Requires the Reports API from the platform team.`,
  },
  {
    id: "strong",
    label: "Strong draft",
    blurb: "Evidence, targets, acceptance criteria, risks and a test plan",
    range: [78, 100],
    text: `# Smart Invoice Reminders

## 1. Problem
Freelancers lose time and cash chasing late invoices. In our survey of 214 freelance customers (March 2026), 62% had at least one invoice more than 14 days overdue last quarter, and they spend about 3 hours a month writing follow-up emails. Late payment is the top reason customers give for cancelling (31% of 48 cancellation interviews). Today they chase manually from email or spreadsheets, so follow-ups are late, inconsistent or skipped because the tone feels awkward.

## 2. Target users
Primary: solo freelancers and studios of 2 to 5 people who invoice 5 to 40 clients a year. Secondary: their part-time bookkeepers. Job to be done: get paid on time without damaging the client relationship.

## 3. Goals and non-goals
Goals: send automatic, polite reminders before and after the due date, and let users edit tone and timing.
Non-goals for v1: payment processing, debt collection or legal notices, SMS or WhatsApp reminders, multi-currency.

## 4. Success metrics
- Primary: reduce average days-to-paid from 19 to 14 within 60 days of launch.
- Secondary: 40% of active users enable reminders within 30 days.
- Guardrail: client complaints stay under 0.5% of reminders sent, and monthly cancellations stay under 3.1%.

## 5. Requirements and acceptance criteria
P0
- Given an unpaid invoice, when it is 3 days before the due date, then a reminder email is sent from the user's address.
- Given a reminder was sent, when the client pays, then no further reminders are sent once the payment is recorded.
- Given a user pauses reminders for a client, when the due date passes, then no email is sent to that client.
P1
- Users can choose between three tone presets (friendly, neutral, firm) and edit the template.
Priority rationale: P0 items remove the main manual task and reach 62% of users; P1 items were ranked by impact versus effort.

## 6. Edge cases
- Invoice edited or cancelled after a reminder is queued: the queued reminder is cancelled.
- Client email bounces: stop after the first bounce and notify the user.
- Time zones: send at 9am in the client's time zone, with a maximum of 3 reminders per invoice at least 4 days apart.
- Partial payments: reminders show the remaining balance.

## 7. Dependencies
- Email delivery provider with domain verification. Owner: Priya (Platform). Needed by week 3.
- Invoice events API from the Billing team. Owner: Marcus. Delivered by week 2.

## 8. Risks and assumptions
- Assumption: clients will not mark polite reminders as spam. Mitigation: unsubscribe link, and a 0.5% complaint rate triggers an automatic pause.
- Risk: collections wording differs legally by country. Mitigation: no legal language, reviewed by Legal before launch.
- Rollback: feature flag per account.

## 9. Experiment and rollout
Hypothesis: automatic reminders cut days-to-paid by at least 20%. Run a 4-week A/B test on 20% of eligible accounts (about 600 accounts, enough to detect a 20% change at 80% power). Ship to everyone if days-to-paid improves by 20% with complaints under 0.5%; iterate if the lift is 10% to 20%; kill the feature if complaints exceed 1%.`,
  },
];
