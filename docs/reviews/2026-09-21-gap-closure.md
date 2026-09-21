# Gap-closure acceptance — 2026-09-21

The local runtime includes the changes below. Grok Bot/Kimi Swarm parity is not achieved. Research and the complete README gate mapping are in [the research report](../research/2026-09-21-gap-closure.md).

## Implemented and verified

- Search attempt allowance is **50 per UTC day**, shared by Tavily/Brave and connection tests. Existing usage was preserved. Keys remain private; this is an attempt limit, not a monetary cap.
- MCP uses pinned official TypeScript SDK 1.30.0 for bounded Streamable HTTP initialization, discovery, JSON/SSE tool responses and session termination. Existing endpoint/network checks, tool grants and exact write approvals remain enforced. Discovery does not grant tool access. OAuth, stdio, legacy SSE, background streams and server-initiated execution are unsupported in this profile.
- Connector operations durably record intent before external dispatch. A lost response or reconstructed worker cannot blindly replay the operation. Unknown outcomes are visible; full remote reconciliation and recovery remain unfinished.
- Optional independent semantic review uses a different saved agent, isolated read-only text/JSON evidence, predeclared criteria and exact source/output quotations. Failed, ungrounded or inconclusive review blocks completion. Evidence versions are checked again after review; verdicts and usage are retained. Same-model reviewers can share errors. Binary documents require a parsed text companion.
- Settings model Add buttons stay within their cards. Department labels use consistent columns or stacked positions. Browser regressions cover 540, 760, 900 and 1440-pixel viewports and all six agents.

## Evidence

| Check | Result and scope |
|---|---|
| TypeScript | Passed |
| Full backend/integration suite, real Docker enabled | 126 passed; zero failures or skips |
| Browser suite | 17 passed |
| Built-runtime integration suite | 19 passed |
| [Initial reviewer corpus](../evaluations/2026-09-21-semantic-review-corpus.json) | Failed: two correct controls rejected because the model omitted required evidence |
| [Revised reviewer corpus](../evaluations/2026-09-21-semantic-review-corpus-v2.json) | 12/12 correct decisions; six correct controls accepted, six incorrect/injected controls rejected; original thresholds retained |
| [Public MCP acceptance](../evaluations/2026-09-21-mcp-public-acceptance.json) | DeepWiki discovery and public repository structure call passed, with no private content or credentials transmitted |
| [Installed acceptance](../evaluations/2026-09-21-installed-gap-acceptance.json) | Correct artifact completed, incorrect artifact blocked, MCP run completed, previous projects/runs preserved, allowance 50 active |
| [Complex autonomous trial 5](../evaluations/2026-09-21-complex-harness-trial-5.json) | Failed after four planning calls; invalid supervisor/parent dependency topology; zero workers spawned |

Installed executable source hash: `43975615da52bab73fb008443286bf59ff93ad3a532d36b4da65b8f295ef3e95`. Documentation/evaluation summaries were finalized after the build. Raw reports are retained privately; linked reports omit operational identities and paths.

The reviewer schema correction makes the quote requirements explicit to the model. It did not change labels, repetitions or acceptance thresholds. This small development corpus was used to improve the implementation, so its successful rerun is not an independent holdout or general reliability estimate.

## Remaining delivery gates

VAC-23 remains open: tool enums now follow actual grants, but the complex autonomous planner still fails topology correction. VAC-24 remains open for the remainder of its protocol/session-expiry qualification. VAC-28 remains open for broader task rubrics and owner adjudication. VAC-38 remains open for remote reconciliation and crash-after-send qualification. VAC-35 and VAC-36 have their layout fixes and browser evidence.

VAC-25–27 need selected applications, permitted account operations and real authentication/handoff testing. VAC-29–31 need deployment and identity choices, plus host-loss/failover evidence. VAC-32–33 and VAC-42 need repeated matched workloads and elapsed-time/capacity measurements. VAC-34 and VAC-37–41 retain their own interface, imported-tool, storage, licensing and secret-history gates. These are delivery work, not capabilities established by installing a library.

No commits, pushes, public publication, cloud deployment or remote account writes were performed as part of this acceptance.
