# Local AI Swarm system

Source enhancement dated 2026-09-21. Plane VAC-1 through VAC-20 track the staged delivery; this document defines the implementation contract. Historical reports describe their original releases, not acceptance of this enhancement.

## User workflow

1. Run Ollama with an installed model. On the 24 GB M4 Mac mini, the selected model is `qwen3.5:9b` (Q4_K_M, approximately 6.6 GB of model files). Model weights alone are not peak RAM requirements. Agent fan-out and Chromium sessions add memory and latency.
2. Configure an existing coordinator in Team with Ollama and access level 3 or 4. Assign it to the selected project if that project restricts membership.
3. Open **AI Swarm**. Select a project and coordinator; write a deliverable with explicit constraints.
4. Choose **Existing agents only**, **Temporary specialists**, or **Existing agents + temporary specialists**. Existing agents must be assigned to the project, use Ollama and possess the requested tools. They do not need to report to the coordinator; that is a separate legacy delegation restriction.
5. Select the run's pre-approved tools and resource limits. Starting the run authorizes those grants for this root only. A coordinator's personal tools and its run-scoped delegable grant are separate.
6. Inspect the actual execution tree, specialist instructions, tool/model receipts, reported versus reserved tokens, and final deliverable. Stop cancels the entire root and all live descendants.

Manual agent creation, ordinary chat, saved profiles, project records, artifacts, memory and exact-operation write approvals continue to work. The old `VAC_ENABLE_DELEGATION` switch controls only legacy direct-subordinate delegation; it is not required for the AI Swarm screen.

## Execution architecture

The modular monolith keeps the existing manual run engine for compatibility. The new durable swarm scheduler reuses the same Store, provider adapters, tool registry, input validation and daily attempt ledger. Both execution paths share a single Ollama concurrency gate. Swarm state is stored as new SQLite record kinds; no existing data is rewritten or reseeded.

- `swarms`: owner request, project, coordinator, creation mode, immutable tool grant, limits and events.
- `swarm-nodes`: immutable execution profile/prompt snapshot, prompt hash, provider snapshot, objective, acceptance criteria, current state, messages and receipts. Each has a root ID and optional parent ID.
- `swarm-budgets`: cumulative reservations, actual reported usage, unknown usage count and original deadline.
- `swarm-requests` and `swarm-dispatches`: durable idempotency bindings.

Temporary specialists are run-scoped instances, not permanent `agents` rows. They inherit their parent's approved model. Existing specialists snapshot their own approved Ollama configuration. Arbitrary model names, endpoint changes, credentials, script paths and unregistered tools are not accepted in spawn specifications.

The topology is a bounded recursive tree. Coordinators and specialists can dispatch batches and yield until their direct children finish. Every node inherits the same root deadline and budget; grants narrow along each edge. Default maximum depth is 3 (root depth 0), configurable 1–4. Existing saved runs without a depth field retain depth 1. An optional minimum verified depth rejects completion unless a completed descendant exists at that depth. The first child of each required branch inherits its remaining depth requirement; that specialist is also blocked from unsupported completion. Where more than one level remains mandatory, the first dispatch is constrained to one child until the required branch is established, preventing sibling fan-out from consuming its slots. This verifies tree structure, not every natural-language delegation instruction.

A `tool-spawn-agent` decision carries 1–8 worker specifications, each with name, role, instructions, objective, tools and acceptance criteria; `agentId` is optional except in existing-agents mode. Creation validates the complete batch, then atomically consumes lifetime slots, writes instances and links the parent. An invalid member rolls back the entire batch. Reusing an identical dispatch is idempotent; changed payload reuse fails. Duplicate normalized objectives, including ancestor/root objectives, are rejected. Similar but non-identical prose remains bounded by lifetime spawn and model-call limits.

The parent yields its slot. No worker waits synchronously for descendants while holding a model slot. Scheduler claims happen synchronously before I/O; the supported deployment remains a single Node process protected by the workspace lock. Distributed workers require a different lease/claim design.

## Resource envelope

| Resource | Default per root | Configurable maximum |
| --- | ---: | ---: |
| Maximum delegation depth | 3 | 4 |
| Browser operations | 24 | 128 |
| Browser network requests | 100 | 512 |
| Agents including coordinator | 9 | 17 |
| Simultaneous workers | 2 | 4 |
| Total model calls | 40 | 128 |
| Model calls per agent | 8 | 24 |
| Input reservation units | 250,000 | 2,000,000 |
| Reserved output tokens | 32,768 | 131,072 |
| Requested output per call | 1,024 | 2,048 |
| Tool calls | 40 | 128 |
| Search provider attempts | 12 | 64 |
| Lifetime, including queue waiting | 30 minutes | 120 minutes |

