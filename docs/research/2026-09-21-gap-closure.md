# VAC gap closure research and delivery decisions

Date: 2026-09-21. This research supports implementation choices, not a claim of Grok Bot/Kimi Swarm parity.

## What the comparison requires

[Grok Bot](https://docs.x.ai/grok-bot/overview) describes persistent user-scoped cloud computers, named agents, shared files/sessions, coordination and real application actions. Its [computer/app guide](https://docs.x.ai/grok-bot/computer-and-apps) and [approval guide](https://docs.x.ai/grok-bot/approvals-security-and-privacy) explicitly require human takeover for passwords, MFA and similar steps. A local scheduler cannot offer cloud availability while its host is off. Sharing browser state is also a real access boundary, not just convenience.

[Kimi's official swarm documentation](https://www.kimi.ai/help/agent/agent-swarm) describes learned orchestration, up to 300 workers and 4,000 workflow steps, with quality and critical-path objectives. Those are vendor claims and workload-dependent results. Increasing VAC's worker cap does not reproduce a trained orchestrator or demonstrate a speed/quality advantage. VAC-23, VAC-32, VAC-33 and VAC-42 require measured evidence.

## Candidate assessment

| Candidate / primary evidence | Fit and limitation | Decision |
|---|---|---|
| [Official MCP TypeScript SDK v1](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x), MIT | Fits Node 24/Zod; implements negotiation, tool discovery and Streamable HTTP. Default transport behavior still needs application limits and no uncertain-write replay. | Pin `@modelcontextprotocol/sdk` 1.30.0. Add bounded isolated HTTP tool sessions through existing public-network enforcement and owner tool grants. |
| [MCP transport specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports) | HTTP tool responses can be JSON or SSE; session headers, cancellation and errors are protocol behavior, not an ad hoc JSON-RPC POST. | Test both response modes, initialization, pagination, session termination, malformed/oversized responses and cancellation. OAuth, stdio, legacy SSE and background server-request capabilities remain outside this initial profile. |
| [DeepWiki MCP](https://docs.devin.ai/work-with-devin/deepwiki-mcp) | Documented free no-auth public-repository server. Generated documentation is not source-code authority. | Use a public repository structure lookup as external interoperability evidence; send no private VAC source or credentials. |
| [Deep Agents JS](https://github.com/langchain-ai/deepagentsjs) | Already integrated as a bounded planner. Replacing the harness does not solve model quality automatically. | Retain its pinned version and VAC authority kernel; constrain planner tool enums to actual run grants and preserve all failed trials. |
| [Deep Agents evaluation methods](https://www.langchain.com/blog/how-we-build-evals-for-deep-agents) and [eval repository](https://github.com/langchain-ai/deepagents/tree/main/libs/evals) | Authors emphasize task-specific correctness, full trajectories, clean environments and efficiency after correctness. | Predeclare corpus, repetitions and false-acceptance thresholds; evaluate the independent reviewer separately from producers. |
| [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai), MIT; [Promptfoo](https://github.com/promptfoo/promptfoo), MIT | Useful mature evaluation frameworks, but importing another runner is not itself evidence. Inspect adds Python evaluation infrastructure; Promptfoo can compare model/agent outputs. | Keep a small native reproducible evaluation artifact now; adopt a broader runner when the workload corpus justifies it. No dependency added merely for a feature list. |
| [Browser Use](https://github.com/browser-use/browser-use), [MIT license](https://github.com/browser-use/browser-use/blob/main/LICENSE) | Modern browser harness with an additional Python/native runtime and model assumptions. It does not supply account access or eliminate human verification. | Do not replace the existing browser and authority boundary blindly. Evaluate as an isolated specialist only after a target-app matrix and takeover contract exist. |
| [Playwright authentication](https://playwright.dev/docs/auth) | Existing stack supports isolated state reuse; storage state is sensitive and expiry still matters. | Build human takeover on explicit exclusive ownership, separate from agent actions; do not import a personal browser or claim saved cookies establish authenticated workflow support. |
| [Temporal durable AI](https://docs.temporal.io/ai), [idempotency](https://temporal.io/blog/idempotency-and-durable-execution) | Durable state/replay is useful but requires service infrastructure and idempotent activity boundaries. | Candidate for VAC-31 after connector intent/reconciliation contracts. No automatic retries of uncertain writes. |
| [BullMQ delivery semantics](https://docs.bullmq.io/bull/important-notes) | At-least-once execution can duplicate work after lost locks. Requires Redis and explicit idempotency/fencing. | Not a drop-in reliability fix. Preserve deterministic single-host controls until multi-host failures can be tested. |
| [openid-client](https://github.com/panva/openid-client) | Maintained server OIDC client; authenticating users does not establish authorization across all VAC stores. | Candidate for VAC-30, contingent on an identity provider and a complete ownership/role migration. Do not expose the single-owner service remotely by adding only a login form. |

## Work-item coverage of README gates

| README gate | Tracking |
|---|---|
| Single-owner/local deployment | VAC-29, VAC-30, VAC-31, VAC-34 |
| Human evaluation / no independently validated correctness | VAC-28, VAC-32, VAC-42 |
| Autonomous swarm accuracy and advantage over a single agent | VAC-23, VAC-32, VAC-33, VAC-42 |
| Imported script execution requires individual validation | VAC-37; VAC-11 is only the sandbox foundation |
| Failed/uncertain operation recovery and limited idempotency | VAC-38 |
| Large datasets / SQLite JSON / distributed workers | VAC-39, VAC-31, VAC-33 |
| Vendored-asset licensing | VAC-40 |
| Public-history secret review | VAC-41 |
| MCP and native services | VAC-24, VAC-25 |
| Authenticated apps and login handoff | VAC-26, VAC-27 |
| Constrained Settings defects | VAC-35, VAC-36 |

## Implementation sequence and external dependencies

1. MCP interoperability and durable connector intent records reduce practical integration gaps without weakening existing approval controls.
2. A separate reviewer receives only an owner-selected evidence packet and rubric. Exact quotations and input/output provenance are checked deterministically. Shared-model errors remain possible; the producing agent cannot act as its own reviewer.
3. Retest autonomous planning under the original baseline constraints after tightening schemas. A correct narrow report is not complex-workflow qualification.
4. Target native integration work at an explicit app matrix. Real accounts, permitted write actions and read-back checks are required; fixture acceptance alone is insufficient.
5. Always-on operation, identity and distribution require a selected deployment target, identity provider and resource budget. Long-horizon qualification requires elapsed observation time. None can honestly be closed by source changes alone.

## Research method and coverage

Exa was used for seven successful search queries (35 returned result slots before deduplication) across product requirements, MCP, harness/evaluation, durability, identity and browser authentication. Three additional searches returned temporary capacity errors and are not counted as reviewed sources. Twelve targeted URL fetches were requested; one obsolete article URL failed and was replaced by the official article found in a later query. Primary specifications, author repositories and reproducible fixtures drive implementation decisions; promotional roundups were excluded. Vendor statements are identified as claims. No Reddit advice was treated as technical authority.
