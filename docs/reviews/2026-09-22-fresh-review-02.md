# Owner-adjudicated fresh reviewer batch 02

**Failed acceptance.** The existing Qwen3.5:9b reviewer matched five of six owner judgments with valid structured decisions. F04 produced a protocol error. There were zero false acceptances, three supported controls accepted, two valid rejections and one invalid response. The predeclared zero-error condition failed.

The [human judgments](../evaluations/2026-09-22-fresh-review-human-adjudication.json) bind all six owner labels and reasons to the unchanged [packet](../test-plans/fresh-review-packet-02.md). Review time remains unknown. These cases were authored by Codex and adjudicated by Theo; they are not independently human-authored holdouts. This was their first candidate-model evaluation in this campaign. They are now exposed cases.

| Case | Human judgment | Model outcome |
| --- | --- | --- |
| F01 | Supported | Accepted after both stages |
| F02 | Unsupported | Valid rejection |
| F03 | Supported | Accepted after both stages |
| F04 | Unsupported | Protocol error: no structured review |
| F05 | Unsupported | Valid rejection |
| F06 | Supported | Accepted after both stages |

The [receipt](../evaluations/2026-09-22-fresh-review-02-summary.json) records nine calls out of a twelve-call cap, about 196 seconds, model digest, source and artifact identity, all outcomes, usage and raw evidence hashes. The shared inference ledger advanced by exactly nine reservations. Temperature stayed at zero, maximum output at 1,536 tokens, and timeout at 90 seconds per call. No retries, model switches, prompt edits or timeout increases occurred. Source hashes matched the preparation snapshot before intake and the execution manifest after completion. Labels and reasons were excluded from candidate prompts. The new driver was frozen after case authoring; this is not a claim of a pre-existing external qualification harness.

F04 returned `blocked` instead of `submit_review`. Its explanation demanded evidence citations inside the report being judged, confusing the reviewer response requirements with the report's content. The source supplied enough information to assess the conditional amendment. Blocking prevented acceptance of the incorrect report, but this is a protocol failure and incorrect explanation, not successful discrimination.

Next remediation: in a separate candidate, clarify that evidence references belong in the reviewer's structured response and that an uncited report can still be judged against the supplied source. Preserve strict schema validation and the two-stage gate. Validate the change using exposed-case regressions, then evaluate another freshly prepared, owner-adjudicated batch. Do not replay this consumed manifest or count a repaired F04 run as fresh evidence. No VAC-23/28/42 closure, model-default change, deployment or general reliability claim follows.

Subsequent [citation remediation](2026-09-22-review-citation-remediation.md) preserved this run and evaluated three separately frozen development candidates. The final candidate resolves F04's protocol failure but falsely rejects F01; overall acceptance remains failed.

Validation: four semantic-review tests passed. TypeScript passed with archived data excluded. The normal `npm run lint` remains blocked by four unresolved relative imports in the pre-existing archived `data/evaluations/2026-09-22-reviewer-models-v1-driver.ts`; that historical artifact was preserved.
