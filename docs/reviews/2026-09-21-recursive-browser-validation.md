# AI Swarm expansion: implementation and validation

Completed on 2026-09-21. Existing Plane instance: http://127.0.0.1:3180, workspace ideas, project VAC. Existing app: http://127.0.0.1:3001. No new Plane instance was created.

## Delivered behavior

Manual profiles and ordinary chat remain available. AI Swarm supports existing, temporary and hybrid teams with recursive delegation. Default maximum depth is 3, configurable 1–4. All descendants share immutable root grants, cumulative budgets and the original deadline. Parent permissions are checked throughout the ancestor chain. Parents yield their execution slots and synthesize direct-child evidence. Cancellation reaches descendants; recovery synthesizes retained evidence without replaying uncertain browser actions.

Optional minimum verified depth is enforced by the server and inherited along the first required branch. The model's output schema excludes premature completion while required evidence is missing. Dynamic dispatch schemas exclude saved-agent IDs. Actual tree structure and tool definitions are supplied in model context. Broad candidate lists are bounded to preserve space for evidence; eligible saved agents outside the visible subset remain eligible at execution time.

Browser automation uses isolated nonpersistent Chromium sessions and exact owner-approved HTTP(S) origins. Read/navigation is the default; interactive clicks, fills, selections and form submissions require an explicit run setting. It supports rendered text and selectors, link navigation and scroll. There is no arbitrary script tool or access to personal browser cookies. Browser steps and every dispatched page/resource request consume durable root allowances. Defaults are 24 steps, 100 network requests, and four sessions across the workspace. DNS addresses are validated and pinned. Private networks, nonstandard ports, uploads/downloads, frames, popups, WebSockets and service workers are blocked. IPv6-only sites and some complex sites are unsupported.

## Verification

- Final `npm run check`: **94 tests passed**, TypeScript and production build passed.
- Final `npm run test:browser`: **12 UI tests passed**.
- Real Chromium tests cover navigation, generated selectors, isolated storage, interactive controls, form submission to test responses, blocked writes in read mode, origin restrictions, cancellation and request limits.
- Recursive tests cover nested aggregation, inherited grants, revocation, duplicate objectives, depth limits, shared budget exhaustion, ancestor synthesis reservations, cancellation, restart recovery and forty-agent/multi-tool context capacity.
- Final installed acceptance through the authenticated app API: **both checks passed in 74.24 seconds**, using the existing Sarah coordinator and `qwen3.5:9b`.
- recursive: completed; 3 nodes; 6 model calls; 7011 reported input tokens and 325 output tokens; 1 tool operations; 0 browser network requests.
- browser: completed; 1 nodes; 2 model calls; 2652 reported input tokens and 71 output tokens; 1 tool operations; 1 browser network requests.
- The leaf calculator receipt proves `17 × 23 = 391`; the browser receipt proves the rendered title and text retrieved from `https://example.com`.
- Verified all 5,559 source entries matched the installed checkout before adding this report and evaluation copies; all five built assets matched the manifest. Source hash: `7c62271dd99a62a0909fa6674501ec40bbce615424965a401d4a33840bcc0255`.
- Existing SQLite data and test history were preserved. A private pre-update SQLite backup and previous dist copy were retained under work/. Runtime credentials are excluded from deliverables.

## Failures retained and resolved

The first live run flattened the requested hierarchy and falsely described it as nested; Ollama also rejected the initial browser JSON grammar. Subsequent runs exposed missing tool evidence, invalid temporary/saved agent references, exhausted budgets and incorrect calculator operands despite a claimed correct answer. All failed live reports remain alongside the passing reports. Corrections added inherited depth requirements, mode-specific dispatch schemas, schema-level evidence constraints, explicit tool definitions in model context and compatible browser parameter schemas. A final UI test exposed excessive candidate/tool context; bounded candidate presentation and compact tool descriptions fixed it, and all 12 UI tests subsequently passed.

These results prove the tested execution mechanics, not general factual correctness or a productivity advantage from adding agents. A model can still use a tool on the wrong inputs or misstate evidence. General natural-language acceptance criteria are not automatically proven. The minimum-depth setting verifies structure; do not force a hierarchy when the task does not benefit from it. Read mode restricts HTTP methods but cannot guarantee that a badly designed site's GET has no side effects. Interactive permission is per-run/per-origin, not a separate approval for each click.

## Delivery and operations

The checkout is the local repository, branch `codex/ai-swarm`. This is a historical pre-publication snapshot; see the release summary for current scope. The app is running on port 3001; no automatic-start service was added. Ollama and its installed Qwen model were retained. Plane VAC-1 through VAC-8 are updated with the expanded implementation and acceptance evidence. The guide, source ZIP, patch, build manifest and raw validation reports in outputs accompany this report.

For fresh installs run `npm ci` and `npx playwright install chromium`, then build and start. On this Mac Chromium is already installed. The app sign-in token remains private in the checkout's data/access-token file. See Start-Here.md for the workflow.

Browser implementation references: [Playwright BrowserContext](https://playwright.dev/docs/api/class-browsercontext) and [Route](https://playwright.dev/docs/api/class-route).
