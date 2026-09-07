# Production readiness upgrades

Created: 2026-09-06. Updated: 2026-09-07. Status: verified local release candidate; operational rollout verified; owner-usefulness acceptance remains open. Unchecked items may be partially implemented; consult the dated evidence below.

## Current workflow update — completion and specialist routing

Successful runs and delegated subtasks now complete automatically after required-tool evidence checks. Users request revisions in chat; Audit retains execution evidence and exact-operation approvals, with no human draft acceptance step. Existing produced drafts transition once with a policy-change event, without claiming human approval or rerunning work. Completion describes execution, not factual verification.

Managers receive eligible subordinates' roles, expertise and responsibilities. Routing prefers Emma for market/company research and Marcus for software architecture, within hierarchy, project and tool permissions. Explicit user naming wins; ambiguous requests retain the model's eligible selection. Audit records the proposed and selected agent and the policy reason. Historical evaluation results below remain unchanged.

## Latest follow-up — read-only hierarchy delegation

The implemented pilot passes 52 source tests, 52 built-server tests and eight browser tests. Three live search handoffs succeeded, but were slower than a single equipped agent and showed no quality advantage. An installed calculator handoff exposed copied delegation wording; the failed run is preserved and the corrected worker contract passed both isolated and installed real-model validation (installed: 14.7 seconds, calculator result 42). See the validation report below for final installed evidence and remaining limits.

## Prior follow-up — schema and capability fixes

[Schema/capability validation](docs/reviews/2026-09-07-schema-capability-validation.md): 42 source tests, 42 production tests and seven browser tests passed. The unchanged corpus now produces 9/9 valid drafts; release briefs and budgets pass their critical criteria 3/3 each, while research factual acceptance remains 0/3. Explicit missing-tool tests now block 3/3 before provider calls, with equipped-agent selection available. The earlier failed observations remain preserved.

Active release: `459dccf096da` (Team design restored; publication candidate committed). A bounded read-only hierarchy delegation pilot is now implemented and installed; [validation and remaining limits](docs/reviews/2026-09-07-delegation-validation.md). [The detailed design](docs/hierarchy-delegation-design.md) maps reporting relationships to bounded child-run authority, scheduling, budgets, cancellation and evidence. Host scripts remain disabled. Owner time savings and broad business readiness remain open.

## Latest acceptance result — workflow and legacy review

[The 2026-09-07 broader evaluation](docs/reviews/2026-09-07-workflow-and-legacy-acceptance.md) **rejects broad business-workflow acceptance**: release briefs 0/3 critical passes, budget calculations 3/3 with final-draft editing issues, research checklists 0/3. Direct-model baselines did not establish a generally acceptable replacement. Owner time savings remain unmeasured. These results supersede any inference of business quality from the earlier narrow synthetic corpus.

Legacy disposition is complete: 28 bundled sample records archived, two unsupported completion claims withdrawn, all 30 originals preserved with hashes. No imported record was promoted as verified business evidence. The active release is `da0435cd8c4d`; the header is now precise scope wording and Operations retains the limitations.

Next implementation priority: decision-format reliability and required-field quality, followed by graceful missing-tool preflight/agent selection. Host execution remains excluded. Delegation is an opt-in read-only pilot. Re-run a versioned evaluation after changes; do not alter the preserved failed results.

## Target and current verdict

The first release target is a **local, single-owner, single-agent workspace with human-reviewed outputs**. Production readiness means this defined product reliably performs its supported tasks, preserves its data, exposes failures honestly, and can be operated and recovered. It does not mean an autonomous company, arbitrary host execution, or a multi-user hosted service.

The candidate has passed the engineering checks documented below; the existing production service has now been replaced and verified after owner authorization. Authentication, transactional persistence, exact-operation approvals, failure handling, and scoped memory have already been hardened. Do not rebuild those features simply because they appear in an older review.

Evidence baseline:

- The 2026-09-05 assessment in this thread reran TypeScript checks and all 18 regression tests successfully. Tests required loopback access and used a deterministic provider fixture. This is not live-provider or business-quality validation.
- The [hardening validation report](docs/reviews/hardening-validation.md) records the delivered controls and an unsuccessful live OmniRoute test. That upstream failure is historical evidence, not a fresh diagnosis of the current gateway.
- The [README](README.md) defines the currently supported deployment and tool limitations.
- At document creation, `src/server/providers.ts`, `src/server/runs.ts`, and `src/server/tools.ts` contain existing uncommitted changes. Their presence does not establish that the running production build includes them.

Work below is in delivery priority order. Record the tested revision, environment, date, commands, artifacts, and unresolved failures when closing each item. A passing source test does not replace verification of the installed release.

