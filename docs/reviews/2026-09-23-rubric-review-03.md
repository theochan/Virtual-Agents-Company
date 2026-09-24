# Packet 03: bounded rubric discrimination passed

All six model outcomes matched Theo's [recorded judgments](../evaluations/2026-09-23-rubric-review-human-adjudication.json). The frozen batch passed its declared acceptance rule: three supported reports accepted after both stages, three unsupported reports rejected, zero false acceptances, and zero protocol/inference errors.

| Case | Explicit requirement | Outcome |
| --- | --- | --- |
| G01 | Correct result; workings not required | Accepted |
| G02 | Same report, but workings explicitly required | Rejected for missing workings |
| G03 | Correct result and displayed calculations | Accepted |
| G04 | Correct total with incorrect displayed subtotals | Rejected for arithmetic errors |
| G05 | Correct mean; workings not required | Accepted |
| G06 | Incorrect mean; workings not required | Rejected for incorrect result |

The [evidence receipt](../evaluations/2026-09-23-rubric-review-03-summary.json) records nine local inference calls out of a twelve-call cap, approximately 175 seconds, model digest, packet and manifest hashes, token usage, all case outcomes and raw-result identity. The shared usage ledger advanced from zero to nine for the UTC day. Temperature remained zero, maximum output 1,536 tokens, and timeout 90 seconds per call. No retry, model switch, prompt edit, label change or timeout increase occurred.

Candidate source and driver matched the pre-authoring snapshot before and after execution. Packet, developer answer key and owner labels matched their frozen identities. All returned evidence references validated against source and report text. Expected labels and human reasons were not sent in model prompts. Owner review time and monetary cost remain unknown.

This supports using the [explicit result-versus-workings rubrics](../test-plans/result-versus-workings-review.md) in future task specifications. It does not establish that wording was the sole cause of improvement: these are new examples, without a randomized comparison against the old rubric on identical inputs.

The six cases form three correlated source scenarios and were authored by Codex, then adjudicated by the owner. This is a bounded first-exposure result for this candidate, not independently human-authored qualification or a broad reliability estimate. The earlier F01 failure remains unchanged. Packet 03 is now consumed; future tuning on it is development work. General semantic quality, full-workflow usefulness, independent case authorship and owner correction time remain open. No deployment, service restart, commit or push occurred.
