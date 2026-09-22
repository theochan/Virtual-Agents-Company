# Open-source harness integration

## Decision, 2026-09-21

Use **Deep Agents JS 1.14.0** as an opt-in, bounded workflow planner. Keep VAC as the execution and authority kernel. This is a scoped harness integration, not a replacement of the whole runtime and not evidence of Grok Bot or Kimi Swarm parity.

| Candidate | Evidence | Decision |
|---|---|---|
| [Deep Agents JS](https://github.com/langchain-ai/deepagentsjs) | MIT, TypeScript harness built on LangGraph; planning, isolated subagents, filesystem context and summarization. [Customization](https://docs.langchain.com/oss/javascript/deepagents/customization) supports custom models and middleware. | Best fit for the existing Node/TypeScript app. Pin package and transitive dependency lockfile. |
| [LangGraph JS](https://docs.langchain.com/oss/javascript/langgraph/overview) | Low-level stateful orchestration runtime with persistence and interrupts. It explicitly distinguishes itself from a complete harness. | Used underneath Deep Agents. Adopting LangGraph alone would still leave us writing the planning harness. |
| [OpenHands SDK](https://github.com/OpenHands/software-agent-sdk) | MIT coding-agent SDK, Python agent/server with TypeScript client, local or isolated workspaces. | Useful for a future specialist coding service; replacing this application with a Python agent server adds a second execution lifecycle and does not directly resolve the observed business-workflow planning failures. |

## Implemented boundary

Owner objective and immutable grants → Deep Agents planning/todo loop → schema and topology validation → atomic VAC workflow compilation → existing bounded workers → deterministic artifact contracts.

The planner has only `submit_workflow`; the built-in todo middleware is disabled. VAC replaces the built-in filesystem/subagent middleware and also filters bound model tools and checks every harness tool invocation. It does not load host files, shell tools, personal browser state, remote subagents, credentials or arbitrary GitHub plugins. File operations, browser actions, code execution and recursive worker creation happen only through VAC's established kernel.

Every actual model call uses the existing Ollama adapter, local semaphore, timeout, pre-reserved root input/output/call budgets and durable usage receipts. Every planning call must submit or correct an executable workflow. Validation reports topology errors together rather than requiring one correction per error. Planning stops after four model calls; all planner tool calls consume the root tool allowance. The same 14,336-byte conservative context envelope applies. The harness cannot silently call a cloud model. A deterministic acknowledgement ends the graph after a valid submission; it is not counted or represented as model inference.

The planner submits one `executor: "coordinator"` tool-sequence entry and delegated `executor: "worker"` tasks with names, instructions, saved-profile IDs, prerequisite task keys, bounded tool sequences with repeated IDs for separate operations, required evidence tools and ordered `supervisors` paths. The compiler shares identical supervisor paths and derives their tool grants from the union of descendant tool sequences. It does not invent tasks, reorder tool sequences, discard dependencies or add tools. Compiled trees still pass profile, authority, depth, lifetime-node and completion-cycle validation. Manual mode requires saved profiles for both tasks and supervisors. Owner-supplied `plan` API inputs retain their existing format. Dry-run validation uses a SQLite transaction/savepoint rolled back without nodes, budget mutations or events. Only an accepted plan is compiled atomically. Coordinator and worker sequences may share authorized tool types for distinct responsibilities. A nonempty coordinator-required set still restricts the coordinator sequence to those types, but no longer removes them from worker grants. Grants are deduplicated while operation sequences retain each occurrence. Per-step receipt indices prevent a successful read or write from completing later occurrences. Successful identical side effects are blocked before another approval or dispatch; tool grants, profile restrictions, exact-action approvals and budgets still apply. The compiled root sequence must include every owner-required coordinator tool. Explicit parent/profile fields avoid relying on role labels to establish hierarchy or saved-agent reuse. No plan, invalid authority, cycles, over-budget topology or interruption means no compiled work. The model still chooses parameters and executes each worker's task; a correct plan does not guarantee correct execution.

The accepted plan, harness version, decisions, usage and result evidence are retained. Mid-planning shutdown follows VAC's existing interrupted/blocked recovery policy. This implementation does **not** automatically resume LangGraph checkpoints or replay uncertain external actions. It does **not** use unrestricted Deep Agents subagents, host filesystem or a distributed graph runtime.

## Operator use

In Swarm, select **Deep Agents — bounded workflow planner (experimental)**. Leave the owner workflow plan `[]` and coordinator sequence empty. Grant only needed tools, define artifact contracts, and choose realistic root limits. API: `harness: "deepagents"`; omitted/default `native` retains existing behavior. Saved skill templates preserve this choice.

A model failure is a recorded failure, not permission to expand budgets or remove artifact checks. Local inference eliminates per-token API billing, not latency, memory pressure, energy cost or the cost of wrong actions.

## Evaluation

The same synthetic sales objective is used for native, owner-planned and harness-generated runs. It requests all registry tools, a saved researcher, depth-two computation, dependencies, peer review, documents, memory, exact approved connector draft, skill and bounded routine. Search emptiness is recorded honestly. The connector is a local test fixture, not a real business integration. Model-generated plans must be labeled separately from owner-supplied plans; one success cannot establish broad autonomous reliability.

See the delivered acceptance JSON files for actual outcomes, including failures. The experiment is not an unrestricted harness benchmark: execution stays in VAC and planning uses a restricted Deep Agents configuration with VAC's structured Ollama decision adapter.

## Typed acceptance requirements and context handling (2026-09-22)

Optional `workflowRequirements` specify named assignments, minimum tool occurrence counts, prerequisite assignment IDs and coordinator minimum counts. They constrain acceptance without supplying an execution plan. Generated workers preserve `assignmentId` independently of display names and task keys. Requirement mismatches are aggregated for correction; rejected plans remain in the audit trail. Planning history carries compact tool counts, while executable plans and durable receipts retain ordered operations. The four-call planning allowance and 14,336-byte input envelope remain unchanged.

A requirement can name an owner-authored text `briefName`. At job creation, VAC freezes its text and hash; only owner files without a producing run qualify, with a 4,000-byte cap. Each assigned worker receives its frozen brief in fixed instructions. Subsequent file edits cannot rewrite those instructions. Matching brief-read observations can be compacted because the original instructions remain pinned. Retrieved pages and worker outputs cannot be promoted through this path.

Observation compaction preserves search source URLs before bounded snippets and reallocates unused space to longer observations. Full tool output remains in audit storage. These mechanisms improve context fit; they do not establish factual correctness of research.

Assigned workers with frozen briefs use their assignment instructions and bounded project context instead of repeating the entire multi-branch objective. Briefs must be complete for their assignments. Planned workers omit redundant registry entries and unrelated node records; workers with peer/evidence tools retain the node references they need. Tool observations are persisted before context preparation, so a subsequent context failure cannot erase successful observations from durable history.

## Priority 1 qualification controls — 2026-09-22

Workflow compilation now rejects plans whose necessary model/tool cost cannot fit immutable remaining limits, including repeated operations, each node's completion, planning already consumed and up to two semantic-review calls. This is an execution lower bound, not a success forecast. First-stage semantic passes now require a separately budgeted consistency confirmation; failed/inconclusive/ungrounded or unaffordable confirmation cannot accept the output. Both decisions are retained. See [the failed frozen pilot and targeted regression](reviews/2026-09-22-priority-one.md); general autonomy and swarm advantage remain unqualified.