## Alignment review — 2026-09-06

The current change set makes **partial progress**, not completion of the production release plan. See [the detailed code review](docs/reviews/2026-09-06-upgrade-alignment.md).

| Plan item | Current position |
|---|---|
| 1–3: release contract, live inference, business evaluations | Still open. Removing OmniRoute does not prove another provider works. |
| 4: research/retrieval | Tavily and Brave configuration and bounded adapters added; provenance, failed attempts, empty results, and source/guidance separation covered by fixtures. Real-provider acceptance and relevance/freshness evaluation remain open. |
| 5: full restore drill | Still open; existing snapshot-read test is insufficient. |
| 6: readiness | Partial: public liveness separated from authenticated storage/queue diagnostics. Worker progress monitoring, alerts and provider readiness remain open. |
| 7: deployment and recovery | Still open. This review does not deploy or certify the installed runtime. |
| 8: release engineering | Timeout validation and targeted regressions added. Fresh-clone release and automated browser CI remain open. |
| 9–10: budgets, growth, security and distribution | Still open. Search credentials are separated from database records, but paid-search limits and broader lifecycle/security work remain. |
| 11–13: optional scope | Remote access and host execution remain disabled; delegation is an opt-in read-only pilot. |

Unchecked work below remains a release gate unless a dated evidence record explicitly closes it. Historical baseline observations describe the original review, not defects assumed to remain after subsequent edits.

## Current alignment — 2026-09-07

This dated status supersedes the September 6 table. See the [candidate validation report](docs/reviews/2026-09-07-production-candidate.md) for build identity and check results. [Release contract](docs/production-contract.md), [operations](docs/operations.md), and [evaluation evidence](docs/evaluations/2026-09-07-local-release-v1-review.json) define the narrow claim.

| Priority / items | Verified work | Remaining gate |
|---|---|---|
| P0 / 1 | Three provisional workflows, model, limits and measurable criteria documented. | Owner confirmation that these are recurring useful workflows. |
| P1 / 2 | Live Ollama Qwen inference, calculator, approved document, rejection and cancellation passed. Receipts preserve provider/model identity. | Other models are outside this acceptance claim. |
| P1 / 3 | Fixed 24-case corpus: arithmetic 8/8, project summaries 7/8, Tavily research 8/8 automatic passes; maximum 34.748 seconds. Original failure retained with formatting review. | Actual human correction effort and manual/direct-model productivity comparison are unmeasured. |
| P1 / 4 | Tavily and Brave key input/removal/persistence, bounded adapters, failures and provenance covered. Tavily live citations passed; snippet limitation is server-enforced and live-tested. | Brave has no live-key acceptance; source-cited snippets do not certify full-page accuracy. |
| P2 / 5 | Full application restore preserves evidence and pending approval, avoids duplicate execution, and completes a new task. Local daily snapshot/retention implementation provided. | Schedule installed; first run and snapshot freshness verified. Cloud upload/restore remains user-managed and unverified. |
| P2 / 6 | Storage/worker readiness, Operations UI, bounded private logs and degraded failure tests passed. | Ongoing operator response and provider quality are not inferred from readiness. |
| P2 / 7 | Verified release builder, supervisor, launchd templates, build identity, shutdown/restart and PID-reuse tests. | Port-3001 replacement and installed live task acceptance passed; ongoing reliability remains an operational observation. |
| P3 / 8 | Fresh source installation passes typecheck, 39 source tests, build, 39 production tests, six browser tests and dependency audit. Browser coverage added to CI; secret and inventory scans passed. | Remote CI is not claimed to have run; no commit/push performed. |
| P3 / 9 | Indexed 10,000-run queue test, API paging, durable request reservations, default paid-search disable and cloud opt-in. | Full multi-collection resource soak and owner-approved paid spending policy; no exact dollar enforcement. |
| P3 / 10 | Logout, session revocation, token rotation, CSP and private release allowlist verified; runtime dependency license inventory recorded. | Full-source/vendor redistribution review remains outside this runtime release. |
| P4 / 11–13 | Remote multi-user access and host scripts remain disabled. Delegation is a bounded opt-in pilot. | Separate expansion projects, not local release requirements. |

The 15-minute installed-candidate soak passed: 180 readiness samples, 15 calculator tasks, one planned restart, zero failures, verified backup and database integrity. The detailed checklists retain partially satisfied items unchecked. [Installed acceptance](docs/evaluations/2026-09-07-installed-release.json) now verifies the running candidate and daily backup job. The proposed workflows have not yet demonstrated owner time savings.

## Priority 0 — Establish the supported release contract

