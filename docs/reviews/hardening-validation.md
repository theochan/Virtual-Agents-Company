# Hardening implementation and validation

Date: 2026-09-05. Base commit: `51a19c38eeed5f755e69ff79da26b25dc90ac33b`.

This records pre-commit validation of the implementation following the [publication-readiness review](2026-09-05-publication-readiness.md). The earlier report describes the old implementation, not the repaired runtime. Git history records subsequent publication of these changes.

## Delivered

| Review issue | Implemented boundary | Verification |
|---|---|---|
| Unauthenticated filesystem/Python access | Loopback-only listener, owner token/session, host/origin checks, immutable registry; no host script/file tools | Former escape requests denied; unauthenticated data API returns 401 |
| Fabricated success and metrics | Removed server and browser simulation paths; typed decisions and explicit failure; usage only from receipts, cost unknown | Provider 503, invalid JSON, invalid tools, division by zero and budget exhaustion fail closed |
| Fixed PostgreSQL orchestration | Removed scripted orchestrator; genuine single-agent model/tool/observation loop | Birthday request produces relevant fixture output; calculator result reaches subsequent inference |
| Lost tasks/memories/state | Transactional SQLite, durable run events/receipts and approvals; stable engine independent of agent edits | Restart, concurrent edits, corrupt input, backup and duplicate-worker tests |
| Decorative approval gate | Exact arguments hash, run/call binding, tool version, expiry and owner decision; resume same pending operation | Restart, rejection, replay, altered arguments and expiry cases |
| Memory scope/provenance | Workspace/scope/trust/expiry filtering; explicit reviewed versions; no automatic score-based policy replacement | Cross-workspace exclusion, candidate exclusion, promotion and restart |
| Mixed client/server truth | Server-backed UI, visible API failures, project-scoped conversations, dedicated run review | Headless Chrome sign-in, chat, run screen and full agent creation |
| Packaging and checks | Node 24, explicit production start, bounded responses, clean build, CI, patched dependency chain, skill inventory | `npm run check`, `npm audit`, inventory generation, Gitleaks |

Supported tools are project reads, bounded arithmetic, a fixed-service instant-answer lookup, and approval-gated draft storage. Arbitrary Python, imported skill execution and multi-agent delegation are disabled. This is a safer narrow baseline, not a claim that sandboxed arbitrary execution or general autonomous collaboration has been implemented.

## Automated and UI validation

`npm run check` passed: TypeScript validation, **18 regression tests**, and production build. The build completed without the former CSS or bundle-size warnings. `npm audit` reported **zero known vulnerabilities** after selecting patched `qs` 6.16.0 through an override.

Tests use disposable directories/ports and a deterministic provider fixture, without production provider credentials. They cover failure paths, authentication, entitlements, idempotency, approvals, cancellation, restart recovery, scope isolation, provenance, transaction rollback, migration preservation, duplicate-worker prevention, bounded responses and backup readability.

Headless Chrome verification used a separate profile and temporary workspace. Sign-in, project chat, Runs and approvals, project creation with a valid server-assigned membership ID, and agent creation through all five wizard steps succeeded without page JavaScript errors. The identity step contained 20 stock portrait options. These UI tests were executed locally; the current CI suite does not run Chrome.

## Live OmniRoute result: blocked upstream

Model discovery on the configured local gateway succeeded. Real inference did not:

- `auto/fast`: HTTP 502.
- Advertised direct model `dva/swe-1-7-lightning`: HTTP 500.
- A minimal direct diagnostic returned: `DEVIN_AGENTIC_HOME must be an absolute path inside the bridge sandbox`.

The requests were made from isolated application workspaces. No fabricated completion or work item was created. This identifies an external gateway/bridge configuration blocker; it does not prove all gateway providers fail. OmniRoute configuration was not changed, and successful live-model quality validation remains outstanding. Fix the bridge environment or select a working configured provider, then rerun a small relevant task and a calculator/tool task before claiming live readiness.

## Secret scan

Gitleaks **8.30.1** was downloaded from the official release and its published SHA-256 verified before execution. The scan covered all 15 reachable commits and a separate export of tracked/proposed source files; ignored workspace data was excluded from the export.

There were 19 findings in vendored documentation, security-scanner patterns, example code and tests. Each historical finding was inspected. The proposed-source findings matched those same paths/rules/lines and the files were byte-identical to their reviewed historical versions. No new finding or confirmed real credential was identified by this scan.

`.gitleaksignore` lists only the 19 exact historical fingerprints. It contains no directory-wide or rule-wide exclusions. A rerun of history with those reviewed fingerprints passed. This is evidence from a particular scanner and source snapshot, not a guarantee that no secret exists. Future commits and changed examples remain subject to scanning. Gitleaks CI comments and artifact uploads are disabled.

## Local deployment and migration

The former process was identified before replacement. Its in-memory records were captured privately, then the tested production build was started on the same port.

Read-back confirmed:

- Listener: `127.0.0.1:3001`, not all interfaces.
- Unauthenticated `/api/agents`: HTTP 401.
- SQLite integrity: `ok`.
- Preserved counts: **6 agents, 2 projects, 13 work items, 2 artifacts, 13 memories**.
- Original `state.json` and `state.pre-sqlite.json`: identical hashes.
- Generated access-token file permissions: owner read/write only (`0600`).

The 391-entry old tool catalog and old chat/runtime information were retained in the private archive. They were not activated as executable tools. Imported memories are candidates; legacy project/work/artifact records remain explicitly unverified. Old messages without reliable project scope are archived, not injected into new conversations.

Private data stays under ignored `data/`. The user signs in with `data/access-token`; the token itself is not included in this report. Database backups can be produced with `scripts/backup.mjs` and restored into a new data directory after stopping the server.

## Remaining gates

1. Demonstrate successful real inference and tool use with the user's planned Ollama model, or correct the external OmniRoute bridge/provider configuration and validate that provider.
2. Evaluate the single-agent baseline on representative business tasks. Only add delegation after measuring task success, cost and latency against that baseline.
3. If host execution is required, design a real sandbox and validate each executable tool before enabling it. A permission label is insufficient.
4. Before multi-user or remote hosting, implement principal-specific authorization, TLS/session deployment controls and tenant lifecycle tests. Current deployment is single-owner and loopback-only.
5. Complete upstream revision/ownership/license review for vendored assets. The 387 tracked documents and 10 license notices are an inventory, not legal clearance. The initial CI run exposed an ignored local document in the generated inventory; the generator now uses tracked files so local and fresh-clone results agree.
6. Review third-party rights and choose the intended project license before changing repository visibility. Committing and pushing source does not change repository visibility or resolve those licensing questions.
