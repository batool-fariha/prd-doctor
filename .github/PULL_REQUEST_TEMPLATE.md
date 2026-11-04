## What and why

<!-- What does this change, and what problem does it solve? Link the issue if there is one. -->

## How it was checked

<!-- Commands you ran, pages you opened, documents you scored. -->

## Checklist

- [ ] `npm run lint`, `npm run typecheck` and `npm test` pass
- [ ] Scoring changes have a regression case in `scripts/score-check.mts`, and the fix is a general rule, not a special case for one document
- [ ] If the rubric changed: `npm run docs` was run and `docs/scoring.md` is committed
- [ ] No confidential text, personal data or secrets in the diff
- [ ] The engine still makes no network calls and the report still shows only the user's own sentences
- [ ] `CHANGELOG.md` updated under **Unreleased**
- [ ] Docs updated if behaviour, privacy, or share links changed