### 1. Define what the first production release promises

**Problem:** “Production-ready autonomous company” is too broad to test. A reliable narrow assistant is a feasible first product; a collection of agent profiles is not evidence of useful execution.

Work:

- [ ] Select three recurring workflows the owner actually needs and describe their inputs, deliverables, permitted tools, and required evidence.
- [x] Declare supported provider/model combinations and the local single-owner deployment boundary.
- [x] Define task-specific acceptance rules, maximum latency, human review expectations, and failure/unsupported outcomes before evaluation.
- [ ] Map every advertised capability to a passing example or an explicit limitation. Keep imported skills, disabled execution, draft creation, and applied changes visibly distinct.

**Acceptance:** A written release contract exists, with measurable criteria for each supported workflow. Unsupported requests are blocked or clearly limited rather than implied to be supported.

**Dependencies:** None. This defines the scope of every subsequent gate.

## Priority 1 — Prove real execution and useful output

### 2. Validate a real provider end to end

**Problem:** Model discovery and fixture responses do not prove the configured model can follow the decision schema or complete tool-assisted work. The historical OmniRoute probe failed upstream; that provider has since been removed. Live validation must target a currently supported provider.

Work:

- [x] Diagnose the current selected provider with minimal inference probes. Resolve its configuration or choose a working supported provider; preserve failures as evidence.
- [x] Run relevant text generation, calculator-to-follow-up inference, approved document storage, rejection, and cancellation through the actual application.
- [x] Exercise provider unavailability, malformed responses, timeouts, and missing usage fields without invented completion or accounting.
- [x] Record requested model, returned provider/model identity where available, response IDs, latency, usage, tool receipts, and resulting artifacts.
- [x] Repeat successful cases sufficiently to measure reliability rather than accepting one lucky response. Set the required repetition count in the release contract.

**Acceptance:** The selected provider meets the declared reliability and latency thresholds. Approved document creation produces the expected stored artifact once; failures never create completed work. A model catalog is not accepted as inference evidence.

**Relevant code:** `src/server/providers.ts`, `src/server/runs.ts`, `src/server/tools.ts`.

### 3. Build a representative business evaluation set

**Problem:** Safe execution does not establish that the output is accurate, relevant, or worth using. Owner acceptance alone is not an independent quality metric.

Work:

- [x] Create a fixed set of representative tasks for the three selected workflows, including ambiguous requests, missing information, irrelevant retrieved content, and unsupported requests.
- [x] Define expected evidence and scoring criteria before running the set. A proposed starting size is 20–30 cases, adjusted to workflow diversity.
- [ ] Measure task acceptance rate, factual/source support, unnecessary tool calls, latency, usage, and human correction effort.
- [ ] Record failures and compare against doing the work manually or with a direct single-model interaction.
- [x] Include adversarial document/tool content that attempts to override the task or request unauthorized actions; verify the actual tool boundary holds.
- [x] Keep evaluation results versioned by application revision, model, configuration, and dataset version.

**Acceptance:** Every supported workflow meets its predeclared criteria and provides a demonstrated practical benefit. Report poor results honestly; do not rewrite thresholds after seeing failures.

**Dependencies:** Items 1–2. Repeat affected evaluations when retrieval or provider behavior changes.

### 4. Resolve the research and retrieval capability gap

**Problem:** The existing reference tool uses instant-answer summaries. It is not a general current-information research capability. The uncommitted fallback rewrites queries without preserving the executed query in the result, weakening provenance.

Work:

- [x] Decide whether the release supports only reference summaries or genuinely requires broader retrieval. Restrict the product claim if broader research is unnecessary.
- [x] If broader research is required, implement a bounded retrieval adapter with explicit source URLs, retrieval timestamps, available publication dates, and evidence tied to the answer.
- [x] Preserve the original query, every rewritten query, and which response supplied each result.
- [ ] Represent no results, stale evidence, unavailable sources, and partial coverage explicitly. Successful HTTP execution must not imply successful research.
- [x] Keep tool guidance separate from quoted source content; do not append application instructions as though they came from the source.
- [ ] Add tests for empty results, incorrect entity matches, query rewriting, source failures, and unsupported current-data requests.

**Acceptance:** Each evidence-dependent claim can be traced to a relevant retrieved source. Requests beyond the tool's coverage produce a clear limitation. If broad research is excluded, documentation and evaluations consistently enforce that scope.

**Relevant code:** `src/server/tools.ts`; provider/run evidence handling.

## Priority 2 — Prove recovery and operability

### 5. Perform a full backup and restore drill

**Problem:** The existing backup test reads a snapshot and checks that run records exist. It does not prove the application can operate correctly after restoration.

