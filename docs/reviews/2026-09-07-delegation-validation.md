# Direct-subordinate delegation pilot — 2026-09-07

## Verdict

The missing execution layer is implemented and locally installed as an explicitly permitted, read-only child-run pilot. A manager without search can request its search-equipped direct subordinate, release the worker while waiting, and resume with the child's recorded evidence. This is a working capability, not proof that delegation improves research or makes an autonomous company production-ready.

Active release: `326eb3044ba7`, full source hash `326eb3044ba7dcfc5e800ab1a13411e75576f7a3cd7e25cccab5fbd3040c0279`. The service pilot switch is enabled; existing agents were not automatically granted delegation permission. Production paid-search allowance remains zero. The owner must explicitly configure a nonzero allowance before routine Tavily/Brave use.

## Delivered behavior and controls

- Team now renders real reporting relationships and direct-report counts, replacing hardcoded example positions/counts. It exposes explicit manager delegation permission and shows the global pilot state.
- The server requires manager permission, autonomy 3+, a direct report in the same workspace, and project eligibility. A project with no assignment fields is workspace-open; otherwise the child must be listed as a member, assigned agent or lead.
- Child tools are the requested subset of project read, calculator and web search. No child writes or grandchildren. Parent artifact writes retain exact-operation owner approval.
- Durable root, parent, child and delegation-call links bind dispatch atomically. A duplicate call reuses its child; conflicting reuse is rejected. `waiting_children` releases the sole worker slot.
- Current authority is rechecked before operations and after asynchronous results. Missing/failed child evidence blocks the parent; no silent reassignment or automatic external retry.
- Parent evidence includes child receipts and a content hash, delivered once as bounded untrusted data. Child completion cannot mark business work accepted. Only the owner accepts the root draft.
- Shared limits: two children, depth one, 12 model attempts, 12,000 reserved requested output tokens, four search-tool attempts and 600 seconds wall time including queue/approval waiting. Reservations survive restart and are not refunded. They do not establish actual token use or dollar cost. Search provider fallback also consumes separate daily request limits.
- Cancellation of either member cancels the entire tree and aborts active reads. Interrupted execution needs explicit root resume within the original deadline.
- Runs displays lineage, child status, shared reservations and deadline.

## Automated validation

TypeScript check and production build passed. All **52 server tests** passed in source mode and the built-server suite; all **eight browser tests** passed. The new tests cover worker yielding, one-time evidence delivery, idempotency, hierarchy/workspace/project restrictions, revoked permission, child writes, grandchildren, fabricated required evidence, shared limits, queue saturation, cancellation during inference/search and explicit restart recovery. The browser test submits an actual API run through the server fixture and verifies the resulting child and Team/Runs UI. Fixture tests establish deterministic boundaries, not live-model quality.

## Live model comparison

Raw preserved observation: [`2026-09-07-delegation-live.json`](../evaluations/2026-09-07-delegation-live.json). Reproduction harness: `scripts/evaluate-delegation.mjs` (refuses to overwrite that observation). Three fixed narrow official-source lookups used local `qwen2.5:7b`, temperature zero and 1,024 output-token caps. The manager had only delegation; its subordinate had only search. The comparator was one search-equipped agent. Both performed independent live retrieval. No business data was sent and no production search allowance was changed.

| Lookup | Delegation | Single agent | Result |
|---|---:|---:|---|
| SQLite Online Backup API | 38.7 s | 13.7 s | Both returned the same official source URL |
| Node.js AbortController | 43.9 s | 20.9 s | Both selected the same old v14.17.4 documentation URL |
| Python sqlite3 | 42.9 s | 15.8 s | Both returned the same official source URL |

All three parents reached review with exactly one child and no direct parent search. Each child performed one successful search with nonempty results; the final URL appears in its source receipts. Each tree reserved four model attempts, 4,096 output tokens and one search-tool attempt. No grandchildren or child writes occurred.

The live corpus ran build `0cbdcc92b75f5245cf539a520bf479117124c2add0f83c450a3b48a6c0ad975f`. The final release additionally tightens explicit project-assignment enforcement, includes waiting parents in agent busy status, includes the reproduction script and clarifies concrete child objectives and delegated-worker responsibilities. The full regression suite was rerun on the final build. The installed smoke below exercises final-build assignment and real-model handoff.

Delegation was approximately 2.1–2.8 times slower. There was no demonstrated source-quality advantage, no owner-effort measurement and no statistical generalization from three cases. Selecting old documentation is a freshness limitation even though the requested contract did not require the newest version. Prior runbook factual failures remain open; transport success does not repair them.

## Deployment evidence

[`2026-09-07-delegation-installed.json`](../evaluations/2026-09-07-delegation-installed.json) records the pre-switch backup, built-asset hashes, authenticated installed build check, exact preservation of all existing non-settings records and retention of all 30 quarantined legacy records. Both service and backup launchd configurations point to the new isolated release. Existing agent permissions and production paid-search limits were preserved.

The first installed calculator handoff **failed safely**: the manager copied the request to delegate into its child's objective, and the child refused further delegation. The preserved failure is [`2026-09-07-delegation-installed-smoke.json`](../evaluations/2026-09-07-delegation-installed-smoke.json). Manager instructions now require a concrete work objective; child instructions identify it as the worker already delegated that work. No permissions were widened.

The exact failing objective then passed on corrected build `326eb3044ba7` in an isolated runtime in 17.7 seconds: [`2026-09-07-delegation-handoff-candidate.json`](../evaluations/2026-09-07-delegation-handoff-candidate.json). The full regression suite was rerun on that build. The subsequent activation encountered a launchd teardown/bootstrap race, preserved in [`2026-09-07-delegation-handoff-installed.json`](../evaluations/2026-09-07-delegation-handoff-installed.json). After the previous job was confirmed absent, bootstrap succeeded. [`2026-09-07-delegation-handoff-activation-recovery.json`](../evaluations/2026-09-07-delegation-handoff-activation-recovery.json) confirms the exact installed build, preserved database records, 30 quarantined records and restored daily backup job.

The final installed handoff **passed in 14.7 seconds** on `326eb3044ba7`: the calculator child returned 42 and the parent synthesized that result. It reuses the same clearly named verification agents and explicitly assigned project; its root remains a reviewable draft and the verification project is archived. See [`2026-09-07-delegation-handoff-installed-smoke.json`](../evaluations/2026-09-07-delegation-handoff-installed-smoke.json) for the actual outcome. No paid search is used by these calculator smokes. Failed observations are retained and are not counted as successes.

## Remaining priority

1. Improve evidence relevance, version/freshness selection and factual verification using a frozen evaluation set. Do not erase earlier failures or call all draft output correct.
2. Measure owner correction effort on real representative workflows before promoting delegation beyond an opt-in pilot. For a simple lookup, one equipped agent is currently the more efficient choice.
3. Exercise longer operational observation with real, owner-reviewed work. Current tests and short live cases do not prove long-term reliability.
4. Keep host scripts and broader autonomous actions outside this release. They are not needed to make hierarchy delegation work.
