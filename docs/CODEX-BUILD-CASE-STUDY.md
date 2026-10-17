# ReleaseDesk: a Codex build case study

**Live app:** [releasedesk-one.vercel.app](https://releasedesk-one.vercel.app) · **Source:** [Arun5768/releasedesk](https://github.com/Arun5768/releasedesk) · **Passing CI:** [GitHub Actions run](https://github.com/Arun5768/releasedesk/actions/runs/38944534786)

## The problem

Public GitHub release evidence lives in several places: repository metadata, community documents, Actions, commits and releases. ReleaseDesk brings selected signals into one review screen, attaches source links and lets the user track the follow-up work.

The intended audience is independent maintainers and small software teams. This audience and its willingness to pay remain hypotheses. There are no claimed customers, conversion figures or measured productivity gains.

## Why this project

The project began as a portfolio build for a prospective Codex Ambassador. It was selected over two alternatives, CommunityProof and LaunchSignal, because public GitHub data makes a useful workflow possible without private repository authorization or a full account system. The comparison and proposed discovery work are in [the product plan](./PRODUCT-PLAN.md).

The aim is to demonstrate a complete, inspectable piece of work: product scope, user interface, read-only API integration, local state, reports and verification. It is also an opportunity to teach how to make AI-generated product claims match the software that actually exists.

## What Codex contributed

Codex planned and implemented the application, connected the public GitHub API, built the interface, defined evidence checks, wrote focused verification and prepared project documentation. Parallel implementation and documentation work was reviewed against the same product contract. The implemented local workflow has been exercised from onboarding through a real scan and a downloaded Markdown report.

The source is public and the free MVP is deployed on Vercel. The verification record below distinguishes local browser checks, automated checks and public deployment smoke checks. Generated code or a passing production build alone does not establish production reliability.

## Design decisions worth teaching

### A score needs an evidence boundary

A failed API request does not prove a repository is missing a required practice. ReleaseDesk represents unavailable evidence as unknown, excludes it from the score denominator and reports coverage separately. Each check has a description and a recommended next step, with an evidence link when available.

The score is a summary of selected repository signals. It does not inspect every security concern, validate the entire codebase or guarantee that a release is safe. This limitation is part of the product design rather than a footnote hidden from users.

### Public data makes a smaller useful first release possible

The scanner is limited to public repositories. No private repository OAuth flow is implied. An optional server-side GitHub token can improve public API access, but it should not be sent to the browser or treated as user authentication.

### Local state is presented as local state

Onboarding creates a browser workspace, not a cloud account. Scan history, fix tasks and notes are local to that browser. This keeps the workflow usable while making the persistence boundary explicit. It also means there is no multi-user collaboration or cross-device sync in this version.

### Task completion and verification are different events

A user can mark a task complete and add a note. That action does not rewrite GitHub evidence or certify that a repository changed. A subsequent scan provides a new observation and reopens a completed task if its check still reports a warning or failure. Keeping this distinction visible makes the report easier to trust.

### Pricing is a hypothesis until the service exists

The proposed Pro price is $12/month and Studio is $29/month. These are unvalidated product hypotheses. Optional external payment links do not implement subscriptions, billing webhooks, usage metering or feature entitlements. The current MVP should not claim those systems exist.

## Implementation and evidence record

Verification recorded across **16–17 October 2026 (Asia/Calcutta)** includes 17 passing automated tests, a passing typecheck, a successful Next.js 16.4.2 production build, passing GitHub CI, local browser checks, and public deployment smoke checks. These are bounded observations; downloaded JSON contents and browser error states remain unverified.

| Area | Evidence to retain | Current verification record |
| --- | --- | --- |
| Public repository scan | A real repository input and source-linked response. | Local browser onboarding → workspace completed a live `cli/cli` scan: `source: "github"`, six checks, score 100, coverage 100. The deployed endpoint also scanned `Arun5768/releasedesk`: `source: "github"`, six checks, score 83, coverage 100, `warnings: []`. These are checklist observations, not security certifications. |
| Score and coverage | Tests or worked examples for known and unknown states. | Automated scoring and scanner tests passed, including unknown-evidence exclusion and failed-workflow handling. The live scan displayed score and coverage separately. |
| Failure handling | Invalid inputs and upstream error examples. | Automated checks passed for rejected repository inputs, partial API outages, private-data exclusion, draft-release exclusion and rate-limit reset information. Browser error-state checks remain unrecorded. |
| Workspace and fix queue | Onboarding, task status/notes and persistence after refresh. | Browser onboarding and arrival in the workspace verified. A fix-queue note and `in_progress` status survived a local browser refresh. Storage regression tests passed, including cached-scan deduplication, task reopening and preservation of notes when evidence is unavailable. |
| History and exports | Scan snapshots plus readable Markdown and JSON output. | Markdown report downloaded and contents inspected. The labeled sample history comparison showed +7 with checks side by side. JSON-export success UI was observed; downloaded JSON contents have not yet been inspected. Automated report and backup tests passed. |
| Automated checks | Exact test, typecheck and build commands with their results. | `npm test`: 17/17 passed. `npm run typecheck`: passed. `npm run build`: passed with Next.js 16.4.2; all application routes built successfully. [GitHub CI passed](https://github.com/Arun5768/releasedesk/actions/runs/38944534786). |
| Responsive interface | Desktop and mobile browser inspection. | Overview and report views checked at 390 × 844: no horizontal overflow, and mobile navigation worked. The public landing page was also inspected in the browser. This is targeted QA, not comprehensive device coverage. |
| Public repository | Repository URL and the commit containing this version. | [Arun5768/releasedesk](https://github.com/Arun5768/releasedesk), initial published commit [`de19051`](https://github.com/Arun5768/releasedesk/commit/de19051). |
| Deployment | Working application URL and deployment-specific smoke check. | [releasedesk-one.vercel.app](https://releasedesk-one.vercel.app), Vercel project `kuei2/releasedesk` on Hobby, deployed directly by CLI. Unauthenticated `GET /api/health` and a live `POST /api/scan` succeeded. |

The Vercel GitHub integration attempt failed because the GitHub login connection must be completed in Vercel. Automatic deployments on push are **not active**. The current deployment came from the CLI, and future updates require manual deployment until that connection is configured.

Planned capabilities include cloud accounts, team workspaces, private repository access, scheduled scans and subscription entitlements. They are separate from the local MVP and should not appear in the completed-feature list.

## A reproducible demonstration

1. Open the app and explain that its workspace is stored in the browser.
2. Scan a public repository you know, using a real GitHub response.
3. Open an evidence link and compare the finding with GitHub.
4. Explain the difference between the score and coverage; show an unknown state if one occurs.
5. Open an automatically created fix task, change its status and write a note.
6. Refresh to demonstrate local persistence, then open scan history.
7. Export a Markdown report and a JSON snapshot.
8. Show the relevant checks and state the remaining limitations.

Use the clearly labeled demo only when a real API response is unavailable, and say so. Do not describe sample entries as customers, real scans or live production results.

## Application answer template

The app and source links above are available. Adapt this template to your own explanation, replace the brackets with the recorded checks and links, and check the final form's character count.

> I built ReleaseDesk with Codex to turn public GitHub release evidence into an actionable review. It links findings to their sources, separates unknown evidence from failures, and includes a local fix queue and exportable reports. I verified it with [actual checks] and documented its limits. Demo/code: [link].

The strongest accompanying contribution would be a short tutorial that lets another builder reproduce the workflow and understand one difficult decision, such as handling incomplete evidence honestly. Do not claim external adoption or time saved unless those results have actually been observed and recorded.