Work:

- [x] Back up a disposable workspace containing accepted runs, artifacts, reviewed memory versions, and pending approvals.
- [x] Restore into a new private directory and start the application against the restored database.
- [x] Verify database integrity, content hashes, record relationships, sign-in, artifact access, memory provenance, and pending approval behavior.
- [x] Interrupt a run and demonstrate explicit recovery without duplicate artifact writes or automatic retries of uncertain operations.
- [x] Define backup frequency, retention, storage protection, maximum acceptable data loss, and recovery time. Automate the selected backup policy as a separately implemented operational change.
- [x] Document recovery when the original disk is unavailable, including which configuration or credentials must be supplied separately.

**Acceptance:** A recorded restore drill meets the chosen recovery objectives and the restored application completes a new task successfully. Backup creation alone does not close this item.

**Relevant code:** `scripts/backup.mjs`, `tests/runtime.test.ts`, `src/server/store.ts`.

### 6. Add meaningful readiness and operational diagnostics

**Problem:** `/api/health` returns static OK. It does not prove the worker is progressing, storage can accept writes, or inference is available.

Work:

- [x] Keep liveness separate from storage, worker, and provider readiness. Show unavailable or untested components explicitly.
- [x] Track queue age, active run duration, recent worker progress, failures, and expired pending approvals.
- [x] Add bounded, structured logs with run/request identifiers and secret redaction. Define log rotation and retention.
- [x] Surface stalled work and storage failures to the owner with actionable recovery instructions.
- [x] Define how provider readiness is refreshed without unexpectedly spending money on every health request.
- [x] Test disk/write failure and worker failure paths in disposable environments; verify no false success acknowledgment.

**Acceptance:** A live process with a broken worker or storage is visibly degraded. The owner can identify a failed run's cause and next action from persisted evidence and diagnostics.

**Relevant code:** `server.ts`, `src/server/runs.ts`, `src/server/store.ts`.

### 7. Make startup, shutdown, upgrades, and rollback reproducible

**Problem:** A running process is not an operational deployment procedure. Source changes and the built runtime can diverge.

Work:

- [x] Provide a documented supervised startup configuration for the chosen host, with explicit working directory, data directory, Node version, environment handling, and loopback binding.
- [x] Test clean shutdown and forced termination during inference and approval handling. Verify restart preserves evidence and does not duplicate effects.
- [x] Exercise stale process-lock recovery, including an unrelated process reusing an old PID; avoid starting duplicate workers.
- [x] Record application revision/build identity in the release and expose it for local diagnostics without exposing secrets.
- [x] Document upgrade sequencing, backup requirements, migration compatibility, and rollback constraints. Do not assume an older binary can read a newer database.
- [x] Deploy a release candidate using the documented procedure, then verify authentication, persistence, worker progress, and a real task at the running endpoint.

**Acceptance:** A fresh setup and a restart reproduce the intended release, and a rollback/recovery drill preserves private workspace data. Installed build identity matches the reviewed release.

## Priority 3 — Close release engineering and resource gaps

### 8. Review pending changes and test the release artifact

**Problem:** Existing changes increase timeouts and alter reference lookup behavior. Passing the current suite does not establish that those specific changes are adequately covered or deployed.

Work:

- [x] Review the existing diffs in `providers.ts`, `runs.ts`, and `tools.ts` without overwriting unrelated work.
- [x] Validate timeout environment values as finite positive integers with explicit upper bounds; reject invalid configuration at startup.
- [x] Add focused tests for the changed behavior, especially rewritten queries, no-result outcomes, and cancellation during longer requests.
- [ ] Add browser CI coverage for sign-in, agent/project creation, task submission, approval/rejection, error display, and restart/reconnect behavior.
- [x] Test the built production server in addition to TypeScript source execution.
- [x] Verify installation and checks from a fresh checkout with Node 24 and `npm ci`; run dependency, secret, and inventory checks for the release candidate.
- [x] Resolve and document the authoritative package manager/lockfile so installation is reproducible.

**Acceptance:** The exact release candidate passes applicable automated checks and critical browser flows. Record source revision, build identity, test results, and remaining limitations. Commit, push, and deployment remain separate actions, not consequences of writing this plan.

### 9. Bound storage growth, queue behavior, and provider usage

**Problem:** Queue polling scans stored run records, which contain growing messages and receipts. Token accounting may be unavailable, and no monetary ceiling is enforced.

Work:

