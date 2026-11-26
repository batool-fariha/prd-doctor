# Compliance check (optional)

Teams in health, finance and other regulated areas need a PRD to cover things the 12 standard categories don't check for, such as data handling, audit trails and regulatory sign-off. The compliance check covers those topics. It is off by default. Turn it on with **Check compliance coverage** near the bottom of a result. The choice is remembered in this browser.

## The proposal (issue #11)

The issue asked two questions.

**A fixed optional category, or a rubric format teams can edit?** This change adds a fixed optional check. Five signals cover what most regulated teams need, and the check is written the same way as the main rubric (weighted patterns, with your own sentence quoted as evidence). An editable format is a larger change: storage, sharing, validation and a UI to edit it. Once there is feedback on whether these five are the right ones, a team-editable rubric can reuse the same shape (`COMPLIANCE_SIGNALS` in `lib/compliance.ts`).

**How does it affect the 0–100 total?** It doesn't. Compliance gets its own score out of 100. Reweighting the total would make a PRD's score depend on a switch, so the same document would score differently in two browsers and share links would stop being comparable. Keeping it separate leaves the total, the 12 categories, share links and `docs/scoring.md` unchanged.

## What it checks

| Signal | Points | Counts when a sentence mentions… |
|---|---|---|
| How sensitive data is handled | 25 | PII, PHI, personal, health or cardholder data, retention, encryption, anonymisation, access control, consent |
| An audit trail | 20 | an audit log or trail, change history, an immutable or tamper-evident log, traceability |
| The regulations or standards that apply | 20 | a named framework, such as HIPAA, GDPR, CCPA, SOC 2, PCI DSS, SOX, FDA or 21 CFR, IEC 62304, ISO 27001, 13485 or 14971, MDR, KYC/AML, DORA or NIS2 |
| Regulatory or legal sign-off | 25 | legal, compliance, privacy, regulatory or security review or sign-off, the DPO, a DPIA or PIA, a risk assessment, a threat model |
| Breach or incident handling | 10 | a breach, an incident response plan, notifying users or regulators, a reporting deadline |

Headings on their own earn nothing; a signal needs a sentence. Each covered signal quotes the sentence that matched it. Each missing signal says what to add.

## What it is not

It checks that these topics are **written down**, not that the product is compliant. It is not legal advice and doesn't replace your compliance team's review.

## Privacy

It runs in the browser on the PRD text already stored there. It sends nothing, adds no analytics event, and is never included in share links. The only new stored item is the on/off preference (`prd-doctor:compliance` in `localStorage`).

## Tests

`npm run compliance` (part of `npm test`) runs `scripts/compliance-check.mts`. It checks full, partial and empty coverage, that headings alone earn nothing, each signal on its own, and that the main score is unaffected.
