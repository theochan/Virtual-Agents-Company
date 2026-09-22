# Priority 1 implementation and qualification — 22 September 2026

**Priority 1 remains open.** The work produced concrete planning/review controls and a failed frozen pilot. It did not establish reliable autonomy or swarm advantage. Tracking: VAC-23, VAC-28, VAC-42; no duplicate tickets.

## Delivered source changes

- `workflowCapacity.ts` computes a necessary execution lower bound from every planned tool occurrence, missing required tool type, node completion, planning already spent and up to two semantic-review calls. Workflow requirements are checked before planning; compiled plans are checked before workers are persisted. Impossible plans fail atomically without expanding immutable limits. This avoids spending the remaining calls on a structurally unaffordable plan; it cannot predict all corrections or provider failures.
- Three live evaluation paths (`evaluate-semantic-review`, `evaluate-repeated-tools`, and live modes of `evaluate-swarm-workspace`) now charge the existing owner daily ledger instead of opening fresh effective allowances in temporary trial stores. Trial artifacts remain isolated. A regression proves separate trial directories share and exhaust the same allowance. Scripted fixture runs remain isolated.
- Semantic review now emits explanation/evidence before verdict. A grounded first-stage pass is provisional until a separate read-only consistency confirmation passes against the same immutable source/output packet. Contradictions, missing grounding, changed evidence, context overflow, cancellation or exhausted budget cannot leave a passing acceptance flag. Both stage decisions and their usage are retained. An initial failure is never reversed by a later stage.
- Confirmation uses the same configured reviewer model, so correlated errors remain possible. This is an additional gate, not mathematical proof or independent human adjudication. Numerical facts still need deterministic source-backed checks; exact quotation matching alone cannot establish source meaning or arithmetic correctness.
- Added frozen-manifest evaluation and a separately labeled known-failure regression. Golden answers are evaluated outside model prompts, not exposed as runtime output contracts. Existing working-tree changes were preserved.

## Frozen initial pilot — FAILED

[Declaration](../test-plans/priority-one-qualification.md), [sanitized evidence](../evaluations/2026-09-22-priority-one-summary.json).

Eight newly authored reviewer challenges: four correct controls accepted, three incorrect reports rejected, **one incorrect report accepted**. The wrong credit-note report said USD 135 instead of USD 105. Its explanation calculated 105 and concluded the verdict should fail, but its structured verdict was pass. This violates the predeclared zero-false-acceptance gate. No tuning or rerunning occurred during the frozen campaign.

The paired task used synthetic invoice inputs, identical model/tools/root budgets and independent golden-answer checks. Correct totals in cents: North 18,000; South 13,350; combined 31,350, with N2 deduplicated.

| Arm | Actual totals: North / South / combined | Model calls | Tool calls | Wall time | Accepted |
|---|---|---:|---:|---:|---|
| Single agent | 18,000 / 14,000 / 32,000 | 8 | 6 | 83.758 s | No |
| Two-specialist swarm | 10,700 / 8,550 / 19,250 | 11 | 7 | 134.416 s | No |

Both produced current-run files and valid execution topology, but wrong values. Calculator execution was real; it faithfully calculated the model-selected operands, which did not cover the source rows correctly. The swarm's reviewer also described wrong arithmetic as correct; exact source quotation checks downgraded its nonmatching escaped quotations to inconclusive and prevented acceptance. Do not loosen citation matching to make those reviews pass.

Reported tokens: single 13,807 input / 629 output; swarm 16,506 input / 1,155 output. Monetary cost and owner correction time were not measured. One fixed-order task cannot establish causal speed differences or general usefulness. It establishes **no demonstrated advantage**, not a universal conclusion that all swarms are worse.

This pilot consumed 27 shared inference attempts. Its source snapshot and raw trajectories are retained under ignored `data/evaluations/`; hashes are in the sanitized evidence. The initial source fingerprint and build fingerprint use different file inventories and are not interchangeable. The source snapshot permits reconstruction.

## Post-failure correction and regression

After preserving the failed pilot, the confirmation gate above was implemented. Three additional live calls tested:

1. Replay the recorded false-positive assessment, then ask the new consistency stage to audit it: **rejected**.
2. Correct USD 105 control through live assessment and confirmation: **accepted**.

This is a known-failure development regression, not a new holdout, not a rerun of the eight-case challenge and not a successful rerun of the invoice workflow. Runtime regressions separately cover disagreement, insufficient confirmation budget, changed evidence and successful two-stage acceptance. Full qualification remains open.

## Verification and operational boundary

