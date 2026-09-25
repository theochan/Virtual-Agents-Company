# VAC-48 AI Swarm outcome composer

VAC-48 now replaces the AI Swarm configuration surface with an outcome composer. The launch path asks for a project, the desired outcome, and optional attachments. It does not ask the user to choose a coordinator, team topology, tools, planning engine, workflow JSON, contracts, review policy, browser policy, connectors, or resource limits.

## Orchestration policy

- The coordinator is selected from project-eligible local Ollama agents with sufficient autonomy.
- Every launch uses the Deep Agents planning path. The planner chooses the working team, topology, and tool subset for the submitted outcome.
- The server-enforced capability ceiling includes project reads, calculator, web search, project-file reads, draft-file writes, sandboxed code, project memory, peer messaging, and teammate evidence.
- Browser automation and configured connectors are not silently granted. They require explicit origin or connector authority and remain available through just-in-time approval or administrative setup outside the launch composer.
- Resource limits, tool validation, project membership, and consequential-action approvals remain server-enforced.

This is autonomous orchestration inside an explicit authority boundary. It is not an unrestricted agent and does not pretend that external side effects are safe merely because a planner requested them.

## UX result

- One outcome field is the only task-specific requirement.
- Project selection is remembered; attachments are optional and visible immediately after upload.
- A plain-language trust banner explains that VAC chooses the team, tools, and approach.
- Recent work, deliverables, team progress, and just-in-time approvals remain user-facing.
- Technical receipts and budget details are subordinate to the outcome and hidden behind disclosure.
- Workspace administration and reviewed-skill configuration were removed from the launch flow; their server APIs remain covered separately.

## Defects fixed during acceptance

- Attached files uploaded successfully but their feedback container lacked an explicit accessible region role. The region is now named and testable.
- Connector repeat authorization persisted correctly but the UI gave no confirmation. It now reports the one-time owner authorization.
- Two browser tests still depended on removed administration controls. They now verify those capabilities at the API boundary without restoring launch clutter.
- The checkout and fixture were updated while the real port-3001 service still ran immutable release `02a7fd4`. A verified backup was taken, release `7f4c99f0db9d` was packaged and smoke-tested, both LaunchAgents were switched, and the live service was read back at the installed boundary.

## Acceptance evidence

TypeScript, the production build, the source suite, the built-server suite, and the complete browser suite passed. Source and built-server suites each passed 217 tests with six Docker-only skips. The browser suite passed all 21 tests; a final focused visual capture also passed.

The selected design reference, 1440×1024 implementation capture, 1120×504 composer-region capture, and comparison record are stored in `docs/reviews/assets/` and `design-qa.md`. The live in-app-browser inspection confirmed the same hierarchy, labels, disabled-state behavior, and accessible structure.

The installed localhost service now runs immutable release `releases/7f4c99f0db9d` with source hash `7f4c99f0db9d680d2decc3100b7bfdd38b30c249f7c57cf412788348e426d912`. Authenticated readiness returned HTTP 200 and `runtime-ready`; storage was writable, the worker was healthy, and the served `index-DWrlyu3E.js` bundle contained the new automatic-orchestration copy. The controlled restart invalidated browser sessions as designed, so the user must sign in again with the existing private workspace token.

## Scope boundary

This closes launch UX and orchestration delegation under VAC-48 without creating a duplicate work item. VAC-23 retains planner/runtime ownership; VAC-28 semantic correctness; VAC-42 usefulness evaluation; VAC-34 native app connections; VAC-20 the parent integration verdict. The localhost release was deployed; no commit or push is included.

Evidence: [sanitized acceptance summary](../evaluations/2026-09-25-swarm-launch-progressive-disclosure-summary.json) and [Plane receipt](../evaluations/2026-09-25-swarm-launch-progressive-disclosure-plane.json).
