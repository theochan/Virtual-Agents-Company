# VAC-45 reviewed parameterized skills

VAC-45's completed-run capture scope is acceptance-complete and the Plane work item was closed as Done on 2026-09-24 after its evidence comment was read back. A successful swarm can now become an opt-in draft rather than an immediately executable copy. The owner sees the frozen template, inferred declared inputs, sanitized trace identity and redactions before approving or rejecting it.

## Contract implemented

- Capture accepts only a completed run. It retains owner-authorized workflow structure, branch dependencies, output contracts, failure limits, tool grants, connectors, browser policy and approval boundaries.
- The retained trace contains node identity, status and tool receipt metadata only. Model replies, tool observations, credential material and incidental page text are not promoted into instructions.
- Secret-like content is redacted before draft persistence. A draft containing a redaction marker or secret-like replacement cannot be approved.
- Inference currently declares the root objective as the default input. Owner review may additionally declare bounded task-text, worker-instruction, acceptance-criterion and semantic-review-criterion paths. Tools, connectors, limits, identities, browser origins and approval controls cannot be parameterized.
- Approval creates a new immutable version in the existing skill store. Replays and scheduled routines require all declared inputs, reject unexpected inputs and use the existing swarm engine, budgets, scheduler and approvals.
- Version records expose changed paths and parameter-definition changes. Rollback creates another immutable reviewed version; it never overwrites history or mutates already pinned routines.

## Acceptance evidence

Two distinct completed workflows were captured. Each was replayed once on each of three changed objectives, for six successful changed-input runs. Each workflow also rejected a replay missing its required objective, and unexpected authority-shaped input was rejected. A separate secret-bearing source run produced a redacted draft, could not be approved unchanged, accepted an owner-supplied safe replacement, exposed an objective diff in version two and rolled back to version one as version three.

The built browser flow passed from completed run through capture, inspection, owner reason, approval and changed-input replay. The existing interactive-action approval regression also passed, demonstrating that skill replay did not bypass one-time approval consumption.

Validation: TypeScript passed; source and production-bundle suites each passed 215 runnable tests with zero failures and six Docker-only skips; all 20 Chromium tests passed; build, publication inventory and whitespace validation passed. The existing Vite chunk-size advisory remains.

## Boundary

This closes completed-run capture and reviewed replay. Human browser-demonstration capture is intentionally not claimed because VAC-45 assigns that branch to VAC-26 takeover. This is not autonomous learning, runtime-planning qualification, deployment, commit or publication. Manual owner-authored immutable templates remain backward compatible and distinct from trace-derived reviewed skills.

Evidence: [sanitized acceptance summary](../evaluations/2026-09-24-reviewed-skills-summary.json) and [sanitized Plane closure receipt](../evaluations/2026-09-24-reviewed-skills-plane.json).
