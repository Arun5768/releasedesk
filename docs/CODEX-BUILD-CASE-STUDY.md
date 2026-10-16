# ReleaseDesk: a Codex build case study

## The problem

Public GitHub release evidence lives in several places: repository metadata, community documents, Actions, commits and releases. ReleaseDesk brings selected signals into one review screen, attaches source links and lets the user track the follow-up work.

The intended audience is independent maintainers and small software teams. This audience and its willingness to pay remain hypotheses. There are no claimed customers, conversion figures or measured productivity gains.

## Why this project

The project began as a portfolio build for a prospective Codex Ambassador. It was selected over two alternatives, CommunityProof and LaunchSignal, because public GitHub data makes a useful workflow possible without private repository authorization or a full account system. The comparison and proposed discovery work are in [the product plan](./PRODUCT-PLAN.md).

The aim is to demonstrate a complete, inspectable piece of work: product scope, user interface, read-only API integration, local state, reports and verification. It is also an opportunity to teach how to make AI-generated product claims match the software that actually exists.

## What Codex contributes

Codex is being used to plan and implement the application, connect the public GitHub API, build the interface, define evidence checks, write focused verification and prepare project documentation. Parallel implementation and documentation work is reviewed against the same product contract.

This record should be updated with the final repository, deployment and verification results before it is used as a completed-project claim. A plan, generated code or a passing development build alone does not establish production reliability.

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

At the time of this initial case-study draft, implementation is in progress. The application owner should replace the pending statuses below with the observed final results. Do not convert a pending item to completed without checking the relevant behavior.

| Area | Evidence to retain | Current verification record |
| --- | --- | --- |
| Public repository scan | A real repository input and source-linked response. | Pending final verification. |
| Score and coverage | Tests or worked examples for pass, warning, failure and unknown states. | Pending final verification. |
| Failure handling | Invalid input, unavailable repository and upstream error examples. | Pending final verification. |
| Workspace and fix queue | Onboarding, task status/notes and persistence after refresh. | Pending final verification. |
| History and exports | Two scan snapshots plus readable Markdown and JSON output. | Pending final verification. |
| Automated checks | Exact test, typecheck and build commands with their results. | Pending final verification. |
| Public repository | Repository URL and the commit containing this version. | Not recorded in this draft. |
| Deployment | Working application URL and deployment-specific smoke check. | Not recorded in this draft. |

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

Use this only after the described features work and a shareable link is available. Replace the brackets with verified details and check the final form's character count.

> I built ReleaseDesk with Codex to turn public GitHub release evidence into an actionable review. It links findings to their sources, separates unknown evidence from failures, and includes a local fix queue and exportable reports. I verified it with [actual checks] and documented its limits. Demo/code: [link].

The strongest accompanying contribution would be a short tutorial that lets another builder reproduce the workflow and understand one difficult decision, such as handling incomplete evidence honestly. Do not claim external adoption or time saved unless those results have actually been observed and recorded.
