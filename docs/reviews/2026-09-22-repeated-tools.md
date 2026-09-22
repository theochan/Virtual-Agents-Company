# VAC-23 repeated operations and shared grants — 2026-09-22

The focused Qwen3.5 9B live trial passed all nine checks in 172.895 seconds: one planning call, 10 total model calls, seven tool calls including planning, two public browser reads, two separate file writes, a worker calculation of 15 and an independent coordinator calculation of 42. Both exported artifact hashes match stored records; both are version 1 from the current run. [Sanitized evidence](../evaluations/2026-09-22-repeated-tools-live-4.json).

This is a focused engine acceptance result. The [MSFT research workflow](../test-plans/ticker-research-workflow.md), factual-quality gates, repeated matched trials and holdout remain open. VAC-23 stays High / In Progress. No installed deployment, commit or push is part of this follow-up.

## Changes

- Operation sequences support up to 24 occurrences; grants remain deduplicated. Each pending operation and successful/failed receipt carries its own zero-based sequence index. One successful browser/read/write cannot satisfy another occurrence. Historical unique-tool sequences retain ordered receipt compatibility.
- Workers may use coordinator-required tool types within owner/profile grants. The coordinator still has its explicitly required sequence set and needs personal receipts; worker evidence cannot substitute. Sharing a tool is not permission to duplicate a responsibility.
- Exact successful side effects are blocked per node before another approval or dispatch. Nested JSON key order is normalized for operation identity. Different file destinations remain distinct writes. Existing connector intent records, exact approvals, uncertainty handling, cancellation, deadlines and budgets remain enforced.
- Artifact-producing workers receive the declared output contracts; previously only the coordinator saw them. This prevents relying solely on a planner's paraphrase of required field names. Contract correctness remains checked against actual artifacts, not prose completion claims.
- Planner instructions retain one named specialist's repeated operations in one worker. Capacity feedback includes worker/supervisor/coordinator counts; it does not silently remove work or enlarge limits.

## Preserved attempts

1. [Live attempt 1](../evaluations/2026-09-22-repeated-tools-live-1.json): four rejected plans, zero workers; the model split one researcher into three workers and exceeded the node cap. Failed in 90.029 seconds.
2. [Live attempt 2](../evaluations/2026-09-22-repeated-tools-live-2.json): execution completed but acceptance failed in 177.668 seconds. The output used `urls` instead of required `sources`, and changed the literal example.com URL. This remains a failed trial despite successful operation sequencing.
3. [Evaluator preflight 3](../evaluations/2026-09-22-repeated-tools-preflight-3.json): an unsupported array expectation was rejected before any model/tool call. The evaluator now expresses the same required URLs using supported scalar JSON paths. This is not a live attempt.
4. [Live attempt 4](../evaluations/2026-09-22-repeated-tools-live-4.json): all nine original acceptance checks passed. The source-field checks were also promoted into runtime artifact contracts; no required output or workload limit was relaxed.

The final candidate's executable-source hash is `cb402f2b6461e8a56c2184389c18195efb4d1f1e0fdbb2fb23711b9b5ef109cd`, matching the tested build. Raw reports and output files remain in ignored `data/evaluations/`. Report denominators honestly: three development live attempts, one successful, with implementation changes between attempts; this is not a fixed-candidate reliability estimate.

## Verification

- TypeScript and build passed.
- Full source suite with real Chromium and Docker enabled: 149 passed, zero failures/skips.
- Built-runtime integration suite: 19 passed, zero failures/skips.
- Regression cases cover distinct browser pages, repeated writes/reads, shared grants and personal coordinator evidence, failed-step accounting, duplicate receipts, reordered JSON arguments, connector approval/no duplicate dispatch, uncertain connector outcomes, interrupted write recovery and dynamic delegation before sequenced work.
- Live artifact content and source URLs were inspected; exported SHA-256 hashes independently recomputed. No financial recommendation or ticker-price evidence is claimed by this focused trial.
