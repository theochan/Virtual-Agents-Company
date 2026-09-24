# High-priority backlog work — 22 September 2026

The live Plane inventory contained 46 work items. VAC-38 and VAC-41 were already Done; their previous acceptance was not repeated or counted as new work. This change completes VAC-24's remaining bounded MCP conformance work and implements the missing owner-adjudication path under VAC-28. Other qualification gates remain open.

## VAC-24: MCP conformance

Supported profile: `@modelcontextprotocol/sdk` 1.30.0, Streamable HTTP, protocol versions `2025-11-25`, `2025-06-18`, and `2025-03-26`. JSON and finite POST SSE responses are supported. Each discovery or call initializes an isolated session and attempts termination. Endpoint checks, server-side bearer credentials, exact owner tool allowlists, write approvals and durable uncertain-operation recovery remain in force.

Fixed defects:

- Execution previously checked only whether the requested name appeared in the catalog. It now shares discovery's complete-catalog validation: no duplicate names, at most 100 tools over five pages, and no repeated or empty continuation cursors. A requested tool on page one cannot bypass a bad later page.
- The SDK allowed listing/calling tools without negotiated tool capability. VAC now enforces that capability before either operation. The new conformance test initially failed on this behavior and passed after the correction.
- The SDK's broader version list included protocols predating this HTTP profile. VAC now explicitly pins the three supported versions and rejects others before discovery or dispatch.

Session expiry is a failed operation, never automatic replay. Expiry during negotiation/discovery sends no tool call. Expiry, disconnect, authorization failure, rate limiting, JSON-RPC errors and tool errors after dispatch preserve uncertainty and send no replacement write. A subsequent explicit discovery creates a new session without repeating the prior tool operation. Existing workspace recovery controls still govern whether a later write is permitted. Cancellation after remote application aborts promptly and leaves the outcome uncertain.

Verification uses the official SDK server and a separately implemented wire server, plus a fresh public DeepWiki discovery and `read_wiki_structure` call. Tests cover JSON/SSE, negotiation, pagination, termination, session expiry, fresh sessions, malformed and oversized catalogs, cancellation, lost responses, 401/429, protocol errors and credential-safe error messages. The public call transmitted only the name of the public MCP TypeScript SDK repository. [Sanitized live receipt](../evaluations/2026-09-22-mcp-conformance-public.json).

Unsupported optional features remain explicit: OAuth, stdio, legacy SSE transport, background GET event streams, event resumption and server-initiated sampling/elicitation/execution. Responses must finish inside the bounded lifetime; long-lived POST streams are not supported. This closes the declared bounded HTTP interoperability gate, not support for every MCP feature, provider or business application. No installed deployment is part of this change.

## VAC-28: owner adjudication

An authenticated owner can inspect the exact original source/output versions, hashes, criteria and automated result for a terminal swarm. A separate judgment and rationale are required for every criterion; the initial choice is inconclusive. Assessments are appended with timestamp, fixed owner identity, prior-record linkage and a complete evidence snapshot. Corrections append another assessment. There is no edit/delete or model-facing adjudication tool.

The server checks project/file identity, hashes of actual bytes, output run provenance, evidence coverage and text envelopes. The submission revision binds the displayed snapshot and previous judgment; another submission, changed machine evidence or a newer file version requires reloading. Newer files never replace the originally reviewed versions. Active runs cannot be adjudicated. Concurrent submissions cannot silently overwrite each other.

Owner judgments do not overwrite automated verdicts, unblock failed runs, authorize actions or reset usage. React displays evidence as text, not executable HTML. The API inherits workspace authentication and cross-origin protection. This is a single-owner audit path, not independent identity attestation or proof that the owner read every word.

Regression tests cover persistence, original-version retention, stale submissions, criterion coverage, forged actor fields, active runs, cross-project references and corrupted evidence. The real Chromium flow produces a wrong fixture report, receives an automated failure, records two owner judgments, reloads the history and confirms that the run remains blocked. An unauthenticated write is rejected.

VAC-28 remains In Progress. The failed reviewer corpus stays unchanged. Separately authored and independently adjudicated holdouts, broad rubrics and measured false acceptance/rejection are still required; no synthetic interface test establishes semantic reliability.

## Remaining high-priority work

1. VAC-23/28/42: full-task correctness, independent semantic qualification and measured usefulness against single-agent and owner-planned baselines. Existing development successes and failed pilots remain their evidence; this change does not produce a new model-quality result.
2. VAC-25/26/27: select three authorized real business apps/accounts and read/write workflows, implement login handoff and complete repeated app-boundary verification. The owner was asked for this missing scope; no external account writes were performed.
3. VAC-37: inventory and individually qualify imported tools inside the existing sandbox. No imported script has been approved by this change.
4. VAC-43/44: multimodal input interpretation and rendered output quality remain implementation and independently adjudicated corpus work. They are not closed by file upload, document generation or a protocol test.
5. VAC-32: predeclared sustained trials and failure accounting remain necessary. VAC-20 remains the open umbrella verdict; product parity is not established.

Final validation results are recorded below after all checks finish.

Final acceptance: TypeScript and production build passed. Source and production-mode suites each passed **202 tests**, zero failures/skips, with Docker enabled. All **19 Chromium browser tests passed**. Publication inventory and `git diff --check` passed. The new owner-review focused browser trial also passed before the full run. Build source hash: `5e086f3f77db69067d368198d6a576d4866e0586efa3f1c623893e865d07733c`. Vite reports its existing advisory chunk-size warning; the built interface was exercised successfully. No paid search, live model-quality campaign, installed deployment, commit or push occurred.
