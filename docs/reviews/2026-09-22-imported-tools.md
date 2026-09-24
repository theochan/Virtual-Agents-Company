# VAC-37: imported-tool admission and qualification

The imported-tool admission gate is implemented and one candidate is qualified: `meeting-cost-v1`, the unchanged vendored meeting cost calculator. The complete source-script inventory contains 779 files; 778 are explicitly denied as unreviewed. Closure covers the deny-by-default admission mechanism and this individually tested candidate. It does not certify every vendored script, the calculator's meeting recommendations, or the empirical validity of its optional 23-minute refocus assumption.

## Source, inputs and outputs

- `src/server/importedMeetingCost.json` bundles the exact reviewed upstream source, SHA-256, recorded vendor commit and complete MIT notice. No imported Python runs on the host. The generated inventory is checked before every production build; drift in source, inventory or notice stops the build.
- `src/server/importedTools.ts` is the literal allowlist. It accepts only `meeting-cost-v1` and strict numeric/boolean arguments. There is no user-selected filename, import, command, output path, environment or package installation. The adapter calls the reviewed pure `evaluate` function; its upstream CLI is not exposed.
- Inputs: attendees 1–10,000; integer minutes 1–1,440; finite nonnegative hourly rate up to 100,000; four explicit booleans. Dependencies: Python standard library `argparse`, `json`, `sys`, `typing`. Side effect: one sandbox-local `meeting-cost.json` file, subsequently stored as a versioned project artifact.
- Output checks require the exact filename and schema, matching input echo, finite amounts, independently computed arithmetic, missing-prerequisite list and verdict/exit-code agreement. Money checks permit one cent for Python/JavaScript rounding differences. Unexpected files or malformed/incorrect output fail before persistence.
- Receipts retain tool ID, adapter version, vendor source path/commit/hash, license, input hash and output hash. Existing immutable file versions retain run/node/project provenance. Repeated call IDs reuse durable receipts; failed/cancelled calls produce no successful receipt or accepted artifact.

## Containment and authority

Execution uses the existing `tool-code` grant and shared root sandbox allowance. It uses the existing network-disabled, read-only, non-root Docker sandbox with no host mounts or credentials, dropped capabilities, no-new-privileges, 32 processes, one CPU, 512 MiB memory, bounded tmpfs, 45-second subprocess timeout and 60-second outer cancellation limit. Subprocesses remain possible inside that sandbox and inherit containment; this is not a claim that subprocess creation itself is disabled.

General owner-granted Python/shell execution remains available separately. The imported-tool allowlist does not purport to stop an owner from submitting code through that general sandbox. Loose vendor files are not included in runtime releases. The one approved source and its notice are bundled into the server. Qualification applies to the tested image; replacing that image requires requalification.

## Evidence

`tests/imported-tools.test.ts` verifies seven real-container cases: complete meeting prerequisites, no decision, absent owner, absent agenda and owner, no refocus, maximum admitted values and zero rate. Expected cost totals and verdicts are independently fixed in the test. It also verifies malformed/injection/traversal/unknown-tool rejection before dispatch, fabricated output rejection, original-version retention, receipt hashes, project isolation, and cancellation with no accepted output.

Real sandbox probes verify UID, memory/PID/CPU limits, no-new-privileges, unwritable root, network failure from a child subprocess and input traversal rejection. No sandbox containers remained running after the tests. The workspace integration test confirms the imported tool consumes the same root allowance and cannot execute again after it is exhausted.

The focused qualification tests and all 56 workspace regressions passed. The full source suite and production-mode suite each passed **208 tests, zero failures or skips**, with Docker enabled. TypeScript, production build, inventory drift check, publication inventory and `git diff --check` passed. The built server contains the approved source hash and copyright notice. Production-mode describes the existing suite's mode; module-level qualification tests import source, while server integration tests use the built server.

Tested sandbox image: `sha256:7bff433775758304a1c2d61afee3807bccfcf52195cea4a439dd7edf0a256d01`.

Build source hash: `7567a8e4fd2803245ef9ad265c5bf4498acbfc1b8b2b54cfdae7c6194dad6b4d`.

An initial test invocation failed to parse a missing test-function brace; it ran no imported code. After fixing the test, all focused and full suites passed. The existing Vite chunk-size advisory remains. No model calls, paid searches, account writes, installed deployment, commit or push occurred. Existing unrelated work was retained.

All **19 Chromium browser regressions passed** against the built candidate.