- TypeScript passed; source suite **181 passed / 0 failed / 0 skipped**, with actual Docker and Chromium.
- Production build passed; built-mode suite **181 passed / 0 failed / 0 skipped**, with actual Docker and Chromium.
- Final build source hash: `f271b7f97c672f3bda581f1b2c8745b2b40272155530db77b38fca16d40f9012`.
- Early sandbox-restricted checks hit Chromium/loopback/process-identity permission errors; reruns at the authorized local boundary passed. No application gate was relaxed to address them.
- One existing context-only fixture had fewer default model calls than its own declared minimum workflow. It now declares the existing 96-call research workload budget; the new rejection regression covers unaffordable plans. No live limits or daily allowance were increased.
- Owner ledger after this work: **92 / 100 inference attempts used, 8 remaining** for 2026-09-22 UTC. Search count was unchanged by this work. No paid provider/search or external account write occurred. Plane tracking updates are separate.
- No installed runtime deployment, default-model change, commit or push. These are source/build results, not acceptance of a newly installed release.

## Next work, in order

1. VAC-23: fix source-row coverage and classification errors, not calculator arithmetic. Require source-backed per-record inclusion/exclusion evidence and deterministic reconciliation for structured numerical tasks. For the existing research workflow, preserve its unchanged substantive requirements; start only when the remaining allowance can cover at least its 57-call lower bound. That lower bound does not guarantee completion.
2. VAC-28: independently adjudicated, separately authored holdouts for the revised two-stage gate, including numerical source meaning, plausible but wrong reasoning, date/units and correlated errors. The eight exposed cases are now development data and cannot be reused as unseen evidence. Owner adjudication and broader task rubrics remain open.
3. VAC-42: repeat matched single-agent, owner-plan and autonomous-swarm arms across multiple representative tasks, counterbalance order and measure owner correction time. The owner-plan arm was explicitly outside today's one-pair pilot, not waived from final acceptance.
4. Keep the full MSFT trial, three fresh repetitions and separate holdout unqualified until actual evidence exists. Do not buy a pass by increasing worker count, quota, model entitlement or relaxing the acceptance rubric.

## Follow-up: owner removes local daily inference cap

The owner explicitly requested removal of the daily inference limit because inference uses the local model. The workspace `.env` now sets `VAC_INFERENCE_REQUESTS_PER_DAY=unlimited`; the reservation parser supports it, retains the cumulative ledger and returns null maximum/remaining. Numeric caps remain supported, with the existing 100 fallback if configuration is omitted. The example configuration and README describe this behavior. The current workspace ledger was read back at 92 used with no daily maximum; search remained 14/50. No model calls were made for this change. Per-workflow limits and paid-provider opt-in remain unchanged.

Four targeted budget tests, TypeScript and the production build passed. This follow-up has not deployed or restarted the separately installed release. The historical frozen results and their hashes above remain unchanged.

Proposed remediation, under existing VAC-23/28/42 ownership:

1. VAC-23: introduce a source-row ledger with stable source/version/row identifiers, parsed amounts, units, document type, duplicate identity and explicit inclusion/exclusion reasons. Require complete coverage; conflicting duplicates or uncertain classification block completion. Compute signed totals using deterministic code over this ledger and reconcile specialist outputs against the original source ledger at the coordinator. Matching totals alone are insufficient: omitted rows may cancel out. Validate with reordered rows, cross-file duplicates, conflicting duplicate amounts, credits, zero/negative values, and mixed currencies. Model-generated source classifications still need independent checks.
2. VAC-28: retain the two-stage consistency gate and exact grounding checks, but require deterministic validators for numerical claims. Where possible, cite stable source spans/row IDs and let the harness retrieve exact text instead of asking a model to retype it. Confirmed source identity is not proof of correct interpretation. Qualify the reviewer with separately authored, human-adjudicated unseen cases; the known-failure regression is not a holdout pass.
3. VAC-23/42: use typed specialist result contracts and enforce merge invariants for complete coverage, non-overlap, units and provenance. Route simple tasks to one agent unless independent work justifies delegation. Run matched single-agent, explicit-plan and autonomous-swarm arms across multiple tasks, counterbalance order, and measure correct completions and owner correction time alongside calls/latency. Compare another suitable local model only in a separately frozen experiment if these controls leave persistent reasoning failures. More workers or retries are not correctness evidence.

## Main-branch publication verification

After the owner requested Plane updates followed by commit/push, VAC-23, VAC-28, VAC-42 and VAC-20 were updated and independently read back. Responsibilities remain separated as above; no new or closed work items. Sanitized tracking receipts are in `docs/evaluations/2026-09-22-pilot-remediation-plane.json`.

The reviewed publication set includes the pending repeated-operation, workflow-requirement and browser evidence controls on which these evaluations depend. Final source and built-mode suites each passed 182 tests with zero failures/skips, with actual Docker and Chromium. All 17 browser end-to-end tests passed. TypeScript, build, publication inventory, production dependency audit and full-history/staged secret scans passed. Private configuration, owner data and raw evaluation trajectories are excluded from Git. Publication does not deploy the installed service or close Priority 1 qualification.
