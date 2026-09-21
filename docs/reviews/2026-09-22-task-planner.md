# VAC-23 task planner development trials — 2026-09-22

**Live trial successful:** [Qwen3.5 9B completed all 12 original checks](../evaluations/2026-09-22-live-harness-success.json) in 351.784 seconds, with one planning call, 17 total model calls, four delegated nodes and exactly one approved connector write. This is source acceptance for this fixed development workflow; broader VAC-23 qualification remains open.

This follow-up separates model-selected leaf tasks from deterministic hierarchy construction. The model supplies an explicit coordinator tool-sequence assignment and worker tasks with keys, names, instructions, saved-profile IDs, supervisor paths, prerequisite keys, tool sequences and evidence requirements. The planner exposes only `submit_workflow`; todo middleware is disabled. Owner-required coordinator tools are reserved for that coordinator in this bounded planner, while owner-authored plans and native runs retain their more flexible grants. VAC constructs shared supervisors, derives their grants from descendant tool sequences, and validates the entire tree against owner and saved-profile authority, depth, lifetime-node limits and completion dependencies. The owner-authored plan API is unchanged.

The browser's advertised argument schema now matches its strict runtime union: `navigate` takes a URL and returns page text; `read` refreshes an existing page and takes no URL. Previously the advertised schema admitted combinations rejected by the runtime.

## Recorded trials

All trials use the original synthetic sales workflow, original artifact/operation checks, four planning calls and 20-minute root deadline. Inputs are disposable workspaces with local Ollama and Docker, public Example Domain retrieval, and an exactly approved write to a disposable local connector. No production default or installed runtime was changed.

| Trial | Result |
| --- | --- |
| [9B task schema 1](../evaluations/2026-09-22-live-harness-9b-task-schema-1.json) | Planning accepted in two calls, five nodes spawned; browser `read` with URL rejected by runtime. 140.347 seconds. Plan also duplicated coordinator responsibilities. |
| [9B task schema 2](../evaluations/2026-09-22-live-harness-9b-task-schema-2.json) | Four planning calls exhausted, zero workers; repeated/missing coordinator tools. 112.210 seconds. |
| [27B task schema 1](../evaluations/2026-09-22-live-harness-27b-task-schema-1.json) | Four planning calls exhausted, zero workers; coordinator work placed in a worker and root sequence empty. 494.369 seconds. |
| [9B executor schema 1](../evaluations/2026-09-22-live-harness-9b-executor-schema-1.json) | Artifacts and research completed; reviewer blocked before required peer/evidence steps. Coordinator operations duplicated in the plan. 251.165 seconds. |
| [9B executor schema 2](../evaluations/2026-09-22-live-harness-success.json) | **Passed all 12 checks.** One planning call; 17 total model calls; 12 tool calls including planning; four delegated nodes; 351.784 seconds. |

Raw reports remain under ignored `data/evaluations/2026-09-22-topology/`; summaries retain raw SHA-256 hashes. These are development trials, not a holdout reliability estimate. This successful synthetic orchestration exercise does not prove business usefulness or general autonomous reliability.

## Candidate verification

- TypeScript passed.
- Full source suite with `VAC_TEST_SANDBOX=1`: 138 passed, zero failed or skipped.
- Build passed, executable source hash `9a696ad878b53454b8ef1983d5ad5fab7a9f5ffc703fd3918ab5899409e24870`.
- Built-runtime integration suite: 19 passed.
- No installed deployment, commit, push or Plane status change is claimed.

The evaluator now records an executable-source hash at startup and rejects a second connector approval, matching the original exactly-once requirement. The evaluation fixture, rather than the model, approves the valid local write, approves the memory proposal, and creates/pauses the test skill routine. Those fixture steps do not establish autonomous account authorization or scheduler management.

## Successful-run audit

The original objective and all original checks were retained. The model generated its workflow and all worker/coordinator decisions; no owner-authored plan was supplied. The successful run's captured executable-source hash matches the production build hash above.

- `summary.json`: revenue 600, cost 360, profit 240, rows 3.
- Six current-run output files at version 1: JSON, Word, Excel, PowerPoint, PDF and Markdown. All exported SHA-256 hashes match stored artifacts. Office ZIP integrity and PDF header checks passed; visual layout is outside this acceptance.
- Compute completed at depth 2 beneath TeamLead. The saved researcher performed search and browser navigation to Example Domain.
- Reviewer depended on both Compute and Researcher, read the summary, inspected Compute's actual node evidence, and sent its peer message to the coordinator.
- Coordinator personally executed project read, calculator (result 240), memory proposal, Markdown write and the single connector operation.
- Artifact contracts, all 11 registry tools, recursive execution, saved-agent reuse, dependencies, peer messaging, approved fixture memory, browser profile, exactly-once connector write, skill version and paused routine all passed the original evaluator.

The substantive changes were a simpler typed task representation, deterministic hierarchy/grant construction, explicit coordinator assignment, conservative separation of coordinator and worker tools, removal of an unused planning tool, and alignment of browser schema with runtime validation. No failed trial was overwritten. The evaluator's second-write approval rejection enforces its already-declared exactly-once condition rather than relaxing it.

Next qualification work is repeated matched workloads and an independent holdout, including cases where multiple actors need the same tool (outside this conservative planner profile). A single successful development trial is not grounds to close general autonomy or business-quality gates.
