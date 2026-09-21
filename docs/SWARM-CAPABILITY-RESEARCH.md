# Model-independent agent capabilities: research and delivery contract

Research date: 21 September 2026. This compares publicly documented product behavior, not private internals or audited vendor benchmarks. A single successful demonstration cannot establish overall parity.

## What the comparison actually requires

Grok Bot documents persistent computers, shared files, browser sessions, memory, collaboration, skills and recurring work. Its security documentation adds action previews, approval controls and human login handoff. Its enterprise offering describes microVM isolation, connectors and operational controls. These are infrastructure and workflow capabilities, not simply a larger prompt or recursive spawning.

Kimi's Agent Swarm documentation describes isolated worker contexts, parallel specialists and aggregation, with advertised upper bounds of 300 subagents and 4,000 tool calls. Those bounds are vendor claims, not measurements of VAC. Kimi Code's tool reference also covers practical execution and files. Local model choice does not remove the need for scheduling, memory discipline, executable tools, verification and resource limits.

| Capability | VAC implementation in this delivery | Qualification still needed |
|---|---|---|
| Manual, dynamic and mixed teams | Existing profiles plus temporary recursive workers, bounded inherited grants | Diverse unscripted tasks and long-horizon reliability |
| Coordination | Dependency DAG, cycle rejection, peer mailbox, retained evidence lookup | Replanning and rich cross-run collaboration |
| Context isolation | Per-node messages, progressive tool loading, bounded recent observations, durable full receipts | Retrieval quality and long-task information retention |
| Persistent files | Immutable versions, SHA-256, optimistic writes, project quotas, downloads | Large datasets, rich document preview and collaborative editing |
| Code and documents | Networkless resource-limited Docker, Python/shell, DOCX/XLSX/PPTX/PDF libraries | More runtimes, package policy, hostile-code hardening beyond Docker |
| Browser | Public-origin automation, private project state, TTL, exclusive profile lock, bound action approvals | Human login handoff, uploads/downloads, arbitrary authenticated real apps |
| External services | Exact allowlisted JSON-RPC tools/call gateway; backend credentials; write approvals | Full MCP handshake/session protocol and broad native connectors |
| Memory and reusable work | Owner-reviewed project memory, immutable skill templates | Automatic retrieval evaluation and sophisticated skill composition |
| Routines | Durable capped scheduling, idempotent dispatch, no overlap or missed-interval burst | Always-on deployment, wake/sleep support, multi-host failover |
| Completion quality | Current-run file/content/JSON contracts; retained failures | Independent semantic review, benchmark corpus and factual quality |
| Scale | Explicit local worker/model/tool/deadline limits | 300-agent/4,000-call distributed qualification, multi-user identity and enterprise operations |

## Priorities

1. Establish real tool and artifact boundaries before optimizing autonomous planning.
2. Keep orchestration deterministic: DAG validation, immutable grants, evidence-based completion, exact approvals and durable quotas.
3. Test one coherent sales-review workflow across the registry, then test autonomy separately. Scripted provider tests cannot establish model-driven planning quality.
4. Preserve failed evaluations. Redesign the failing component and repeat the same acceptance criteria; do not redefine a failure as success.
5. Leave scale and full-product parity open until measured. A Mac mini with several local workers is not equivalent to an always-on cloud product with hundreds of workers.

## Architecture correction during evaluation

The previous design duplicated the full tool catalog and accumulated observations in every model request. Expanding the registry caused context exhaustion before useful work. This delivery changes it to a tool directory plus an explicit working set of at most three tools. Selecting a working set unloads the spawn schema when delegation is not needed. Recent evidence is fitted to the original context envelope; the durable audit trail remains complete and `tool-evidence` retrieves node evidence. Subsequent dispatches no longer inherit an already-satisfied mandatory depth. Sandbox code failures receive at most one correction within the original quotas; uncertain external writes are never automatically retried.

Live trials then exposed invalid generated code, lost input assumptions and repeated work after successful artifact generation. The architecture now adds deterministic tabular document recipes, CSV schema context, separate tool permission/evidence contracts, owner-objective propagation and a validated repeatable-workflow mode. A fixed-plan trial still repeated evidence reads, so ordered tool stages now prevent successful steps from repeating and force progression. The final connector approval also rejected malformed nested numeric arguments; typed connector schemas now constrain model output and validate the call before approval. Fixed plans are evaluated separately from autonomous planning.

This is a targeted orchestration redesign. Replacing the whole application without evidence that its persistence, security and UI foundations are defective would add risk without solving the demonstrated failure.

## Sources

- [Grok Bot overview](https://docs.x.ai/grok-bot/overview)
- [Grok approvals, security and privacy](https://docs.x.ai/grok-bot/approvals-security-and-privacy)
- [Grok files and results](https://docs.x.ai/grok-bot/files-and-results)
- [Grok skills, routines and automations](https://docs.x.ai/grok-bot/skills-routines-and-automations)
- [Grok computer and apps](https://docs.x.ai/grok-bot/computer-and-apps)
- [Grok teams and enterprises](https://docs.x.ai/grok-bot/teams-and-enterprises)
- [Kimi Agent Swarm](https://www.kimi.ai/help/agent/agent-swarm)
- [Kimi Code tool reference](https://www.kimi.com/code/docs/en/kimi-code-cli/reference/tools.html)
- [Kimi Agent overview](https://www.kimi.com/en/help/agent/agent-overview)
- [Docker resource constraints](https://docs.docker.com/engine/containers/resource_constraints/)

## Harness comparison

The subsequent user-requested GitHub harness experiment integrates pinned Deep Agents JS as a bounded planner over VAC. Four full-workflow live trials did not qualify autonomous planning. The final trial remained within four model calls and rejected invalid inherited grants without executing work. See [harness architecture](HARNESS-ARCHITECTURE.md). The controlled owner-planned all-function workflow passed; that result does not erase the autonomous failures.