- [ ] Define the expected number of projects, retained runs, artifact sizes, queue size, and daily usage for the local release.
- [ ] Load-test at that scale and measure queue polling, API latency, event-loop responsiveness, and database growth.
- [x] Introduce indexed status queries and pagination where required; avoid repeatedly deserializing all historical runs to find queued work.
- [x] Establish archival/retention rules that preserve required provenance and do not silently remove pending work or approval evidence.
- [x] Bound requested work independently of provider-reported usage. Missing usage must remain unknown rather than zero.
- [ ] For paid providers, enforce an explicit spending policy using conservative reservations and/or provider-side limits; document uncertainty when exact prices or usage are unavailable.
- [ ] Verify queue saturation, cancellation, budget exhaustion, and long-running requests remain responsive and honest.

**Acceptance:** The declared workload meets latency/resource limits without unbounded growth or silent accounting assumptions. Paid-provider exposure is bounded before enabling it for routine use.

### 10. Finish local security and distribution hygiene

**Problem:** Existing containment is a baseline, not proof that every lifecycle or distribution concern is resolved.

Work:

- [x] Provide and test owner logout, session invalidation, and token rotation/recovery behavior.
- [ ] Review static-content security headers and frontend rendering of untrusted model, memory, and retrieved content; test relevant injection cases.
- [x] Verify private configuration, database files, backups, and logs remain excluded from release artifacts and Git.
- [ ] Complete origin, revision, and license/attribution records for distributed third-party assets; remove or resolve assets with unclear provenance before wider distribution.
- [x] Keep vendored scripts disabled unless individually validated under the execution boundary described below.

**Acceptance:** Owner access lifecycle works, relevant untrusted-content tests pass, and distributed assets have documented provenance and applicable notices. A root Apache-2.0 license alone does not close third-party review.

## Priority 4 — Conditional expansion gates

These are not prerequisites for the narrow local release if the capabilities remain disabled and accurately described. They become blockers before the corresponding scope is enabled.

### 11. Remote access or multiple users

- [ ] Design individual identities, session revocation, account recovery, and principal-specific permissions; do not reuse one owner token as multi-user authentication.
- [ ] Derive tenant/workspace identity from authenticated authority and enforce it across APIs, storage, tools, approvals, artifacts, and memory.
- [ ] Configure TLS, secure cookies, proxy/host/origin handling, request limits, and internet-facing abuse controls.
- [ ] Test cross-tenant access, membership changes, deletion/export, backup restoration, and approval ownership.
- [ ] Define service monitoring, incident response, data retention, and supported availability commitments.

**Acceptance:** A separately reviewed hosted release passes authorization and tenant lifecycle tests. Changing the listener address is not sufficient.

### 12. Host scripts or external write actions

- [ ] Use isolated workers with restricted filesystems, explicit environment variables, resource/time limits, and controlled network access.
- [ ] Give each enabled tool a versioned input/output contract, capability policy, and independent validation.
- [ ] Bind approvals to the exact external operation and implement idempotency or reconciliation for uncertain outcomes.
- [ ] Verify workers cannot access application secrets, escape allowed paths, or continue unauthorized work after cancellation.

**Acceptance:** Each tool passes containment and failure-path tests before activation. Prompt instructions and permission labels do not substitute for isolation.

### 13. Multi-agent delegation

- [x] Preserve the single-agent evaluation set as the comparison baseline.
- [x] Implement bounded delegation depth, total work/usage limits, cancellation propagation, durable ownership, and traceable child-run evidence. See `docs/reviews/2026-09-07-delegation-validation.md` for scope and evidence.
- [ ] Compare task quality, latency, cost, and review effort against the baseline on identical tasks.

**Acceptance:** Delegation demonstrates a measured benefit sufficient to justify added complexity and passes recovery/authority tests. Otherwise leave it disabled.

## Final local production release gate

- [ ] Supported workflows, providers, limits, and exclusions are documented.
- [ ] Real-provider and business evaluations meet predeclared thresholds.
- [x] Retrieval behavior matches the supported task claims.
- [x] Backup restoration and interrupted-run recovery are demonstrated.
- [x] Readiness, diagnostics, supervised operation, and upgrade/recovery procedures are tested.
- [x] The exact production artifact passes applicable source, runtime, browser, dependency, secret, and inventory checks.
- [x] Installed revision and runtime behavior match the reviewed release.
- [ ] Resource and paid-provider limits fit the declared workload.
- [ ] Relevant security and distribution gaps are closed; conditional capabilities remain disabled unless their gates pass.
- [x] A bounded operational soak meets a duration, workload, and failure threshold chosen in advance; incidents and recovery outcomes are recorded.

Only then label the defined local product production-ready. Keep autonomous correctness, remote hosting, script execution, and delegation claims out of that verdict unless separately proven.
