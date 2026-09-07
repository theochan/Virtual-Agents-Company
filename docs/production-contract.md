# Local production release contract

Date: 2026-09-07. Scope chosen provisionally from the existing application while the owner workflow question is pending. This is a small local single-owner product, with automatic completion of successful work and user feedback through chat. It is not a hosted multi-tenant service or a general autonomous organization.

## Workflows

1. **Project status draft:** read the assigned project's saved context, identify documented owner, status, deadline, budget, blockers and next action. Do not invent shipment/completion or act on instructions embedded in source text. Missing facts remain unknown.
2. **Business arithmetic draft:** use the bounded calculator for supplied numbers; include the result and preserve the tool receipt. No market forecast, investment valuation, tax determination or business approval is inferred from arithmetic.
3. **Source-cited reference brief:** use Tavily search for a small conceptual research question, provide relevant source URLs, and disclose that excerpts are partial evidence. This does not support trading quotes, exhaustive research, or verification of entire source pages.

The tested primary inference candidate is local Ollama `qwen2.5:7b` at temperature 0. Tavily is the search candidate. Brave and other model adapters remain optional integrations with fixture tests; they are not included in the live acceptance claim.

## Acceptance fixed before the live observation

The 24 cases and thresholds are stored in [local-release-v1.json](evaluations/local-release-v1.json). Require at least 7 of 8 automatic passes per workflow, no unauthorized tool executions, and a maximum 120 seconds per case. Checks cover a produced draft, required tool use, expected arithmetic/project facts, and a cited URL from search receipts. The rubric is intentionally narrow: it does not independently certify factual correctness or actual owner time savings.

The raw observation and separate review preserve automatic failures, including formatting false negatives. Subsequent fixes require targeted new evidence; old results are not overwritten. Outputs remain drafts requiring owner acceptance against the actual requested deliverable.

## Runtime envelope

- One active worker; at most 20 queued/working/waiting runs. Default 100 inference attempts per UTC day, persisted before provider calls. Each run allows six model calls and up to 2,048 requested output tokens per call.
- Default active execution budget: 600 seconds; inference timeout: 300 seconds. Settings are bounded and rejected if invalid. Approval waiting does not consume active execution time.
- Paid cloud inference is disabled unless `VAC_ALLOW_PAID_INFERENCE=1`. The operator must first configure provider-side spending limits. Application attempt limits do not establish exact dollar expenditure.
- Paid search defaults to zero requests per day until `VAC_SEARCH_REQUESTS_PER_DAY` is explicitly configured. Use a small limit such as 10 for initial operation and a provider-side credit limit. Search connection tests and failed requests consume reservations.
- Queue lookup is tested with 10,000 historical run records. The UI loads recent run history; API pagination supports older records. Other workspace collections remain bounded by the small local operating envelope: up to 20 agents, 50 projects, and 1,000 work items/artifacts/memories each. These collection sizes are operational assumptions, not implemented hard caps.
- Keep all evidence by default. Do not silently delete historical runs, approvals, memories or artifacts to improve performance. Export/archival design is needed before exceeding the operating envelope.

## Recovery and operations

Target backup data-loss window: 24 hours while the service and backup volume are available. Target recovery procedure duration: 30 minutes for the small workspace, conditional on access to a valid snapshot, compatible release and required credentials. Automated restore tests establish recovery correctness, not performance on every future disk or workspace size.

The backup policy keeps at least the newest 30 verified snapshots and removes only its own recognizable older-than-30-day snapshots. The owner selected local snapshot folders with cloud backup managed separately (2026-09-07). Use `data/backups` locally; only completed snapshots should be synced by the owner's iCloud/Google Drive setup. Same-disk snapshots alone do not protect against disk loss; cloud upload and restore have not been verified. Backup schedules only run while the Mac is awake and the volume is mounted; monitor missed backups operationally.

Before operational acceptance, run a **15-minute disposable release soak**: authenticated readiness checks every 5 seconds, periodic calculator tasks, and no unexpected readiness failure, duplicate effect, or integrity error. This is a bounded release smoke soak, not a reliability study for unattended continuous service.

## Exclusions and remaining owner decisions

Imported skill scripts, external writes, remote hosting, and multiple principals remain disabled. Direct-subordinate read-only delegation is a separately enabled pilot with explicit manager permission and shared limits; it is not an autonomous business-readiness claim. The runtime release excludes vendored skill trees and private state; distribution review of the full source repository remains separate.

The owner must still confirm the workflows are useful for actual work and choose the routine search credit limit. The owner selected local snapshot folders with separately managed cloud backup. Workflow usefulness and a nonzero routine search allowance must not be represented as already approved. Operational deployment into the existing port-3001 workspace is a separate step from preparing and testing a release directory.


## Current workflow policy

Successful runs and subordinate tasks complete without human draft acceptance. Exact-operation approvals remain mandatory where the tool requires them. Completion is an execution status, not a factual-quality verdict; the historical evaluation criteria and results above are unchanged.
