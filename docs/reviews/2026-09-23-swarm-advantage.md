# Bounded swarm accuracy advantage demonstrated

A predefined two-reader workflow using local Qwen3.5 9B passed all three fresh release-log cases. Both single-agent baselines and autonomous mode passed none. This meets the frozen quality criterion, including the additional simpler-baseline check. The unchanged implementation also passed all three preceding development cases in planned mode.

This is an accuracy/reliability advantage on a small synthetic context-pressure workload with the current fixed context envelope. It is not general swarm superiority, autonomous-planning qualification, or a cost advantage.

## Fresh confirmation

| Mode | Fully correct | Median model calls | Median reported tokens | Median elapsed time |
|---|---:|---:|---:|---:|
| Planned two-reader swarm | 3/3 | 6 | 12,744 | 81.9 s |
| Single agent, checkpoints | 0/3 | 7 | 21,121 | 114.8 s |
| Single agent, direct reads | 0/3 | 4 | 10,850 | 78.9 s |
| Autonomous swarm | 0/3 | 7 | 14,658 | 115.7 s |

All fields, exact source quotations, current-run artifact provenance, actual source reads, completed status and required topology were checked. Missing-token-usage calls: zero. A second source-only implementation independently recomputed correctness for all 48 trials across the development, confirmation and extra baseline campaigns; all flags agreed. Positive outputs also have exactly the required JSON fields.

The direct baseline completed all three runs, but selected stale approval 11 rather than the later valid approvals. These were substantive source-selection failures, not merely formatting failures. The checkpoint baseline failed by repeating successful writes. Autonomous mode completed its fresh runs but produced source-inaccurate outputs.

Planned mode used six calls versus four for the direct baseline, about 17.5% more reported tokens, and slightly more median elapsed time. It is more accurate in this test, not cheaper. Three cases do not support a reliable speed claim.

## What changed

Coordinators receive concise child findings and original file identities instead of duplicate raw text that crowds the bounded context. Full source receipts remain in the child audit; original text can be reread. Ordinary file-write schemas no longer advertise accounting materialization when no accounting contract exists. Both behaviors have regression coverage.

The checkpoint baseline received explicit ordered read/checkpoint instructions with distinct filenames. The additional shorter baseline used read Harbor, read Summit, write result, finish, without scratch-file overhead. Both used the same source cases, model and root limits as the swarm.

## Freeze and scoring

The development and fresh confirmation manifests were both frozen before the development outcome. The confirmation changed dates, capacities and the latest approved positions (19, 20 and 22, rather than always 21). Model digest, implementation, limits and the scoring rule remained fixed. Expected answers were excluded from prompts and runtime acceptance contracts. Source truth was derived externally.

For each mode: one attempt per case, 14 model calls, 16 tool calls, five minutes, 250,000 input-token reservation and 30,000 output-token caps per root. Swarms could use at most three agents; single mode one. All inference was local Qwen, with no paid external services. The planned quality gate required 3/3 correct versus at most 1/3 for single; the extra direct baseline also had to stay at or below 1/3. No gate was relaxed.

## Failed development attempts remain part of the record

| Development campaign | Single | Planned | Autonomous | Calls |
|---|---:|---:|---:|---:|
| v1 | 0/3 | 0/3 | 0/3 | 44 |
| v2 | 0/3 | 1/3 | 0/3 | 51 |
| v3 | 0/3 | 0/3 | 0/3 | 63 |
| v4 | 0/3 | 3/3 | 0/3 | 62 |

The fresh confirmation used 63 calls; the additional direct baseline used 12. Total release-log evaluation effort: 295 local model calls over 48 trials, including all failed versions. The final six planned successes do not rewrite those earlier failures.

## Limits and next use

These are six correlated, machine-authored cases in one template family, three of them fresh-value confirmation. They are not independent human-authored holdouts or broad real-world evaluation. The single-agent context manager truncates lengthy observations; the demonstrated benefit is separation of source-reading contexts under that constraint. A deterministic parser solves this structured task directly and is not claimed to be inferior. Better single-agent retrieval/context management could erase this advantage.

The practical supported use is a predefined reader workflow for independent long-source extraction, followed by deterministic source verification. Autonomous delegation, broader research parity and the separate accounting qualification remain unproven. New checks are automated evidence, not additional human adjudication; owner review time remains unknown. No deployment, commit or push was performed.

## Validation

Full source regression suite: 213 passed, zero failed, six skipped. Type checking passed with the archived evaluation data directory excluded; no production source was excluded. Build passed with the existing bundle-size warning. Whitespace validation passed. The final source hash still matches the frozen confirmation.

## Evidence

- [Audited results, outputs, source truth, usage and hashes](../evaluations/2026-09-23-swarm-advantage-evidence.json)
- [Prospective freeze record](../evaluations/2026-09-23-change-log-frozen-confirmation.json)
- [Original test plan](../test-plans/2026-09-23-swarm-advantage.md)
- [Additional single-agent baseline plan](../test-plans/2026-09-23-direct-single-baseline.md)
- [Methodology limits](2026-09-23-swarm-advantage-methodology.md)

The raw versioned manifests, run databases and exact outputs remain in data/evaluations. The compact evidence above retains every trial result and failed campaign for review.
