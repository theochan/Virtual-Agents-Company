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

The planner has only `write_todos` and `submit_workflow`. VAC replaces the built-in filesystem/subagent middleware and also filters bound model tools and checks every harness tool invocation. It does not load host files, shell tools, personal browser state, remote subagents, credentials or arbitrary GitHub plugins. File operations, browser actions, code execution and recursive worker creation happen only through VAC's established kernel.

Every actual model call uses the existing Ollama adapter, local semaphore, timeout, pre-reserved root input/output/call budgets and durable usage receipts. The todo list can be written once; subsequent calls must submit or correct the workflow. Validation reports topology errors together rather than requiring one correction per error. Planning stops after four model calls; all planner tool calls consume the root tool allowance. The same 14,336-byte conservative context envelope applies. The harness cannot silently call a cloud model. A deterministic acknowledgement ends the graph after a valid submission; it is not counted or represented as model inference.

The generated plan includes worker profiles, inherited grants, hierarchy, sibling dependencies and ordered tool steps. Dry-run validation uses a SQLite transaction/savepoint rolled back without nodes, budget mutations or events. Only an accepted plan is compiled atomically. When owner-required coordinator tools are specified, the planner selects its root sequence from that set and must include them all. Explicit parent/profile fields avoid relying on role labels to establish hierarchy or saved-agent reuse. No plan, invalid authority, cycles, over-budget topology or interruption means no compiled work. The model still chooses parameters and executes each worker's task; a correct plan does not guarantee correct execution.

The accepted plan, todo state, harness version, decisions, usage and result evidence are retained. Mid-planning shutdown follows VAC's existing interrupted/blocked recovery policy. This implementation does **not** automatically resume LangGraph checkpoints or replay uncertain external actions. It does **not** use unrestricted Deep Agents subagents, host filesystem or a distributed graph runtime.

## Operator use

In Swarm, select **Deep Agents — bounded workflow planner (experimental)**. Leave the owner workflow plan `[]` and coordinator sequence empty. Grant only needed tools, define artifact contracts, and choose realistic root limits. API: `harness: "deepagents"`; omitted/default `native` retains existing behavior. Saved skill templates preserve this choice.

A model failure is a recorded failure, not permission to expand budgets or remove artifact checks. Local inference eliminates per-token API billing, not latency, memory pressure, energy cost or the cost of wrong actions.

## Evaluation

The same synthetic sales objective is used for native, owner-planned and harness-generated runs. It requests all registry tools, a saved researcher, depth-two computation, dependencies, peer review, documents, memory, exact approved connector draft, skill and bounded routine. Search emptiness is recorded honestly. The connector is a local test fixture, not a real business integration. Model-generated plans must be labeled separately from owner-supplied plans; one success cannot establish broad autonomous reliability.

See the delivered acceptance JSON files for actual outcomes, including failures. The experiment is not an unrestricted harness benchmark: execution stays in VAC and planning uses a restricted Deep Agents configuration with VAC's structured Ollama decision adapter.
