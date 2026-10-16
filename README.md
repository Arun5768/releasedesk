# ReleaseDesk

Turn public GitHub release evidence into a review you can act on. ReleaseDesk scans selected repository signals, explains its findings, separates evidence coverage from the score, and supports a local fix queue and exportable reports.

**Status:** a functional MVP under final verification. It is designed for public repositories and browser-local workspaces. It has no multi-user authentication, cloud synchronization or subscription entitlement backend. See the [build case study](docs/CODEX-BUILD-CASE-STUDY.md) for the verification and deployment record.

## Run locally

Use a Node.js version supported by Next.js 16 and npm. From this directory:

```sh
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The development command binds to the local machine. Public GitHub scans work without an API key, subject to GitHub availability and rate limits.

```sh
npm test
npm run typecheck
npm run build
npm start
```

`npm start` serves a completed production build locally. A failed network request to GitHub does not invalidate reports already stored in the browser.

## What the MVP does

- Reads public GitHub repository metadata, community-file presence, default-branch workflow runs, recent releases and commits.
- Shows a weighted score alongside evidence coverage, individual explanations, source links and retrieval warnings.
- Uses a browser-local workspace for onboarding, scan history and task notes.
- Automatically creates fix tasks for warning and failed checks, with editable status and notes.
- Exports Markdown or JSON reports and supports validated workspace backup/restore.
- Distinguishes sample data from scans backed by GitHub responses.

The app reads GitHub evidence; it does not modify repositories, open issues or trigger workflows. Workspace onboarding is not account registration. Local data does not automatically follow the user to another device, browser or deployment URL.

## How the score works

| Check | Weight | What is observed |
| --- | ---: | --- |
| Project README | 15 | Whether GitHub detects a README file; contents are not evaluated. |
| License declared | 10 | Whether GitHub detects a license file; legal suitability is not assessed. |
| Contribution guide | 10 | Whether GitHub detects a contributing file. |
| Default-branch workflows | 35 | The latest observed run of each workflow in a limited sample of recent default-branch runs. |
| Published stable release | 15 | Whether a stable release appears among the five most recent releases. |
| Repository is active | 15 | Whether the repository is not archived; recent activity or maintenance quality is not established. |

For observed checks, `pass` earns its full weight, `warn` earns half, and `fail` earns zero. `unknown` earns no points and is removed from the score denominator. Coverage is the proportion of total check weight for which evidence is known. Both values are rounded to whole percentages. If every check is unknown, the score is `null` and coverage is zero.

For example, one passing check of weight 15 and one unknown check of weight 35 produce a score of 100 and coverage of 30. The score summarizes only the observed evidence; it does not mean the repository passed a complete review.

The workflow check samples 20 recent default-branch runs. A successful observation does not establish that every configured workflow exists in that sample, that it ran against the proposed release commit, or that all code is tested. Check the linked runs before relying on them.

A repository may use a release process that does not publish GitHub releases. Treat these findings as prompts for review, not universal release requirements. This tool is not a vulnerability scanner, code-quality certification or deployment guarantee. Marking a fix task done records your decision; a new scan is needed to inspect updated evidence. If a fresh scan still finds the same warning or failure, its completed task reopens while retaining its notes.

The local workspace retains up to 100 scans and 600 tasks. Export a workspace backup before clearing browser storage or switching devices. Restoring a backup replaces the current workspace; it does not merge two workspaces. Imported scores are recalculated from the backup's checks, but importing a file does not reverify its claims against GitHub.

## Configuration

Create `.env.local` only if you need optional settings. Do not commit secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | No | Server-side authentication for public GitHub API requests. Use the minimum access required for public metadata; private repository access is not a supported feature. |
| `STRIPE_PRO_PAYMENT_LINK` | No | HTTPS `buy.stripe.com` link for an externally configured Pro purchase. |
| `STRIPE_STUDIO_PAYMENT_LINK` | No | HTTPS `buy.stripe.com` link for an externally configured Studio purchase. |

The GitHub token is read on the server. Do not add a `NEXT_PUBLIC_` prefix or put a token in a repository URL. The app rejects non-GitHub URLs, credentials, query strings and links to files or issues as repository inputs.

Payment links are optional redirects, not an implemented subscription system. If a link is absent or invalid, the billing route returns to the pricing page with an unavailable state. The proposed **Pro $12/month** and **Studio $29/month** prices are unvalidated hypotheses. Cloud accounts, scheduled monitoring, team access and paid entitlements are future work. Only configure a live purchase link when its purchase page accurately describes what the buyer receives.

## API

### Scan a repository

```http
POST /api/scan
Content-Type: application/json

{"repository":"vercel/next.js"}
```

Also accepts an HTTPS repository URL such as `https://github.com/vercel/next.js`. A successful response contains `scan` and `cached`. The scan includes repository metadata, checks, score, coverage, source, warnings, workflow observations, releases and commits.

Repository lookup failure stops the scan. If a secondary evidence request fails, the scan can return with warnings and unknown checks where applicable. Recent commits are contextual evidence and do not affect the score. Errors return an `error` message; rate-limit responses may also include `retryAt`.

The route caches up to 100 repository results for five minutes in memory and shares concurrent requests for the same repository within one running instance. This cache is temporary, is not a database, and is not shared across serverless instances. It is not an abuse-prevention or per-user quota system. A repeat request during the cache window may return the same scan ID and timestamp.

### Health check

```http
GET /api/health
```

Returns the app name, version and an `ok` status. It confirms the route responds; it does not test GitHub connectivity.

### Optional payment redirect

```http
GET /api/billing?plan=pro
GET /api/billing?plan=studio
```

Redirects only to a configured HTTPS `buy.stripe.com` URL. No subscription status is stored or enforced by this application.

## Deploy to Vercel

1. Push this directory as a Git repository, keeping `node_modules`, build output and local environment files excluded.
2. Import the repository into Vercel. Use its Next.js framework preset. If this app is inside a larger repository, set the project root to this directory.
3. Use `npm run build` as the build command and retain the Next.js preset's output handling.
4. Add optional environment variables in the project settings; keep tokens on the server.
5. Deploy, then verify a real public repository scan, error handling, local persistence and both report exports at the deployed URL.

This app uses server routes and is not a static-export-only site. A public deployment can share the server's GitHub API budget across visitors; production traffic requires an abuse-control and rate-limit plan. Browser-local workspace data remains on each visitor's device. Clearing that storage can remove it, and a different origin starts a different local workspace.

No public repository or deployment URL is asserted in this README until the application owner records the verified result.

## Project structure

```text
src/app/                  Next.js pages, layout and API routes
src/app/api/scan/          Public GitHub scan endpoint and temporary cache
src/app/api/billing/       Optional external payment-link redirect
src/app/api/health/        App health response
src/lib/scan.ts            Input validation, GitHub requests and scoring
src/lib/types.ts           Shared evidence and workspace types
tests/                    Focused automated checks
docs/PRODUCT-PLAN.md       Product shortlist, buyer hypotheses and discovery plan
docs/CODEX-BUILD-CASE-STUDY.md  Build decisions, evidence and remaining work
```

The application uses Next.js 16, React, TypeScript and Lucide icons. Its product direction is documented as a hypothesis, and its implementation should be judged by the code and recorded verification rather than promotional metrics.
