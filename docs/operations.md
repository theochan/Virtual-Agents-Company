# Local operation and recovery

Use Node 24 and npm with `package-lock.json`. `bun.lock` is a historical unused file; npm is the supported installer. Do not run two server processes against one data directory.

## Build and prepare a release

```sh
npm ci
npm run check
npm run test:production
npx playwright install chromium --only-shell
npm run test:browser
npm run release -- /absolute/new/private/release-directory
```

Run `npm ci --omit=dev` in that new release directory. It contains a verified asset manifest in `dist/build.json`, the production build, package lock and notices, and operational scripts. It excludes `.env`, data, credentials, Git history and vendored skill scripts. Keep source and runtime release identities distinct: `revision` identifies the base commit; `sourceHash` identifies the actual built contents, including uncommitted changes.

Use an absolute private `VAC_DATA_DIR`. The owner selected a local snapshot folder with cloud backup handled separately; use `<VAC_DATA_DIR>/backups` as the backup job's destination. Do not sync a running SQLite database/WAL as a substitute for completed snapshots. Cloud upload and restoration remain outside the verified application boundary. Keep LLM environment configuration in a private `.env` in the release directory or supply it through the process environment. Never embed keys in launchd property lists or paste them into reports. Search keys live separately in `search-credentials.json`; database-only restoration requires reconfiguring them. Legacy database pages/backups can retain historical keys.

## Supervision

Generate reviewable launchd files without installing anything:

```sh
node scripts/service-config.mjs /absolute/release /absolute/private/data /absolute/private/data/backups /absolute/new/plist-output
```

The service supervisor starts the production entrypoint, handles termination, and keeps bounded private service logs. launchd restarts it after exit with throttling. The backup job runs on load and every 24 hours. Install the reviewed property lists in the owner's LaunchAgents directory and load them only after checking the existing port-3001 owner, backing up data, and stopping that identified process. Do not run a second worker while the old service remains active.

The workspace lock records process identity and start time to recognize PID reuse. If startup crashed while holding `server-lock-recovery`, inspect running processes and the lock before removing the guard manually. If a legacy numeric PID lock points to an unrelated live process, verify that fact before recovery; the application deliberately fails closed when ownership is uncertain.

## Diagnostics

- `/api/health`: public liveness, with host/origin controls; no private paths.
- `/api/ready`: owner-authenticated storage, worker heartbeat/progress, expired approvals, build identity and attempt-budget evidence. HTTP 503 indicates degraded runtime.
- **Operations** in the UI exposes these diagnostics and recovery guidance. Model/search quality remains a separate live evaluation.
- `operations.jsonl`: event/status/request identifiers only, no prompts, raw errors or credentials; four files of approximately 1 MB each.
- `service.jsonl`: supervisor lifecycle events, two files of approximately 1 MB each. Startup errors may require a foreground run in a private terminal to diagnose; do not publish raw logs.

On storage failure, stop submitting new work. Preserve database/WAL files before diagnosis. Never label an acknowledged liveness response proof of provider readiness. On expired approval, review and cancel the affected run; expiration cannot authorize a write. On interrupted execution, inspect receipts before explicitly resuming.

## Backup and restore

```sh
VAC_DATA_DIR=/absolute/private/data VAC_BACKUP_DIR=/absolute/private/data/backups node scripts/backup-policy.mjs
```

Check successful backup completion, checksum sidecar and freshness. A paused/asleep host or unavailable backup folder means the 24-hour target may be missed. Snapshot retention applies only to policy-generated names after a new backup passes integrity checks.

To restore:

1. Stop the identified application process. Preserve the current data directory; do not overwrite it.
2. Verify the chosen backup's checksum against its sidecar and `PRAGMA integrity_check`.
3. Create a new private data directory and copy the snapshot as `workspace.sqlite`; never reuse stale WAL/SHM files.
4. Supply the required provider configuration and credentials separately. Startup generates a new owner token unless environment-managed.
5. Start a compatible release on a temporary loopback port. Sign in and verify artifacts, memories, approvals and build identity.
6. Inspect interrupted work. Approval resumes only the exact stored operation; do not blindly resubmit uncertain writes.
7. Complete a new calculator task, then switch the supervised service to the restored directory when accepted.

## Access lifecycle

**Sign out** invalidates the current browser cookie. Authenticated `POST /api/session/revoke-all` invalidates all browser sessions. Owner-token holders still have bearer access; revoking cookies is not token rotation.

For a file-managed token, authenticated `POST /api/session/rotate-token` requires the current token in `currentToken`. The server writes a new owner-only token file, invalidates all sessions and the old bearer, and returns no new secret. Read the new private token file and sign in again. For environment-managed tokens, change `VAC_ACCESS_TOKEN` privately and restart; the rotation endpoint refuses to silently override environment configuration.

For lost-token recovery, stop the service, preserve the old token file privately, and remove it from the active data directory so startup can create a new one. Environment-managed installations require updating their environment instead.

## Upgrade and rollback

