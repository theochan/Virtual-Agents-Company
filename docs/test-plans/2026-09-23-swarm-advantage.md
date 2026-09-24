# Bounded swarm advantage experiment

Hypothesis: isolating independent source analyses in separate worker contexts improves extraction quality or latency on lengthy release change logs compared with the current single-agent workflow. This is a context-pressure synthetic development benchmark, not evidence of general intelligence, optimality against hand-written parsers, or arbitrary real-world research ability. Repeated prose in the logs stresses retained context; report that limitation with any result.

Three template variants each contain two independent 24-entry logs. All modes must select the latest approved entry, ignore later unapproved proposals, and return exact event ID, date, capacity, filename and verbatim entry sentence. A separately implemented source parser checks corpus truth before inference. Expected values are never exposed to the model or included in workspace acceptance contracts. Both source files must have actual read receipts and the result must belong to the current completed run. This task uses exact external source validation for every field; it has no semantic-review stage, identically across arms. It does not relax or replace the accounting workflow's separate mandatory review gate.

Compare single, planned two-reader workflow and autonomous two-reader swarm across the three fixtures in rotated S/P/A, P/A/S and A/S/P order. The single baseline is explicitly allowed and encouraged to checkpoint source facts into scratch files to avoid losing earlier observations. All arms have the same source inputs, read/write grants, root budgets, output requirements, model digest, temperature and 90-second call timeout. Existing limits remain: 14 calls, 16 tools, five minutes per root; at most three agents for swarm modes and one for single. At most 126 local calls total; actual shared usage reservations. No external services or paid requests.

Freeze model, source, driver, fixtures and gates before inference. One attempt per fixture/mode; preserve all failures. No retries, tuning, fixture substitution or budget expansion during this campaign. Variants are correlated and only three observations per arm; any advantage claim must remain bounded to this exact workload and implementation.

For each swarm mode separately, demonstrate either:

- **Bounded latency advantage:** all three outputs correct in both it and single mode, at least 15% lower median elapsed time, and no higher median model calls or reported total tokens.
- **Bounded quality advantage:** all three outputs correct versus at most one of three correct for single mode, under the identical root budget caps. Costs and durations still reported; do not call this a cost advantage.

Anything else is NOT_DEMONSTRATED. An advantage for planned workflow is not evidence of autonomous planning advantage. No deploy/default change, broad qualification or earlier-failure reversal follows.
