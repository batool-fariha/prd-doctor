# Deployment

PRD Doctor needs no database, queue or secret to run. It is a Next.js app that can be hosted anywhere Node runs. The live site runs on Vercel's free (Hobby) tier.

## Requirements

| What | Version |
|---|---|
| Node.js, to run the app | 20 or newer |
| Node.js, to run the `check`, `paste`, `fuzz` and `docs` scripts | 22.6 or newer (they use `--experimental-strip-types`) |
| Package manager | npm (a `package-lock.json` is committed) |

CI runs on Node 22. The production deployment uses Vercel's Node 24.

## Environment variables

Both are optional, and both are public by design (`NEXT_PUBLIC_` values are compiled into the browser bundle).

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key. Leave empty to turn analytics off completely. | none (analytics off) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingestion host | `https://us.i.posthog.com` |

Copy `.env.example` to `.env.local` for local development. Never commit `.env.local`; it is git-ignored.

## Deploy to Vercel

1. Import the repository in Vercel. The Next.js preset needs no configuration.
2. Optionally add the two variables above under **Settings → Environment Variables**.
3. Deploy. Every push to `main` deploys to production, and every pull request gets a preview deployment.

Because the share card at `/api/og` is fully determined by its URL, it is sent with a long CDN cache header, so a burst of traffic is served from the edge and stays inside the free tier.

## Self-hosting

```bash
npm ci
npm run build
npm start        # serves on port 3000; set PORT to change it
```

Any host that can run `next start`, or a container built from the standard Next.js recipe, will work. There is no state on the server, so you can run several instances behind a load balancer.

## Using your own domain or branding

All site-wide identity lives in `lib/site.ts`: the site name, the public URL, and the author links shown in the footer. Change `SITE.url` to your domain so that share cards, the sitemap, `robots.txt` and link-preview metadata point at it. Replace the logo in `app/icon.svg` and `components/logo.tsx` if you rebrand.

## Release checklist

Before merging a change that affects scoring or sharing:

1. `npm run lint`, `npm run typecheck` and `npm test` pass locally (CI runs the same plus a production build).
2. If `lib/analyzer.ts` changed, run `npm run docs` and commit the regenerated `docs/scoring.md`.
3. Open the preview deployment, analyse each of the three examples, and check the result page, a shared link, and the share card image.
4. If a share link or payload format changed, confirm old links still decode or fail with the friendly "damaged link" page (see [architecture.md](architecture.md#sharing-without-a-database)).
5. Update `CHANGELOG.md`.

## Keeping dependencies healthy

Dependabot opens weekly pull requests for npm packages and monthly ones for GitHub Actions. Minor and patch updates arrive as one grouped PR. Major bumps of `typescript` and `@types/node` are ignored on purpose (see `.github/dependabot.yml` for the reasons). Run `npm audit --omit=dev` to check the packages that ship to visitors.
