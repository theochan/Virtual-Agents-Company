# Citation responsibility remediation

The targeted F04 protocol failure is resolved in the final local regression, but **semantic acceptance still fails**. The final candidate correctly accepts F03/F06 and rejects F02/F04/F05. It falsely rejects F01 after calculating its correct EUR 294.80 answer. This is source implementation plus bounded development evidence, not deployment or reviewer qualification.

The review prompt now assigns citation selection to the reviewer, preserves explicit task requirements, and distinguishes numerical correctness from a requirement to display intermediate calculations. Semantic-review calls specify `requiredTool: 'submit_review'`. The provider constrains local output to that tool and rejects incompatible responses with their usage receipt retained. Pass, fail and inconclusive remain available through the existing strict review schema. Ordinary agent calls retain their existing alternatives; neither evidence validation nor the two-stage acceptance gate is relaxed.

Three separately frozen candidates were evaluated on the same six exposed, owner-adjudicated cases:

| Candidate | Change | Supported accepted | False acceptances | Protocol errors | Verdict |
| --- | --- | --- | --- | --- | --- |
| 1 | Citation clarification in prompt | 0/3 | 0 | 6 | Failed |
| 2 | Also require the review tool at provider boundary | 1/3 | 0 | 0 | Failed |
| 3 | Also clarify when displayed workings are required | 2/3 | 0 | 0 | Failed |

The [receipt](../evaluations/2026-09-22-review-citation-regressions-summary.json) retains all outcomes, model identity, usage and manifest/result hashes. There were 22 calls across the three campaigns: 6, 8 and 8 respectively. Each campaign kept the 12-call cap, existing Qwen3.5:9b digest, temperature zero, 1,536-token maximum and 90-second timeout. No failed call was retried within a campaign. Reusing these cases across changed candidates is explicitly development regression, not fresh evidence. The original fresh-batch failure and all subsequent failures remain preserved.

The final F01 response recomputes the correct amount, then requires the report to demonstrate the calculation order despite instructions not to infer that presentation requirement. F06 exhibited similar over-rejection in candidate 2 and passed candidate 3. The remaining failure is interpretation of the criterion and required evidence, not arithmetic or response format. Zero false acceptances in this small sample does not prove general safety or usefulness.

Next work should separate result-correctness requirements from explicit process-evidence requirements in future task rubrics and evaluate that distinction with owner-adjudicated cases. Do not relabel F01, rewrite this consumed packet, remove confirmation, or treat safe blocking as successful completion. Further unseen qualification requires another fresh batch; independently authored qualification remains separate from these Codex-authored cases.

Validation: 11 focused provider/reviewer/adjudication tests passed; workflow integration passed 54 tests with three sandbox-dependent skips after rerunning at the permitted localhost/browser boundary. TypeScript passed excluding archived data. The normal project check remains affected by historical archived driver imports. Final manifest source hashes, packet/label hashes and original result hashes were verified. No commit, push, deployment or service restart was performed.
