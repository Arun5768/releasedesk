# ReleaseDesk product plan

ReleaseDesk helps a maintainer or small software team turn public GitHub repository evidence into a release preparation checklist. A scan links its findings to GitHub, separates missing evidence from failed checks, and creates a fix queue that the user controls.

This is a working product hypothesis and an MVP scope, not a validated market or revenue claim. No customer interviews, paid conversions, production usage or measured time savings are claimed in this plan.

## Three options considered

| Order | Product | Intended buyer and problem | Proposed differentiation | Main uncertainty |
| --- | --- | --- | --- | --- |
| 1 — chosen | **ReleaseDesk** | Independent maintainers and small development teams need to gather release evidence scattered across repository documentation, Actions, commits and releases. | One explainable report with source links, separate evidence coverage, a fix queue and an export that can accompany a release discussion. | Whether this removes enough recurring work to justify payment when GitHub already exposes the underlying data. |
| 2 | **CommunityProof** | Developer community organizers need to turn events, attendance records, resources and feedback into credible contribution reports. | An evidence ledger that distinguishes attendance from registration and outcomes from promotional claims. | Access to event tools, organizer privacy needs and a repeatable reporting budget. |
| 3 | **LaunchSignal** | Indie product builders need to decide which launch preparation tasks matter and retain proof that they were completed. | A focused launch review with evidence links and follow-up tasks. | Broad scope, subjective scoring and overlap with existing project management tools. |

ReleaseDesk was selected because a public GitHub repository provides immediately available, inspectable inputs. A useful first version can work without collecting private source code or building account authorization. It also offers a concrete Codex case study: implementing API integration, clear failure handling, transparent scoring and an interactive workflow.

## Intended first customer

Start with maintainers and teams that repeatedly prepare releases for public repositories. A second segment to investigate is small development agencies reviewing public starter projects or open-source deliverables before handoff.

The buyer hypothesis is a technical lead or maintainer responsible for release preparation. The user needs to understand what evidence exists, decide what needs attention and share a concise record with collaborators. The product should complement the team's existing review process; a high score is not permission to release.

## The first workflow

1. Create a local workspace with a name and role.
2. Enter a public GitHub repository as `owner/repository` or a supported GitHub URL.
3. Fetch public repository metadata, community files, default-branch Actions evidence, recent releases and recent commits.
4. Review checks grouped by category, follow evidence links and inspect retrieval warnings.
5. Review the fix tasks created from warning and failed checks; update their status and notes locally.
6. Run another scan after changes and retain the earlier snapshot.
7. Export a report as Markdown or JSON for a release discussion or project record.

The sample workspace must remain visibly labeled as demo data. A real scan must remain distinguishable from the demo in both the interface and stored scan data.

## Scoring principles

- Explain each check, its status, weight, source and recommended next step.
- An unavailable response is **unknown**, not automatically a failure.
- Exclude unknown checks from the score denominator and display evidence coverage separately.
- A score based on incomplete evidence must never imply that all checks were verified.
- Keep raw observations separate from recommendations. A repository with no public release may intentionally use another release process.
- Never describe the score as a security audit, code-quality certification, deployment test or guarantee of production readiness.
- A completed fix task records the user's decision; a new scan is needed to inspect updated GitHub evidence.

The source implementation and tests are authoritative for the exact checks, weights and score formula. Changes to those rules should be documented because scores taken under different rules may not be directly comparable.

## MVP boundaries

| Included in the MVP scope | Deferred |
| --- | --- |
| Read-only scans of public GitHub repositories | GitHub OAuth, private repositories and organization installations |
| Local browser workspace and onboarding | User accounts, team invitations and access control |
| Explainable findings, coverage and warnings | Full source analysis, vulnerability scanning and security certification |
| Local scan history and task notes | Cloud persistence, shared workspaces and cross-device synchronization |
| Markdown and JSON reports | Scheduled monitoring, notifications and organization dashboards |
| Proposed pricing and optional external payment links | Subscription webhooks, entitlements, metering and billing administration |

This scope is a deployable functional MVP. It is not a complete production subscription service. A payment link alone cannot grant or revoke in-app access.

## Pricing hypotheses

These prices are proposals to test, not validated willingness to pay. All features implemented in this local MVP remain governed by the actual application behavior, not by a fictional subscription status.

| Proposed plan | Proposed price | Future value to validate |
| --- | --- | --- |
| Free | $0 | Manual public repository scans and a useful individual workflow. |
| Pro | $12/month | Saved cloud history, scheduled checks and convenient individual reporting. |
| Studio | $29/month | Shared team workspaces, several repositories and handoff reports. |

Before selling a recurring plan, define and implement the promised features, persistence, authentication, quotas, entitlements, cancellation and support. If payment links are configured while this remains an MVP, the purchase page must explain exactly what the buyer receives. Do not sell future capabilities as delivered features.

## Quick discovery before expanding

Interview five to eight maintainers, technical leads or agency engineers as an initial learning exercise. This is a proposed research sample, not research that has already happened. Ask about a recent release rather than asking whether the idea sounds useful:

1. Walk me through your last release or repository handoff. What did you check, and where?
2. What did you discover late? What happened as a result?
3. Which preparation work do you repeat, and who owns it?
4. What evidence do teammates need before they are comfortable proceeding?
5. Show me your current checklist, issue or release document, if you can share it.
6. Try a ReleaseDesk report for a repository you know. Which finding is useful, misleading or missing?
7. Would you use this again on the next release? What would have to change first?
8. If it became a paid tool, who would approve it and what existing work would it replace?

Record the participant's actual role, current workflow, specific friction, report feedback and follow-up permission. Avoid recording unnecessary personal or confidential repository information.

## Experiments and decision points

| Experiment | Evidence to collect | Decision it informs |
| --- | --- | --- |
| Guided scan of a familiar public repository | Whether users correctly distinguish a failed check from unknown evidence. | Fix explanations and scoring before adding more checks. |
| Share an exported report during a real release discussion | Which sections are used, ignored or corrected. | Improve the report or abandon the report-centric positioning. |
| Ask users to return for their next release | Actual repeat use and the task that brought them back. | Whether there is a recurring workflow worth supporting. |
| Discuss proposed paid capabilities | Concrete requests, budget owner and alternatives. | Which paid feature to build first, if any. |

Possible product measures include successful scan completion, usefulness of findings, repeat scans, report use and the rate of misleading checks. They are future measurement ideas; this MVP does not claim collected product analytics.

## Responsible next steps

First verify the existing scanner against repositories with different release practices and API failure conditions. Then test the workflow with real maintainers. Only add cloud accounts, private data access or paid subscriptions once a recurring customer need justifies their operational cost.

For the Codex Ambassador application, the useful contribution is a reproducible build and an honest explanation of the design choices, verification and limitations. Product claims should stay grounded in what another person can open, run and inspect.