Prepare and validate a new immutable release directory first. Back up before replacing the running release. Record old/new source hashes, schema versions, listener, and data-directory identity. Migrations currently add indexes and schema version 2; startup rejects newer unknown versions. Do not assume future migrations can be read by older binaries.

Rollback uses the previous release with its compatible pre-upgrade backup in a new data directory, followed by read-back and a new task. Preserve failed-upgrade evidence. Commit/push, full-source distribution, and production-service replacement are not implied by building an artifact.


## Active local installation — 2026-09-07

The owner-authorized service uses `releases/62487aa0dd08` and the existing absolute project `data` directory. LaunchAgent labels are `com.theo.vac` and `com.theo.vac.backup`. Both are installed under `~/Library/LaunchAgents`. The first scheduled snapshot was verified in `data/backups`.

The active service reads the private `.env` inside that release directory. Updating the source checkout's `.env` has no effect on this installed release. Change the active private configuration and perform a controlled restart when needed. Search request allowance is still zero by default; setting a nonzero allowance is a separate spending choice.

See [installed acceptance evidence](evaluations/2026-09-07-installed-release.json) for build identity, migration preservation, authentication, live task and backup results. The release and backups are ignored local operational files, not committed source artifacts.


## Current release after legacy review

The active release is now `releases/da0435cd8c4d` (2026-09-07), using the same data directory and backup schedule. Both LaunchAgents reference this release. The prior release remains available locally. The active private configuration is this release's `.env`. Legacy originals are preserved in `legacy-quarantine` records and pre-review snapshots; do not restore those samples to active business context merely to repopulate an empty list. See [workflow and legacy acceptance](reviews/2026-09-07-workflow-and-legacy-acceptance.md).


## Current schema/capability release

The active service and backup jobs now reference `releases/f6169b0d6b4e`. Existing data, permissions, private configuration and paid-search allowance were preserved. Runs can offer an equipped-agent selection after a missing-tool block; selection does not submit work. Local Ollama decoding now uses exact decision/tool schemas. See [validation](reviews/2026-09-07-schema-capability-validation.md) and [delegation design](hierarchy-delegation-design.md).

## Read-only delegation pilot

Set `VAC_ENABLE_DELEGATION=1` in the private service environment and restart through the release procedure. In Team, grant delegation permission to the manager and set the research agent's reporting line to that manager. Both need access level 3 or 4. Equip the subordinate with the required read tools and assign it to the project if the project has explicit assignments. The manager may lack web search itself. Its model receives the eligible subordinate list and can request a child; the server enforces actual authority.

Search additionally requires a configured provider and its daily allowance. This pilot does not raise `VAC_SEARCH_REQUESTS_PER_DAY`; a saved key alone does not enable paid search. Search credentials remain private and are not passed between models.

Runs shows parent/child links, shared reservations and deadline. Successful child and parent runs complete independently; request corrections through chat. Cancel either member to stop the entire tree. Interrupted execution needs explicit root resume, within the original 600-second wall deadline; no silent external retry occurs. Children may read project context, calculate or search, with at most two children and no grandchildren. Parent writes still require normal exact-operation approval. Disable the feature or revoke manager permission to block pending delegation work.

Passing transport and permission tests does not establish research accuracy. Previous research-runbook failures remain open. Use a single equipped agent for simple lookups when delegation adds no measurable benefit.

### Unlimited daily search

`VAC_SEARCH_REQUESTS_PER_DAY=unlimited` removes the application-wide daily Tavily/Brave request cap while retaining durable attempt counts. Authenticated readiness reports `requestLimits.search: "unlimited"`; usage records use `maximum: null`. Numeric values retain their existing meaning, including zero disabling paid search. Provider-side limits and per-run loop/time limits still apply. Inference limits are separate and do not accept `unlimited`.

### Delegation in Tasks

Every real child run creates one durable work item assigned to the child agent. Existing child-run evidence is reconciled at startup without re-executing work. Queued and active children display their current execution state. Blocked, failed or cancelled children return to Backlog with their actual outcome. Successful children move to Completed when their assigned work finishes, independently of the parent. These items cannot be manually reassigned, advanced or executed again; use Open parent run to review/cancel, or submit a new request. No percentage of inferred work completion is manufactured.

### Review and navigation

Successful runs and subtasks complete automatically after required-tool evidence checks. There is no human draft acceptance control in chat or Audit. Request corrections through chat. Audit retains run evidence, delegation selection reasons and exact-operation approvals. Completion means execution finished, not that facts have been independently verified.

Open **Settings → Operations** for diagnostics, backups and configured limits. Settings is the last main navigation item; Sign out occupies the separate bottom slot. The global status strip has been removed; Audit shows a badge only for pending approvals.


## Current completion and routing policy

The latest workflow supersedes the dated installation snapshots above. Use authenticated `/api/ready` to identify the installed build. Agent chat and Settings share the same provider/model assignment. Delegation includes role, expertise and responsibilities, with eligible specialist preferences for market/company research and software architecture. Historical produced drafts transition once to Completed with a policy event; no human approval or new execution is fabricated.
