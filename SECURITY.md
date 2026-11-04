# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting: open the **Security** tab of this repository and choose **Report a vulnerability**.

Include what you found, steps to reproduce, and the impact you expect. This is a small, lightly maintained project, so there is no guaranteed response time, but reports are taken seriously and fixed as soon as they can be.

## Scope

PRD Doctor has no accounts, no database and no server-side analysis, so the attack surface is small. The most important promise is privacy: **a user's PRD text must never leave their browser.**

In scope:

- Any way the text of a document, or a quote from it, can be sent to a server, a third party, a share link or a share image.
- The `/api/og` route and the `/r/[code]` and `/result/[id]` routes: malformed or hostile input causing errors, excessive resource use, or content injection into the rendered image or page.
- Cross-site scripting through pasted text, uploaded files (PDF, Word, Markdown, text) or share-link parameters.
- Anything in `lib/analytics.ts` that could record document content.
- Vulnerable production dependencies (`npm audit --omit=dev`).

Known and accepted:

- **Share links are not signed.** Anyone can craft a link that shows a score that was never computed. A shared score is a self-reported signal, not a certificate.
- **The scoring is heuristic.** A document can be written to score well; this is not a security boundary.
- **Anything stored in the browser is readable by that browser's user.** Results, including the PRD text, are kept in `localStorage` on purpose so the user can edit and re-score.
- Findings in development-only tooling that never ships to visitors.

## How privacy is protected

See [docs/privacy.md](docs/privacy.md) for what is stored, what is sent, and how to verify it yourself. In short: analysis runs in the browser, files are parsed client-side, share links carry scores only, and analytics are limited to counts and scores with session recording and autocapture disabled.

## Dependencies

Dependabot opens pull requests for dependency updates, CI runs on every change, and production dependencies are checked with `npm audit --omit=dev`.

## Secrets

The only configuration is the optional PostHog project key, which is public by design. Do not commit `.env*` files. If you believe a secret was exposed, tell the maintainer privately as described above.