Server ceilings `VAC_SWARM_CONCURRENCY` and `VAC_OLLAMA_CONCURRENCY` default to two and permit 1–4. A root cannot exceed either applicable ceiling. Total concurrent swarm roots are capped at ten. Increasing agent count does not increase available GPU capacity. Ollama may serialize requests internally; app concurrency is not a promise of hardware throughput.

Every model attempt consumes its reservation before dispatch. Input reservations conservatively count serialized UTF-8 bytes plus overhead, rather than claiming exact tokenizer counts. Reported provider tokens are shown separately. Output reservations use requested `num_predict`; no automatic refunds are made. Failed calls and unknown outcomes consume reservations. Workers reserve one model call, one output allowance and 8,192 input reservation units for each ancestor awaiting synthesis, but a large synthesis context or the coordinator's own exhausted per-agent limit can still prevent a final response. In that case the tree and raw results remain available.

Ollama requests use a 16,384-token context and `think: false` for the JSON decision protocol. The serialized input envelope is capped below that context. Prior verbose spawn decisions are omitted from subsequent model context; observations are bounded with explicit truncation labels. Full prompts, replies and receipts remain in SQLite. The system does not silently claim a complete synthesis when context cannot accommodate the evidence.

Tool attempts, including failed execution, are bounded. Every search provider attempt and DuckDuckGo query rewrite consumes the root's search allowance. Tavily/Brave attempts also consume the existing durable workspace daily paid-search allowance. **Local inference does not make search credits free.** The browser tool is separately authorized per run. No host script, shell, file reader, email sender or arbitrary remote connector is added.

Only Ollama is accepted for swarm inference. Existing cloud adapters remain available for manual chat under their existing controls. No dollar cap is claimed; local compute/time and third-party search consumption remain relevant. Daily inference attempt limits also apply to Ollama.

## Authority and evidence

Owner-approved tool IDs must be in the approved swarm registry: project-read, calculator, web-search and browser. Browser action permissions are separate from selecting the tool. A child cannot expand them, change project/workspace, or turn instructions into permission. Existing specialists additionally require current personal tool entitlements. Current coordinator/project/source-agent authority and model configuration are rechecked around I/O and before execution. Profile removal is blocked while referenced by a live swarm; changing authority during execution causes a disclosed failure.

Children must provide successful evidence from themselves or completed descendants for every tool requested in their task before claiming completion; search requires actual results. This is tool-evidence validation, not a factual-accuracy certificate. An optional owner requirement makes the coordinator personally use selected tools before completion. Ollama generation excludes final decisions while required evidence is missing and offers only delegation while a mandatory child branch remains missing. Server validation remains authoritative even if a provider ignores the schema. Missing receipts or depth trigger one explicit correction turn per node within the original budget; a second unsupported completion is blocked. No budget is reset. Acceptance criteria are supplied to the model and visible in the audit; general natural-language criteria are not automatically proven. Child evidence is labeled untrusted and includes hashes. Search is snippets with provenance, not full-page verification.

A failed specialist can lead to a `partial` synthesized root result. The UI displays the failed node and an explicit warning. No majority vote, confidence label or persona establishes truth.

## Stop and recovery

Terminal states are `completed`, `partial`, `blocked`, `failed`, `budget_exhausted` and `cancelled`. Completed nodes never regain spawn slots. Tool repetition, per-agent calls, root calls, context, output, tool/search attempts and wall-clock limits independently terminate work.

Cancellation aborts active requests and prevents late responses from changing task status. Late available usage is retained. An abort cannot guarantee that a provider stopped computing; missing usage is recorded as unknown.

Startup detects nodes interrupted during execution and live roots with lost browser sessions and blocks their root for explicit recovery. Recovery retains the original deadline and counters, disables further spawning and tool access on the coordinator, marks unresolved children failed, and synthesizes retained evidence only. It does not retry uncertain external operations. Queued work that was never dispatched can survive restart without being mistaken for completed work.

## API and validation

Authenticated endpoints: `GET /api/swarms/config`, `GET/POST /api/swarms`, `GET /api/swarms/:id`, `POST /api/swarms/:id/cancel`, `POST /api/swarms/:id/resume`. POST creation requires an Idempotency-Key. These are subject to existing owner auth and host/origin checks.

