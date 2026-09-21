# VAC-23 workflow dependency follow-up — 2026-09-22

Status: source implementation verified; complex autonomous qualification remains open.

The previous model comparison rejected dependencies between workers under different parents. Planned dependencies now resolve against keys in the same immutable plan, including other branches. No worker is moved, no dependency is discarded, and no grant is widened. Dynamic spawn batches retain their sibling-only scope.

A deterministic topology validator includes both explicit prerequisites and implicit supervisor waits for children. It rejects unknown keys, self-dependencies, parent cycles, ancestor waits and cross-branch completion cycles before nodes are written. Supervisors still cannot carry explicit dependencies; prerequisites belong on their leaf workers. Existing eligibility, inherited grants, tool sequences, depth, node limits, approvals and budgets remain enforced. Planner validation still rolls back rejected submissions and stops after four inference calls.

## Verification

- `npm run lint`: passed.
- `npm test` with local browser/network access: 127 passed, zero failed, two Docker tests skipped.
- `VAC_TEST_SANDBOX=1 node --import tsx --test --test-name-pattern='real sandbox|deterministic report recipe' tests/swarm-workspace.test.ts`: the two Docker tests passed.
- `npm run build`: passed; executable source hash `f7ecf62643deea466fa9958331a44cdbd63bd86fca8a5e8842e598f737101812`.
- `VAC_TEST_BUILT=1 node --import tsx --test tests/runtime.test.ts`: 19 passed.
- `git diff --check`: passed.

New regressions cover cross-branch prerequisite ordering and evidence delivery, blocking after prerequisite failure, atomic rejection of cycles through supervisors, unknown/self references, and generated plans with valid versus expanded inherited grants. Existing cancellation, planning-cap, authority and sibling scheduling tests remain passing.

The first restricted test attempt could not open a loopback listener or run its browser; those two failures passed when repeated with the required local access. These were environment failures, not counted as successful checks.

## Scope

The checkout already contained uncommitted MCP, semantic-review, UI and evaluation work. This follow-up changes only workflow topology validation, its planner instructions, regression coverage and related documentation. No installed release replacement, commit, push or Plane update is claimed.

## Live outcome

[The fresh Qwen3.5 9B trial](../evaluations/2026-09-22-workflow-topology.json) failed after 146.784 seconds and four planning calls, with zero workers spawned. Two submissions repeated tools in sequences; the last contained supervisor dependencies and child grants exceeding their parents. The model therefore did not reach a valid plan, worker execution or artifact qualification. The original objective, tool contracts and planning allowance were retained. The raw report is retained under the ignored `data/evaluations/2026-09-22-topology/` directory; the linked summary records its SHA-256.

VAC-23 remains open. The next bounded experiment should separate task specification from hierarchy construction, using a smaller planning schema and deterministic compilation while retaining grant, budget and completion-cycle checks. Increasing model size or repeating this failed trial is not supported by the current evidence.

Subsequent work: [the task-planner follow-up](2026-09-22-task-planner.md) records a later successful live trial after additional schema and tool-allocation changes. The failed topology-only trial above remains unchanged.
