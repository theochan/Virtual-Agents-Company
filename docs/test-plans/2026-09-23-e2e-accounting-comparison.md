# Frozen end-to-end accounting comparison

One fresh synthetic supplier reconciliation task, executed once in each of three modes: single agent, explicitly planned two-reader workflow, and autonomous two-reader swarm. This measures complete integration on a bounded structured-input task. It does not measure arbitrary invoice/PDF extraction or real business usefulness by itself. The task combines two source formats, major/minor currency units, a cross-file duplicate and a signed credit reversal. Two currencies must stay separate.

All modes receive identical source bytes, objective, grants, deterministic reconciliation contract and result-only semantic criterion. The required deliverable is `ledger.json`, containing complete source-row evidence, duplicate decisions, signed amounts and per-supplier/currency totals. The report need not include prose calculations. Reviewers must compute/check the result themselves; field evidence and row coverage are mandatory deterministic contract requirements.

The independent expected values are derived in the preparation oracle using Python Decimal and checked against the application's deterministic extractor/reconciler before inference. Ground truth stays outside model prompts. The author is Codex, so “independent” here describes separate calculation implementation, not independent human authorship.

Freeze source, evaluator, corpus, declaration and installed Qwen3.5:9b digest before any campaign inference. Verify current source against the pre-authoring candidate snapshot. Refuse reused result paths. Every arm is attempted once, including failures; no repair, retry, model substitution or tuning during the campaign. Preserve failed outputs and decisions.

Per-root limits remain 14 model calls, 16 tool calls, five minutes, 1,536 output tokens per call, and at most three agents (single mode: one). A 90-second per-call timeout applies equally. Total campaign cap: 42 local inference attempts, reserved through the actual shared usage ledger. No paid services, search, browser, external actions or budget changes. Fixed order is single, planned, autonomous; latency includes loading and orchestration, so order effects limit comparisons.

Acceptance per arm requires completed status, a current-run ledger, exact independent totals, all four original rows, exactly one duplicate, complete deterministic contract verification, actual reads of both originals, valid topology and passing two-stage semantic review. Correct numerical artifacts from blocked runs are reported separately and do not count as successful completion. Record all calls, reported tokens, elapsed time, source/artifact hashes and failures. One observation per mode is descriptive, not a reliable performance ranking.

After execution, export original sources and the three artifacts as neutral A/B/C packets with the arm mapping retained separately. The owner judges each output, records concrete corrections and times their own review/correction work if measured. Unmeasured values stay unknown. Identical artifacts may be recognized and prior review creates learning effects; do not claim that neutral labels establish full blinding. Never modify originals to perform corrections. Human judgments do not override machine run failures.

No broad swarm advantage or VAC-23/28/42 closure follows from this comparison. Qualification and deployment remain separate.
