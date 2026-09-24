# Bounded installed-model reviewer comparison

After the third accounting campaign finished, the role-paired reviewer correctly grounded its citations but rejected the correct signed-credit ledger in all three arms. This comparison tests model capacity without changing the task, default model, owner data, workflow gates or limits.

Freeze two packets before inference: reconstruct the exact failed planned-arm packet and assert its original packet hash; then construct a deliberately incorrect variant changing C7's signed amount from +200 to -200 and its total from 7,200 to 6,800. Original sources remain unchanged. The incorrect variant exists only in this isolated reviewer challenge; it is never accepted into an application run.

Compare the already-installed `qwen3.5:9b` and `qwen3.5:27b` sequentially on identical packets. Correct packet order: 9B then 27B; wrong packet order: 27B then 9B. Pin both model digests and source/driver hash. Each trial uses the existing two-stage policy, temperature zero, 1,536 output tokens and a 90-second per-call timeout. Maximum eight shared-ledger inference attempts. Provisional failures are not retried or reversed. No downloads, paid requests or persistent model/configuration changes.

Required result per model: correct packet accepted, incorrect packet rejected, no errors. Keep all stages, failures and timings, including load/swap time. This 24-GiB machine may incur loading or memory-pressure costs for the larger model; requests are sequential and limits remain fixed.

This is a two-packet development comparison, not independent holdout evidence, broad model qualification, an autonomous-workflow rerun or a reliability estimate. A favorable result identifies a candidate for further qualification; it does not authorize changing defaults or closing VAC-28.
