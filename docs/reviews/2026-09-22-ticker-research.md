# MSFT research workflow development record

VAC-23 remains High / In Progress. Full research acceptance is not established. Final candidate source hash: `5a24fbced46197133b31e8840010abeaa2da6e53e52b40c05908f0ce85cc3dba`. The next complete trial is blocked by the unchanged daily inference allowance: 38 remaining, at least 57 needed. The focused repeated-tool demonstration passed previously; it did not prove that a nine-node research workflow could retrieve current prices, reconcile source evidence and deliver a defensible recommendation.

## Implemented corrections

- Separate sequence occurrences have durable receipt indices; successful identical side effects cannot replay.
- Named assignment requirements enforce minimum operations and prerequisite relationships before workers persist. Display-name variation no longer breaks evaluator role matching.
- Requirement errors are aggregated, and planning history retains compact assignment/tool-count state. Shorter planning instructions leave room for correcting a rejected plan under the same four-call, 14,336-byte envelope.
- Owner-authored briefs are frozen with hashes in each assigned worker's instructions. They cannot be replaced by subsequent file edits or promoted from untrusted worker output.
- Search observation compaction retains source URLs, and unused excerpt capacity is redistributed. Browser focus/offset reads locate sections of long pages while keeping existing access and request limits.
- Approved HTTP GET redirects now re-enter guarded navigation, with per-hop destination checks, reservations and an eight-hop cap. Chromium never receives an HTTP redirect to follow outside interception. Tests reproduce the original proxy failure and cover origin, budget and loop rejection. Search context marks and prioritizes approved origins without widening authority.
- Opt-in research navigation now advertises only current-run discovered approved URLs and rejects invented paths before network use. URL enums remain in actual tool schemas without duplication in fixed instruction summaries. This prevents path invention; it does not guarantee usable source content.
- Fixed worker context omits unrelated nodes and redundant registries/file metadata. Workers with frozen assignment briefs receive project context rather than the full other-branch objective. Briefs must carry the assignment-specific requirements. Successful observations persist before preparing the next model context.
- Request-budget exceptions now survive browser routing rather than becoming generic navigation errors. Opt-in document-only research disables JavaScript and fetches only document resources; origin, DNS, redirect and request limits still apply. Dynamic-only page content is unavailable in this mode and cannot be assumed present.
- A preflight checks the remaining durable daily allowance against the theoretical minimum model-call count. This is a lower bound, not a guarantee that a later plan will fit.
- The isolated evaluator shares owner daily request reservations, so separate trial directories do not reset usage caps.
- Strict research schemas and deterministic provenance, date, unit, arithmetic and decision-policy checks reject unsupported positive output. Floating-point threshold comparisons use a small numerical tolerance.

## Preserved attempts

| Attempt | Outcome | Finding |
| --- | --- | --- |
| 1 | Failed after actual search calls; 159.977 seconds | Worker fixed context left insufficient evidence space. No browser-grounded research output. |
| 2 | Failed in four planning calls; 235.673 seconds | First-error feedback corrected missing input reads one at a time. No workers executed. |
| 3 | Failed after one planning call; 94.777 seconds | The rejected-plan correction request exceeded the fixed context envelope. No workers executed. |
| 4 | Failed at browser boundary; 229.428 seconds | Two-call planning correction and nine-node compilation passed. Price selected an unapproved origin; approved Microsoft GET hit the fulfilled-redirect proxy defect. |
| 5 | Failed; 253.153 seconds | Yahoo Finance rendered. Fundamentals invented a legacy issuer URL and received HTTP 404. |
| 6 | Failed; 254.301 seconds | Explicit source-copy instructions did not stop the same invented URL. Prompt-only correction was insufficient. |
| 7 | Failed; 212.860 seconds | Discovered-URL enforcement duplicated URL enums in fixed context and exceeded the unchanged envelope. |
| 8 | Failed; 240.805 seconds | Both correct sources rendered; subsequent context preparation still lacked evidence capacity. |
| 9 | Diagnostic stopped; 294.808 seconds | Both workers passed the old context boundary; Microsoft Q3/Q4 pages rendered. Price reached the shared 100-request cap, reported incorrectly as a network failure. Cancellation preserved remaining model allowance. |
| 10 | Not started | Final-candidate preflight correctly blocked the underfunded full trial: 38 model requests remain, minimum 57 required. No model/search requests sent. |

Sanitized attempt summaries are in `docs/evaluations/2026-09-22-ticker-live-*.json`. Private raw trajectories are preserved separately; summaries include their hashes. No failed attempt is replaced by a later success.

## Verification and limits

The current candidate passed TypeScript checking, 175 source tests, 19 built-runtime tests and 17 browser UI tests. TypeScript and production build checks pass. Synthetic research fixtures exercise stale/conflicting quotes, missing provenance, wrong units, unconfirmed event dates, unresolved review findings, arithmetic and blocked decisions. They do not establish real financial correctness.

A separate final-candidate live browser smoke rendered Yahoo Finance plus Microsoft Q3 and Q4 earnings pages in three network requests total, one per page. This verifies document transport, not price accuracy, filing completeness or a finished research workflow. See `docs/evaluations/2026-09-22-browser-document-smoke.json`.

The evaluator intentionally reports independent audit as pending. Exact excerpt matching does not establish that a cited number means what the model claims, that a filing is the latest, that publishers are independent, or that valuation assumptions are reasonable. Those are required audit tasks before a positive acceptance claim. Three fresh fixed-candidate repetitions and an independent holdout remain unproven. No installed-runtime deployment or new commit/push is claimed here.

Plane's High / In Progress state was confirmed. Automatic approval review rejected the detailed status payload; only a narrower state update succeeded. Implementation details and test evidence remain recorded locally in this review.

## Remaining work in order

1. After the UTC daily allowance resets, run the full frozen final candidate with `node --import tsx scripts/evaluate-ticker-research.ts data/evaluations/<new-immutable-name>.json`. Do not reset counters, widen caps or substitute providers to force acceptance.
2. Require all seven artifacts, independent quote/session verification, a real regulatory filing, reproducible calculations and skeptical review. The diagnostic Price worker repeated a source; independent cross-check quality is still unproven. Missing evidence must produce an honest blocked result, not a forced HOLD.
3. Independently adjudicate the source semantics and valuation assumptions. Then perform fresh repetitions and a separately prepared holdout. One development pass cannot establish comprehensive reliability.
4. Commit/push and installed-runtime deployment remain separate from this local candidate; neither was performed in this follow-up.
