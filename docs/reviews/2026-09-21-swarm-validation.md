# VAC AI Swarm implementation and validation

Date: 2026-09-21. Baseline: `0aace75052f0719f04b5d4d2009ce796979e182c`. Branch: `codex/ai-swarm` (historical pre-publication snapshot). Delivery tracked in Plane VAC-1 through VAC-8.

## Implemented

- Manual agents retained; existing-team, temporary-specialist and hybrid orchestration modes added.
- Durable temporary profiles, batched creation, immutable tool/model snapshots and idempotent dispatch.
- Concurrent workers with a shared Ollama ceiling across manual chat and swarm execution.
- Root-wide calls, input/output reservations, tool/search attempts, agent counts and deadlines.
- Root cancellation, restart detection and explicit synthesis-only recovery without replay of uncertain operations.
- Pre-approved calculator, project-read and web-search grants; existing-agent entitlements and workspace/project membership checked.
- Browser UI with objective, coordinator, team mode, limits, tool approvals, execution tree, budgets, receipts, verification controls and final output.
- New profiles default to local Qwen3.5 9B; existing stored profiles are not overwritten.
- Optional required coordinator tool evidence: one budgeted correction, then blocked if still unsupported.

## Validation evidence

`npm run check`: **77/77 tests passed**, TypeScript passed, production build passed. The tests include concurrency, shared limits, unknown usage, invalid provider output, workspace isolation, tool revocation, cancellation, restart and bounded verification correction. Existing manual-run tests also pass.

`npm run test:browser`: **11/11 passed** on the final built UI, including submission, execution tree, receipts, reload persistence and existing manual workflows. The browser suite uses a deterministic provider fixture, not Qwen quality.

Mac mini inspected: Apple M4, 24 GB unified memory. Downloaded and verified Ollama `qwen3.5:9b`, Q4_K_M, model digest `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`. Official model page: https://ollama.com/library/qwen3.5:9b . Ollama version observed: 0.33.3. Requests use a 16,384-token context and disabled thinking. After execution, Ollama reported the model loaded with 6,031,262,349 bytes of model memory; that is not a system-wide peak RAM measurement.

### Live observations, preserved rather than overwritten

1. Initial arithmetic swarm: **PASS**, 50.112 seconds, 7 model calls. Two temporary specialists produced calculator receipts for 391 and 400; coordinator calculator verified 791.
2. Follow-up after context changes: **FAIL**, 35.307 seconds, 6 calls. Correct numbers were returned, but the coordinator omitted its calculator receipt. The failure exposed that prompt instructions alone did not enforce required final verification.
3. After explicit root verification enforcement: **PASS**, 52.014 seconds, 8 calls, 3 calculator calls. The server rejected the first unsupported completion, allowed one correction inside the original budget, and completed only after the coordinator calculator produced 791. Reported usage: 5,244 input tokens and 407 output tokens; unknown-usage calls: zero. Two temporary specialists, zero permanent child profiles.

The raw JSON reports are in `docs/evaluations/2026-09-21-swarm-qwen-*.json`. No live paid web-search requests were made for this acceptance case. Search accounting and fallbacks have deterministic tests.

## Practical limits

This proves the stated mechanics on a bounded arithmetic case, not general task correctness or that a swarm outperforms one agent. The runtime deliberately supports coordinator-to-specialist fan-out; workers cannot recursively spawn. There is no general browser automation, shell, arbitrary script execution or external write integration. Search returns bounded snippets. Natural-language acceptance criteria are visible instructions; only explicit tool requirements are mechanically enforced.

The default is nine total agents, two concurrent workers, forty model calls and thirty minutes per root, configurable within server ceilings. Local inference has no per-token API bill, but still consumes time and compute; paid search still requires its separate daily allowance. No automatic budget top-up occurs.

This source change does not overwrite any earlier installed runtime or its private SQLite data. No Git commit or push is claimed. Model installation is complete; application source delivery and any future production-service deployment are separate.
