# Persistent AI Swarm workspace

Use AI Swarm → Project workspace to upload inputs and download versioned outputs. Choose the tools a root may use, set resource limits and optionally add machine-checkable deliverable contracts. Files are private to a project. Every write uses an expected version; a concurrent overwrite fails instead of silently discarding work. Files are bounded to 6 MiB, project version history to 50 MiB/1,000 records.

A contract example is `[{"name":"summary.json","kind":"json_equals","path":["revenue"],"expected":600}]`. `exists` and `text_contains` are also supported. Every contract requires current-run provenance. These checks prove their stated predicates; they do not certify arbitrary factual accuracy.

## Isolated code

Build `docker build -t vac-sandbox:2026-09-21 sandbox` before enabling code. `PYTHON_BASE` can select an already cached official Python base; record its digest. `VAC_SANDBOX_IMAGE` overrides the image name. Docker must be on the server PATH. The code tool never executes user code directly on the host.

Each execution uses an unprivileged, read-only container with no network, host mounts, credentials or Docker socket. Limits are 512 MiB memory/no additional swap, one CPU, 32 PIDs, 32 MiB workspace and 16 MiB temporary storage, 45 seconds for code and 60 seconds for the overall call. Up to two sandboxes execute concurrently. Inputs travel over stdin, outputs over stdout; only validated files become immutable project versions. A failed code attempt can be corrected once within the original root limits. Docker isolation is not a Firecracker microVM or a full adversarial security certification.

For standard CSV reviews, prefer the `tool-code` recipe `{ "recipe":"tabular_report", "inputName":"sales.csv", "valueColumns":["revenue","cost"], "outputPrefix":"report" }`. It validates the headers, computes totals (and profit when revenue/cost are supplied), and generates summary.json plus the four document formats using deterministic code. Custom code remains supported.

Python includes CSV/JSON, python-docx, openpyxl, python-pptx, reportlab and pypdf. Runtime package installs and network fetches are disabled. All outputs are drafts.

## Coordination and context

`tool-spawn-agent` accepts a worker batch. `dependsOn` refers to sibling names within the batch or existing sibling IDs. Cycles are rejected atomically. Worker tool grants are permissions; optional `requiredToolIds` separately specifies evidence that must actually be produced. This avoids forcing workers to use irrelevant tools merely because they can access them. Dependents wait without consuming execution slots and block when a dependency fails. `tool-peer` sends bounded messages within the same root; `tool-evidence` retrieves retained node receipts. Messages do not grant authority.

Large grants use `tool-select-tools` to load at most three working tools, including the spawn tool when needed. Working-set changes cannot expand authority or reset quotas. The model sees a compact completed-tool ledger and a bounded recent evidence window; full originals remain in the durable audit.

## Repeatable workflow plans

The optional `plan` field supplies up to 16 named worker specifications. Each needs a unique `key`; `parentKey` refers to its supervisor (omitted means the root). `dependsOn` refers to sibling keys. Dependencies belong on leaf workers; supervisors wait for their children. Each step supplies the same role, instructions, objective, tools and acceptance fields as a dynamic spawn, plus optional `agentId` and `requiredToolIds`. Optional `toolSequence` lists distinct tools in the required order. Only the next tool is offered until it succeeds; completed steps cannot repeat. Root requests can also supply a coordinator `toolSequence`. This is an owner-authored execution contract, not autonomous planning.

The server validates parent/dependency cycles, model/profile eligibility, inherited grants, depth and lifetime node limits, then atomically creates the tree. Plans cannot expand dynamically during execution. Agents still use their configured model to perform tasks. This makes repeated work predictable without claiming that an owner-supplied plan proves autonomous planning ability. Leave `plan: []` to retain autonomous recursive spawning.

## Memory, skills and routines

Agents may propose project memory. Only owner-approved records enter future model context. Proposals include their source run and node. A skill is an immutable version of a run configuration, not executable host code. Save a selected run as a named skill, then authorize a routine pinned to that exact version.

Routines use intervals of at least one minute and a lifetime cap of 1–100 dispatches. They survive restarts, do not overlap the previous run, and do not replay every missed interval. They pause on dispatch errors. They execute only while VAC is running; a stopped or sleeping Mac does not provide always-on service. Pause prevents future dispatches; cancel the current swarm separately to stop current work. A routine marked completed has exhausted its dispatch count; its last run can still be active.

## Browser state and approvals

An optional browser profile name retains cookies and local storage under the private data directory. It is project-scoped, expires after seven idle days and is exclusive to one active session. The UI can delete saved sessions. State is stored as an owner-readable file, not exposed through the API. This feature does not implement human login handoff or arbitrary authenticated-app coverage.

Interactive actions pause for an exact approval. The preview includes parameters, page URL and target element evidence; changed targets invalidate approval. Approval expires at the earlier of 15 minutes or the root deadline and is consumed once. Read-mode navigation blocks non-read HTTP methods. Side effects encoded in a site's GET semantics cannot be inferred generically.

## Connector gateway

Owner configuration specifies an exact HTTPS endpoint and tool names/effects. Supply each tool’s optional `inputSchema` (an object with typed properties, required names and additionalProperties=false) so argument types are exposed to the model and validated before approval. The supported property types are string, number, boolean, object and array; this is a bounded schema subset. A run separately grants connector IDs. The gateway speaks JSON-RPC `tools/call`; it is intentionally not advertised as a complete MCP client. Credentials can be loaded from an environment variable named `VAC_CONNECTOR_*`. Values stay server-side and are redacted if echoed in results. Do not place secrets in URLs, arguments, prompts or configuration JSON.

Local gateway endpoints must also be listed exactly in server environment `VAC_CONNECTOR_LOCAL_ENDPOINTS` (comma separated). Public requests use the same DNS-pinned public-address policy as the browser. Redirects are not followed. Write tools require a once-only approval; read tools run under their immutable grant. Connector effect declarations must be trustworthy: classifying a write as read would undermine approval policy.

## Reproduce evaluation

Run `VAC_TEST_SANDBOX=1 npm run check`, then `npm run test:browser`. The scenario command is `node --import tsx scripts/evaluate-swarm-workspace.ts scripted /absolute/new-report.json`, `live` for autonomous local Ollama decisions, `live-planned` for real Ollama workers under a fixed owner-supplied plan, or `live-harness` for a Deep Agents-generated plan. Never reuse an evidence filename. Scripted mode uses deterministic model/search responses and real Docker/Chromium/connector execution. Live mode uses Qwen and public search. Synthetic writes go only to a disposable local connector, with exact expected arguments checked before approval. Generated documents and each failed run are retained beside the report.

## Open-source harness

The Swarm planning-engine selector offers an experimental Deep Agents planner. It is off by default. See [harness architecture](HARNESS-ARCHITECTURE.md) for its restricted authority, model/tool budgets, planning corrections and qualification limits. A generated workflow is not a guarantee that its execution will pass the artifact contracts.