Run `npm run check` and `npm run test:browser`. The browser suite uses a deterministic provider fixture. For live Ollama acceptance:

```sh
node --import tsx scripts/validate-swarm.ts qwen3.5:9b /absolute/path/result.json
```

The live script uses disposable SQLite state, no web search, at most 18 model calls, two specialists and a 15-minute root deadline. It verifies real temporary creation, calculator results 391 and 400, and coordinator calculation 791. It fails rather than claiming completion if any required receipt is absent. Passing this controlled workflow proves mechanics, not general research accuracy or productivity superiority.

Installed runtime acceptance and Git publication remain separate from source/build/test evidence. No background daemon or automatic startup is introduced by the swarm implementation.

## Browser automation

Install Chromium with `npx playwright install chromium` after `npm ci`. Playwright is a production dependency. Select Browser automation and enter exact approved origins, for example `https://example.com` (no trailing slash). The server rejects requests without a grant; models cannot add origins or enable actions. Permissions apply throughout the tree, and descendants cannot acquire the browser tool unless the parent possesses it.

Each agent receives its own Chromium process/context. An optional owner-named project profile restores private saved cookies/local storage, with exclusive ownership and a seven-day idle expiry. No personal browser state is imported. Up to four browser sessions may exist across the workspace. Sessions persist between that agent's operations, close on terminal status/cancellation/shutdown, and are never replayed after restart. Parents close their browser session before dispatching children; hitting the cap produces a disclosed failure.

Supported operations: navigate, read rendered page text and element selectors, follow links, scroll, and (with owner-enabled interactive actions) click controls, fill fields, select options and press a small set of navigation keys. No arbitrary JavaScript tool, file uploads/downloads, popups, frames, WebSockets or service workers. Each action is bounded to 15 seconds after browser creation; launch is separately capped at 15 seconds. Element operations use an 8-second timeout and navigation 12 seconds.

Read mode permits GET/HEAD only; link clicks navigate without invoking the link's event handlers. Interactive mode permits site scripts and form/network writes on approved origins. A GET can have server-side effects on badly designed sites, so read mode is not a transactional guarantee of zero effects. Enabling actions allows the agent to request interactions on those origins. Each interactive operation additionally pauses for once-only approval bound to its parameters and current target. No existing authenticated browser session is imported.

Chromium uses a dead proxy so network access goes through the server's interceptor. Every dispatched HTTP(S) request requires an exact approved origin, a standard port, bounded body/response and shared durable network reservation. The transport resolves public IPv4 addresses and pins the chosen address to the socket to avoid DNS rebinding; private, loopback, link-local and reserved targets are rejected. IPv6-only sites are currently unsupported. Redirect targets are validated. Requests, scripts, XHR/fetch and styles consume the same request counter; blocked assets and request failures appear in the returned evidence. Images/media/fonts are not fetched. Some complex websites will not work under these restrictions. These controls are not a substitute for OS-level isolation against a Chromium vulnerability.

Browser operations consume both the shared tool budget and browser-step budget. Background page requests also consume the root network allowance while a session is open. Budget exhaustion stops subsequent network dispatch; existing page text may remain readable, with blocked requests disclosed. Full receipts record the actual URL, title, bounded rendered text and retrieval time. Browser text remains untrusted evidence.

Use `node --import tsx scripts/validate-swarm-extended.ts /absolute/path/report.json` for live Qwen nested-delegation and public-page acceptance. The first validation exposed a flattened tree falsely described by the model as nested, plus an Ollama schema grammar rejection. A minimum-depth completion gate and a compatible provider-facing browser schema address those failures; strict per-action validation remains server-side. Later failures exposed missing calculator evidence and wrong operands; tool descriptions and schemas are now included explicitly in model context. Receipt checks still cannot prove arbitrary natural-language task correctness. Keep failed runs alongside passing evidence.

## Persistent workspace and repeatable workflows

See [the workspace guide](SWARM-WORKSPACE.md) for versioned files, document recipes, code isolation, memory, skills, schedules, connectors and owner-defined workflow plans. Worker `toolIds` are permissions; `requiredToolIds` separately identifies mandatory tool evidence. Owner-supplied plans are validated and compiled before execution, while an empty plan retains autonomous dynamic dispatch. These modes have different reliability claims.
