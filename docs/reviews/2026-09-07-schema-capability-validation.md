# Decision schema, capabilities and hierarchy — 2026-09-07

## Outcome

Implemented and deployed the decision-format and missing-capability improvements. Real hierarchical delegation remains a designed next phase, not a working feature. Research factual acceptance remains rejected.

## Implemented behavior

- Local Ollama receives an exact decision schema instead of generic JSON mode. Tool alternatives use exact server registry IDs and parameter schemas. Tools shown to decoding are restricted to the initial run tool set intersected with currently permitted tools. Server-side validation still applies; schema output does not grant authority. Other provider adapters retain existing behavior and do not gain an untested structured-output claim.
- Execution instructions require intermediate figures and preservation of fixed assumptions. Calculator receipts now preserve operands/operation, and final drafts append deterministic calculation evidence. This prevents a concise model summary from hiding the actual computed intermediates; it does not validate unrelated prose.
- Explicit web-search requests and API-declared `requiredToolIds` are checked before provider resolution and budget reservation. Missing capability creates an idempotent, durable blocked run with zero inference or tool calls.
- Runs display equipped-agent selection buttons, identifying direct subordinates using the Team hierarchy. Selection opens chat; the owner must submit the new request. It neither changes tool permissions nor automatically runs a subordinate.
- Same-workspace and autonomy/tool requirements restrict suggestions. Provider readiness is separate. The convenience phrase detector is not a complete intent parser; callers requiring deterministic coverage should declare `requiredToolIds`.

The Ollama implementation follows [the official structured-output interface](https://docs.ollama.com/capabilities/structured-outputs). Constrained structure is not factual verification.

## Validation

TypeScript checks passed. All 42 source tests, 42 built-server tests and seven browser tests passed. New tests verify exact schemas, missing-capability idempotency, zero spending, same-workspace candidate filtering, subordinate identification and selection without hidden execution or permission changes. Existing authorization, invalid-output, cancellation and restore tests remain passing.

[The repeated observation](../evaluations/2026-09-07-business-workflows-v2-observation.json) uses the exact same corpus hash and criteria as the prior failed evaluation. [The separate review](../evaluations/2026-09-07-business-workflows-v2-review.json) binds the raw observation's hash and records remaining errors.

| Workflow | Valid application drafts | Critical content passes | Direct-model content passes |
|---|---:|---:|---:|
| Release brief | 3/3 | 3/3 | 0/3 |
| Budget check | 3/3 | 3/3 | 3/3 |
| Recovery checklist | 3/3 | 0/3 | 0/3 |

Missing-tool behavior improved from three attempted unavailable calls/failures to **3/3 immediate blocked runs with zero provider receipts**. The application did not invoke another agent.

Release briefs retain material facts but have overlapping usefulness/productivity action items that need editing. Budget figures and the specified contingency are now explicit in the final output. Research responses are structurally valid but still contain material technical errors, including confusing a checksum with database integrity and, in two trials, using `SQLITE_OK` instead of `SQLITE_DONE` as the backup-step completion condition. The [SQLite API contract](https://sqlite.org/c3ref/backup_finish.html) and [integrity-check documentation](https://sqlite.org/pragma.html#pragma_integrity_check) are the review basis. These drafts must not be used as verified runbooks.

This remains a small, non-blind review by Codex. Neither owner correction minutes nor general factual reliability is established. Earlier observations remain unchanged.

## Deployment

Release: `releases/f6169b0d6b4e`. Source hash: `f6169b0d6b4e343c4641860921bf6f45739e075d9681f243856327b632e5f00d`.

[Installed evidence](../evaluations/2026-09-07-schema-installed.json) records the authenticated ready endpoint, unchanged pre-existing records, retained 30 quarantined legacy originals, successful backup scheduling and an installed missing-tool check without increased provider budgets. A fresh snapshot preceded replacement. Production paid-search allowance and existing agent permissions were preserved.

## What the hierarchy still needs

The Team page already stores reporting relationships and prevents cycles. It does not yet implement the delegation operation, child-run records, a yielding parent/child scheduler, shared root budgets, cancellation propagation, evidence return, or parent/child status display. The current single worker must release its slot while a child is queued, or a naive synchronous delegation implementation would deadlock.

[The implementation design](../hierarchy-delegation-design.md) specifies a direct-subordinate, same-project, read-only pilot with explicit delegation permission and bounded depth. It permits a manager without search permission to use an explicitly authorized search subordinate through delegation policy; it does not silently grant the manager search. Host scripts are independent and remain disabled.

Next: address research source grounding/model quality, obtain owner workflow review, then validate the bounded delegation pilot against a single equipped agent. Do not claim a successful child result certifies its facts.
