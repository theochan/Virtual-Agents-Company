# Source accounting remediation — 22 September 2026

VAC-23 and VAC-28 have an implemented deterministic accounting contract. They remain open: this is a bounded structured-input capability, not autonomous interpretation or unseen reviewer qualification. VAC-42 still requires matched usefulness trials.

## Supported contract

Owner-provided JSON sources contain `records`, each with `id`, `entity`, `currency` (three uppercase letters), `unit: "minor"`, `type: "invoice" | "credit"`, and a safe integer `amount`. An invoice contributes its signed amount; a credit contributes the negation. Negative credit amounts therefore add to the total. The owner must confirm this convention when preparing sources. No currency conversion or inferred classification occurs.

The owner supplies a `reconciliation` deliverable contract through the existing Deliverable contracts field or swarm API:

```json
{
  "name": "reconciliation.json",
  "kind": "reconciliation",
  "sources": [
    {"name": "invoices.json", "version": 1, "sha256": "<SHA-256 from project file metadata>"}
  ],
  "partitions": ["specialist-a.json", "specialist-b.json"]
}
```

`partitions` is optional. Names must be distinct from sources and the final output. Source versions and hashes are mandatory; sources must be owner uploads, not agent-produced interpretations. Invalid, conflicting, or over-limit sources reject run creation before workers are persisted. Later source versions do not alter the pinned run evidence.

Each source row receives its filename, version, hash and one-based record index. Identity is `(entity, id)` across all supplied files. Identical repeats are marked `duplicate` with a reference to the first canonical occurrence and a zero contribution. Changed currency, document type or amount for the same identity blocks the run. Totals stay separate by entity/currency/unit and use exact integer arithmetic; unsafe final totals are rejected.

An agent with `tool-files` can request `{"reconcileContract":"reconciliation.json"}` to retrieve the deterministic result. It has `rows` and `totals`; every row carries the original fields, source reference, `disposition`, `signedAmount` and, for duplicates, `duplicateOf`. The producing agent writes the result using its existing file-write permission. Large results fail the tool context envelope instead of returning a truncated ledger; the owner may use the existing sandbox over the pinned sources to produce the same result structure.

The completion gate independently recomputes from pinned originals and verifies all rows and totals. Matching totals do not excuse missing offsetting rows. Reordering result rows is permitted; altered fields, unknown provenance, overlaps, incorrect units, missing totals and incorrect amounts fail. When partitions are declared, each must be a current-run JSON artifact containing `{ "rows": [...] }`. Their combined rows must cover the source exactly once, using the same full typed row contract. These checks do not establish that separate specialists authored each partition.

## Boundaries

- At most 20 unique files, 256,000 source bytes and 1,000 total source rows. Files remain governed by existing workspace limits. Read-only ledger output is capped at 10,000 serialized bytes (leaving room for receipt metadata within the 12,000-character model observation envelope).
- This does not parse the earlier pilot's prose/text inputs, validate an upstream model's JSON extraction, infer currencies' decimal scales, interpret dates, or certify claims in free-form prose. Owner source preparation remains part of the task. Arbitrary numerical/semantic review and independently adjudicated holdouts remain open.
- The frozen failed pilot and exposed reviewer cases were not edited or rerun. Structured fixtures reproduce its record values to test the deterministic contract; they are development evidence only.
- Existing semantic review remains an additional gate. Its UI incorrectly said it used one call; corrected to up to two, matching the existing implementation.
- No paid search, inference campaign, installed deployment, commit or push is part of this remediation.

## Verification

Focused deterministic and runtime regressions cover credits, cross-file duplicates, reordered sources, zero/negative values, mixed currencies, conflicts, unsafe integers, source hashes, offsetting omissions, overlapping partitions, stale outputs and pinned-source version changes. Full-suite results are recorded below after validation.

Validation completed: TypeScript and production build passed. Source and production-mode suites each passed 186 tests with zero failures; each default run skipped the two opt-in Docker checks. Both Docker checks were then explicitly enabled and passed, so all 188 checks have passing coverage. Real Chromium checks passed in both suite modes. An initial restricted-sandbox attempt encountered environment permission failures and was stopped; authorized runs above are the acceptance evidence. `git diff --check` passed. No live-model quality result is claimed.
