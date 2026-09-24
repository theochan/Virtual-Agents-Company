# End-to-end comparison: no accepted runs

The frozen synthetic reconciliation comparison finished with **0/3 end-to-end acceptances**. Single and planned modes produced byte-identical ledgers that passed all deterministic checks but were rejected by semantic review. Autonomous mode wrote a different JSON structure instead of the required ledger; its runtime contract check rejected it before semantic review.

| Mode | Calls | Elapsed seconds | Artifact | End-to-end outcome |
| --- | --- | --- | --- | --- |
| Single | 5 | 75.4 | Correct ledger; complete source evidence | Blocked by semantic review |
| Planned | 7 | 116.2 | Same correct ledger | Blocked by semantic review |
| Autonomous | 7 | 129.2 | Invalid ledger structure; no required totals | Blocked by deterministic contract |

The single reviewer treated 214.75 major GBP and 21,475 minor GBP as conflicting values despite their equivalence. The planned reviewer rejected the signed-credit treatment despite the explicit rule and independently verified correct total. The autonomous coordinator also treated major/minor representations as a conflict and authored replacement JSON instead of using the deterministic materialization path. The gates blocked all runs; no failure was promoted to success.

There is also an evaluator defect: its autonomous artifact postprocessing assumed `content.totals` existed and threw while calling `.map`. The run status, contract rejection and raw malformed output were already preserved. The missing harness check table is not silently reconstructed in the raw results. A separate summary records the runtime evidence and this limitation. No retry was performed.

The [summary receipt](../evaluations/2026-09-23-e2e-accounting-summary.json) binds the original manifest and results hashes. All 19 local calls match the shared ledger increment; the 42-call cap and per-root limits were unchanged. Candidate/source hashes matched before and after the run. The exact source and output bytes are exported in the [owner review packet](../evaluations/2026-09-23-e2e-owner-packet/REVIEW.md). Human artifact judgment and correction time remain pending. TypeScript validation passed with archived data excluded before inference.

Single mode used fewer calls and less time for the same correct artifact as planned mode in this observation. Fixed run order, one task and one attempt per mode prevent a general efficiency claim. Autonomous mode supplied no demonstrated benefit here. The earlier Packet 03 reviewer pass did not establish end-to-end reliability.

Priority follow-ups:

1. Collect the owner's artifact judgment and actual correction effort, without repeating the identical A/B review or inventing timing.
2. In a new candidate, schema-check evaluator outputs before accessing rows/totals and preserve explicit invalid-artifact reasons without crashing reporting.
3. Constrain contract-bound output writes to deterministic materialization rather than letting the coordinator substitute arbitrary JSON. Keep the contract gate mandatory.
4. Provide the semantic reviewer with source-bound deterministic normalization/credit evidence while retaining original source inspection. Verify this against deliberately wrong totals, duplicate decisions and signs; do not bypass failed review or treat a prose explanation as arithmetic proof.
5. Reevaluate a separately frozen candidate and fresh task only after those repairs. These inputs are now exposed development evidence.

No model default, acceptance rule, deployment, service state, commit or publication was changed. This remains a bounded synthetic structured-input comparison, not proof of arbitrary document extraction, independent holdout qualification or swarm advantage.
