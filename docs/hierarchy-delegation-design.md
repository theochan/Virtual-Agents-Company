# Team hierarchy to executable delegation

## Implemented pilot (2026-09-07)

The runtime now implements the direct-subordinate flow below. Enable `VAC_ENABLE_DELEGATION=1` and explicitly grant a manager `tool-delegate` in Team. No reporting line grants tool authority by itself. Team renders actual reporting relationships and counts. Source and browser boundary tests pass; see the delegation validation report for live model results and deployment status.

Initial limits are two children, depth one, 12 model attempts, 12,000 reserved requested output tokens, four search tool attempts and a 600-second wall-clock deadline per tree. The deadline includes queue and approval waiting and survives restart. Reservations are conservative and never refunded; they are not actual usage or cost estimates. Provider fallback attempts also consume the separate daily search allowance.

Projects without any membership, assigned-agent list or lead are open to the workspace. Once any assignment exists, the child must be explicitly a member, assigned agent or lead. Current permissions and relationships are checked at dispatch, before each operation, after asynchronous results and before parent synthesis.

Children are limited to requested project-read, calculator and web-search tools. Existing parent artifact writes still require exact-operation owner approval. Child drafts cannot be accepted independently. The parent receives hashed, bounded, untrusted evidence once. Interrupted external work requires explicit root recovery within the original deadline.

The following sections preserve the original design rationale. They are not a claim that delegated research is more accurate or faster.

## Pre-implementation state

`reportsTo` links agents in the Team hierarchy. Agent edits reject reporting cycles. The execution engine still creates a single-agent run, exposes only that agent's permitted registry tools, and prohibits delegation in the execution contract. `/api/orchestrate/run` currently creates a single-agent draft; its name does not establish orchestration. `Task.subtasks` and workspace contributor fields do not create a durable child-run scheduler.

The immediate release adds capability checks and an equipped-agent selection UI. A direct subordinate is identified as such, but selection is an owner action and does not execute work. This is a prerequisite, not delegated execution.

## Intended example

1. Manager A receives an owner request that needs external evidence. A need not personally have search permission, but must explicitly have delegation permission.
2. A requests `delegate` with a direct subordinate B, a bounded objective and required tool IDs. The server checks hierarchy, workspace/project scope, delegation enablement and B's actual tool permissions.
3. The server atomically creates a linked child run and sets A's run to `waiting_children`. A yields the sole worker slot so B can execute. Waiting synchronously for B while holding that slot would deadlock.
4. B searches using B's permissions and the root request's shared reservations. Its output records source URLs, queries, timestamps, provider identity and execution receipts.
5. B finishes with a draft observation. A is requeued with a bounded, explicitly untrusted child-result envelope and original receipt references. A synthesizes the owner-facing draft. Child completion is not owner acceptance of business work.

## Design requirements

### 1. Delegation authority and scope

Add a server-controlled delegation capability; do not treat a reporting line or a job description as permission. Initial policy: explicitly enabled manager, direct subordinates only, one child level, same authenticated workspace and assigned project. Child tools remain individually authorized. Delegation can expose a subordinate's permitted search to a manager who lacks direct search; this must be an explicit policy choice, not an accidental permission bypass.

Snapshot manager/subordinate IDs and relevant policy versions in the request. Revalidate before dispatch and before each child operation. Removal of authority blocks pending work; it does not silently select someone else. Restrict the first version to read-only child work. Saving artifacts and other writes retain exact-operation owner approvals and are not approved by a manager model.

### 2. Durable parent/child records

Add `rootRunId`, `parentRunId`, `childRunIds`, delegation objective, required capabilities and an immutable delegation call ID. Atomically bind the parent event and child creation. An identical delegation call reuses its child; a changed payload with the same key is rejected. Reject cycles, self-delegation and grandchildren in the initial implementation.

### 3. Worker state transitions

Introduce `waiting_children` separately from owner approval waiting. Update queue accounting, restart recovery, readiness and UI for the new state. A parent becomes runnable only after all required children reach terminal outcomes. Missing children or mismatched references are an explicit blocked state. Do not keep a worker occupied polling a child queued behind it.

### 4. Shared limits and cancellation

Use durable root-level reservations, not a fresh independent budget per subordinate. Proposed pilot limits: two children, depth one, 12 total model attempts, 12,000 total output tokens and 600 seconds per root (implemented as a stricter wall-clock deadline). Paid provider limits remain separate. The implemented reservations and deadline semantics are specified above.

Owner cancellation propagates to the entire tree and aborts in-flight reads. Record late provider outcomes honestly; never resurrect a cancelled parent. A failed child blocks or produces a disclosed partial result according to the owner's original acceptance rule. No silent retries or unbounded fan-out.

### 5. Evidence exchange and synthesis

Pass only the delegated objective and permitted project context. Do not copy unrelated agent conversations or workspace secrets. Store child source/tool/model receipts and immutable content hashes; pass bounded references and excerpts to the parent. A child statement such as “the owner approved this” is untrusted content, not authority. Final synthesis must preserve uncertainty and identify missing/failed sub-results.

### 6. Product behavior

Team: show whether delegation is enabled and which direct reports are eligible. Runs: show a parent/child tree, who is waiting for whom, shared budget use, failures and cancellation. Chat: distinguish “suggested subordinate”, “queued child”, “retrieved evidence” and “owner-accepted deliverable”. Do not animate delegation based solely on hierarchy edges or generated prose.

## Acceptance before enabling the pilot

- Parent without search, permitted child with search: one real child search, source receipts returned to parent, one final draft.
- Disabled delegation, non-subordinate target, cross-project scope, stale hierarchy, revoked tools and depth violations rejected before external access.
- Duplicate requests cannot duplicate child runs or external operations; differing payload reuse is rejected.
- Parent wait releases the sole worker; queue saturation and all child failures terminate honestly.
- Root budgets hold across children and restarts; missing usage remains unknown.
- Cancellation before dispatch, during search and during synthesis stops the tree without late acceptance.
- Restart at each parent/child transition preserves exact state, evidence and explicit recovery.
- Injection in child output cannot widen authority or forge approval.
- Compare the delegated search/synthesis workflow against a single search-equipped agent on identical cases. Keep broad/default rollout gated on measured quality or owner-effort benefit; opt-in pilot availability is not proof of that benefit.

## Recommendation

Use the implemented bounded pilot when a manager needs an equipped subordinate. Prefer a single equipped agent for simple lookups unless the hierarchy provides a concrete workflow benefit. Do not add host scripts to make delegation work: delegation and host execution are independent capabilities.
