# Privacy

PRD Doctor is built so that a confidential document never has to leave the visitor's device. This page states exactly what is stored and what is sent, so you can check it against the code.

## Summary

| Data | Leaves your browser? | Where it is kept |
|---|---|---|
| The text of your PRD | **No** | `localStorage` on your device only |
| Uploaded PDF, Word, Markdown or text files | **No** | Read in the browser, never uploaded |
| Your scores | Only if you share a link or card | Encoded into the link or card URL |
| Usage analytics | Yes, counts and scores only | PostHog (see below), and only if a key is configured |

There is no account, no database and no server-side analysis. The analysis runs in your browser, and the server only renders pages and share images.

## What is stored in your browser

Everything below is in `localStorage` on your device and can be removed with **Clear history** or by clearing site data.

- The full result of each analysis, **including the PRD text**, so that you can edit it and score it again.
- A history index (title, date, word count, scores), the text currently in the editor, which fixes you marked as addressed, whether you answered the feedback prompt, and your light or dark preference.

If `localStorage` is blocked or full, results are kept in memory for the session instead.

## What a shared link contains

A public link (`/r/<code>`) and the share card contain the **overall score and the twelve category scores**, nothing else. They never contain your text, your title or any quote from your document. Anyone with the link can see the scores and a radar chart.

Downloading a card makes one request to this app's own `/api/og` route with the same scores in the URL, which renders the image.

Share links are not signed. Anyone can hand-craft one to show a score that was never computed, so a shared score is a self-reported signal and not a certificate.

## Analytics

Analytics use [PostHog](https://posthog.com) and are **off unless** `NEXT_PUBLIC_POSTHOG_KEY` is set at build time. When on, they are configured in `lib/analytics.ts` to:

- disable session recording, so the editor is never recorded;
- disable autocapture, surveys and dead-click capture, so only the events below are sent;
- not create person profiles (`person_profiles: "identified_only"`).

Page views are captured. Private report URLs contain a random id, and public score URLs contain the scores, never text.

These custom events are sent, with exactly these properties:

| Event | Properties |
|---|---|
| `example_loaded` | `example` (which fictional example) |
| `analysis_started` | `words`, `chars` |
| `analysis_completed` | `score`, `words`, `duration_ms`, `weak_categories`, `is_rescore` |
| `score_viewed` | `score`, `source` (`own` or `shared`) |
| `share_clicked` | `score`, `method`, `kind` |
| `score_feedback` | `rating`, `score`, `direction`, `categories` (names of categories that felt wrong) |

No event carries document text. PostHog may set an anonymous identifier in the browser's storage to tell visits apart.

## Third parties

- **Hosting:** the site is served from Vercel, which keeps standard request logs.
- **Analytics:** PostHog, as above.
- **Fonts** are downloaded when the app is built (`next/font`) and served from the app itself, so visitors do not contact Google Fonts.

## Verifying this yourself

- Open your browser's network panel, paste a PRD and analyse it: no request carries the text.
- Search the code for network calls: nothing in `lib/` makes one except the analytics wrapper, and the only `fetch` in the app is the share-card request to `/api/og`, which carries scores only.
- `lib/analytics.ts` is the only file that sends data to a third party, and `track()` is documented as taking counts and scores only.

If you find a way the document can leave the browser, please report it as described in [SECURITY.md](../SECURITY.md).
