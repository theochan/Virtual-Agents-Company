# Local production candidate evidence — 2026-09-07

## Verdict

Engineering candidate prepared and tested for a local, single-owner, human-reviewed draft workspace. The owner subsequently authorized rollout. The installed port-3001 release passed operational acceptance below. Owner productivity and unattended continuous-service reliability remain unproven.

## Identity

- Base Git revision: `e543b44f093ae9900f95f57de23d0476acc5a8d7` with uncommitted changes preserved.
- Built source hash: `62487aa0dd08374d669439ee0b22d76bc97b225106e032c5b68001cb823af019`.
- Node: `v24.19.0`; npm and `package-lock.json` are authoritative.
- Durable prepared runtime: `releases/62487aa0dd08/`, dependencies installed with `npm ci --omit=dev`.
- The working build, clean source-export build, disposable installed candidate and durable candidate have identical source hashes and asset hash lists. The clean export has revision `unknown` because it intentionally excludes Git metadata.
- Launchd files: `releases/service-config-62487aa0dd08/`; both pass `plutil -lint`. Both were subsequently installed under `~/Library/LaunchAgents` and loaded after owner authorization.

## Validation

A fresh source export without dependencies or build output passed `npm ci`, `npm run check`, `npm run test:production`, `npm run test:browser`, and `npm audit --audit-level=moderate`. This establishes clean-install behavior of the actual dirty source contents, not publication of a clean Git commit.

- TypeScript checks and production build passed.
- 39 source tests and 39 built-server tests passed.
- Six headless Chromium browser flows passed: lock/sign-out/readiness; search key save/reload/remove; task approval/acceptance/provider error; agent creation; rejected operation; project creation.
- Tests exercise full application restore into a new directory, exact-once approval after restore, new task after restore, worker/storage failure, request budgets, 10,000-run indexed queue lookup, token/session lifecycle, shutdown/recovery and PID reuse.
- Dependency audit: zero reported vulnerabilities at observation time.
- Gitleaks 8.30.1: source export scan and 18-commit history scan passed with existing reviewed ignore configuration. This is bounded scanner evidence, not proof that secrets never existed elsewhere.
- Skill inventory: 387 documents and 10 license entries remained stable.
- [Runtime dependency inventory](../evaluations/2026-09-07-runtime-dependencies.json): 164 installed packages with declared licenses recorded. Vendored skill trees are excluded from the runtime release; full-source redistribution review is separate.
- `git diff --check` passed.

## Live model and search

[The fixed corpus](../evaluations/local-release-v1.json) and [raw observation](../evaluations/2026-09-07-local-release-v1-observation.json) use local Ollama `qwen2.5:7b` with Tavily search. Automatic results: arithmetic 8/8, project summaries 7/8, research 8/8; median case latency 10.084 seconds, maximum 34.748 seconds. Each workflow met its predeclared minimum of 7/8 and 120-second maximum.

[Separate review](../evaluations/2026-09-07-local-release-v1-review.json) preserves the original formatting false negative (`SGD 12,000` versus the marker `12000`). The raw run is not rewritten. Research drafts did not reliably state their snippet limitation, so the server now appends a deterministic disclosure; [subsequent live lifecycle evidence](../evaluations/2026-09-07-live-lifecycle.json) verifies that correction, approval exactly once, rejection and cancellation. The lifecycle build's runtime assets match the candidate; later source-hash changes are operational script additions.

These tests demonstrate bounded execution and rubric performance. They do not independently verify all source facts or measure owner correction time. Brave has fixture coverage only; paid cloud providers are not part of the live release claim.

## Backup and deployment boundary

The owner selected local snapshot folders and separately managed iCloud/Google Drive backup. A consistent, integrity-verified snapshot of the existing workspace was created in `data/backups` with an owner-only checksum sidecar. The backup does not include the separate credential file; historical database pages may retain previously stored credentials. Cloud transfer and cloud restore are unverified.

The prepared backup job runs on load and every 24 hours, retaining at least 30 snapshots and pruning only its recognizable completed snapshots older than 30 days. The generated service uses the durable release and existing absolute data directory. After owner authorization, the identified old server PID 53916 was stopped cleanly and both LaunchAgents were installed and loaded. The new server PID at verification was 93697. Existing state contained no queued/working/waiting runs at cutover. A new pre-upgrade snapshot was verified before stopping the old process.

## Remaining acceptance work

1. **Completed:** [15-minute installed-candidate soak](../evaluations/2026-09-07-release-soak.json): 180 authenticated readiness samples, 15 calculator tasks, one planned restart, no failures, one verified backup and database integrity `ok`. This is bounded smoke evidence, not a long-term reliability claim.
2. **Completed:** existing service replaced, daily local backup schedule installed, and installed build identity plus a live Qwen/calculator task verified.
3. Confirm that the three provisional workflows are useful for the owner's actual workload and measure correction effort against a manual/direct-model baseline.
4. Choose a nonzero routine Tavily/Brave request allowance only with a suitable provider-side credit limit. Paid search remains disabled by default; request reservations are not dollar accounting.
5. Verify cloud backup restoration if disk-loss recovery is required. Local snapshot tests do not establish that external boundary.

Remote access, multiple users, host script execution, external writes and delegation remain excluded.


## Installed acceptance — owner-authorized rollout

[Installed evidence](../evaluations/2026-09-07-installed-release.json) records the completed switch on 2026-09-07. The running source hash is `62487aa0dd08374d669439ee0b22d76bc97b225106e032c5b68001cb823af019`. The service binds only to `127.0.0.1:3001` under launchd supervision.

Authenticated readiness and browser-cookie sign-in passed; unauthenticated readiness returned 401. Database schema is 2 and integrity is `ok`. All 45 pre-existing records selected across agents, projects, runs, artifacts, memories, approvals and work items retained identical contents through migration. This comparison excludes settings, which are deliberately migrated/updated.

A dedicated local verification agent completed a calculator-assisted Qwen task (19 + 23 = 42) in 11.597 seconds, preserving model/tool receipts and leaving its result as a reviewable draft. Its verification project was archived; the agent and run remain as acceptance evidence. Existing agents were not reconfigured.

The daily backup LaunchAgent completed its first run with exit code 0. Its new snapshot passed integrity and checksum verification with file mode 0600. Both job definitions are installed with private permissions. The Tavily credential migrated to the private credential file with mode 0600; Brave remains unconfigured. Paid search remains disabled at the default zero daily allowance; no new paid spending policy was inferred from deployment authorization.

The release has a private copy of the environment configuration. Future configuration changes must target the active release's `.env` (or its service environment), followed by a controlled restart; editing the source checkout's `.env` does not change the installed service. Browser sessions from before restart must sign in again.
