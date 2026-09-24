# Original-document accounting remediation

VAC-23/28/42 remain open. The new source path removes the need to prepare owner JSON for three explicit text formats. It does not establish general document comprehension, OCR, independent semantic qualification or swarm advantage.

`reconciliation` contracts can now select `sourceFormat: "text-records-v1"` and pin original owner `.txt`/`.csv` file versions and hashes. Every nonempty line must parse as a supported header/record. Unsupported prose, extra instructions, conflicting identities, missing/duplicate fields, ambiguous units and malformed values fail before a run starts. The old owner-JSON contract remains the default.

Supported formats:

- Unquoted CSV with exact header `id,entity,currency,unit,type,amount` and explicit fields on every row.
- Labeled text records separated by blank lines, containing exactly `ID`, `Entity`, `Currency`, `Unit`, `Type`, `Amount` labels (`Label: value`), in any order.
- The earlier failed pilot's original `Synthetic supplier ... cents, not dollars ...` header and `id,type,amount` rows. This legacy grammar is explicitly narrow and is development regression support, not a general prose parser.

Types are `invoice` or `credit`. Minor-unit amounts are signed safe integers; major-unit amounts require exactly two decimal digits and USD/EUR/SGD/GBP. No inferred currency scaling or conversion. A credit reverses its signed amount. Identity remains entity plus ID; identical duplicates contribute zero, conflicting duplicates block. Currencies remain separate.

Every extracted field retains its exact quote, one-based original line, and zero-based end-exclusive character offsets within that line. Each row retains original file/version/hash and physical line. The completion check recomputes all rows, spans, duplicates and totals from original pinned bytes. Matching totals cannot excuse omitted records or forged spans. Later source versions do not replace the contracted original. Original JSON sources now also undergo actual-byte hash and UTF-8 checks.

The existing file-write tool accepts `reconcileContract` and `expectedVersion` to materialize the complete verified ledger under the same write grant. This avoids model retyping and fits large ledgers without truncating their stored evidence. It adds no sandbox, account, network or credential authority. A model can still write a draft manually; the contract rejects inaccurate final output.

Focused tests reproduce the old failed pilot's 18,000/13,350-cent totals directly from its original text and exercise CSV/label extraction, major-unit conversion, duplicate conflicts, mixed currencies, injection/unsupported prose, size/amount limits, exact spans, immutable sources, tampering and project isolation. Source and production-mode suites passed 213 tests each with Docker enabled. These source/build results do not establish live model acceptance.

Live campaign declaration: `docs/test-plans/document-accounting-qualification.md`. Completed results and subsequent development corrections follow below. All original failures remain retained.

## Preserved first live campaign

The first frozen candidate used 65 local inference attempts. All nine produced ledgers passed independently fixed totals, row counts, duplicate counts and the exact original-source contract, but **0/9 passed end-to-end acceptance**. The single arm was blocked by invalid/abbreviated quotations. Planned and autonomous arms also exposed workers treating coordinator duties as their own and waiting for sibling completion. No correct artifact was counted as a completed task over those failures.

The six standalone developer-authored reviewer challenges all matched their labels: three correct reports accepted, three incorrect reports rejected, zero false acceptances/errors. That narrow result did not overcome the full-workflow failures. Original report and complete source-snapshot hashes are retained in the [sanitized campaign summary](../evaluations/2026-09-22-document-accounting-summary.json).

## Corrections after preserving the first campaign

- Review packets supply a complete catalog of bounded original-text excerpts with stable IDs derived from filename, stored hash, version, offsets and actual quoted text. Nothing is truncated: catalog excerpts concatenate to each complete original file, or the existing context bound rejects the packet.
- The reviewer selects IDs from an explicit schema enum. The server resolves them to exact text and retains IDs, offsets and quotations in the assessment. Unknown or stale references fail. Input/output grounding requirements remain. Valid provenance does not establish semantic truth; both review stages remain required. Exact-quote validation remains for historical/legacy responses.
- Confirmation refers to the same catalog and includes provisional reference IDs without duplicating their already-present text. It neither alters the evidence nor increases the 14,336-byte context bound. Full resolved evidence remains in the audit record.
- Read-only workers no longer receive the coordinator's global objective as an extra assignment. Their context explicitly limits completion to their own assigned work, with dependencies handled by the scheduler. Worker delegation requirements reflect that worker's actual remaining obligation. No execution, dependency, completion, grant or budget gate was relaxed.

The corrections passed isolated focused tests before application. The corrected full source and production-mode suites each passed **215 tests, zero failures/skips**, with Docker enabled. The second campaign repeats the exposed cases as a separately frozen **development regression**; it is not new holdout evidence. Neither campaign measures human correction time or demonstrates broad swarm advantage.

A separate [blinded human review packet](../test-plans/blinded-accounting-review.md) is prepared and hash-frozen outside the model campaign. Theo subsequently supplied all six [human judgments](../evaluations/2026-09-22-human-accounting-adjudication.json): 01/04/06 supported and 02/03/05 unsupported; review time is unknown. The recorded packet SHA-256 was verified unchanged before recording. It remains developer-authored; human adjudication does not make its authorship independent. No candidate-model evaluation against these human labels has been performed in this step.

Second-candidate browser regression: **19/19 passed**. Build source hash: `68a1a8670e3312c4bb7b9897e9f46a47c94f4c2050da7fd08493301d4fd16ac3`. Existing Vite chunk-size advisory remains. Runtime publication inventory and whitespace checks passed. Latencies in these local campaigns are descriptive: local load/caching were not controlled, and some automated checks ran concurrently with inference. Source snapshots make the evaluated candidates recoverable; source identity and build identity use different declared inventories and should not be compared as if interchangeable.

## Second full campaign and focused role correction

The second candidate accepted **8/9** full tasks: single 3/3 using 18 model calls, planned 2/3 using 23, autonomous 3/3 using 27. All nine ledgers were numerically correct. The remaining planned labeled-text case selected only ledger references; original-input grounding correctly blocked it. Its six standalone reviewer controls again matched all labels.

The final runtime schema therefore requires separate `inputReference` and `outputReference` fields when inputs exist. Each pair is role-validated by the server; at most three pairs preserve the existing six-excerpt limit. This strengthens the existing requirement rather than crediting the output's copied source excerpts as original-source checking.

A separately frozen focused follow-up repeated that exposed labeled-text condition in all three modes. **0/3 were accepted**, despite correct ledgers and valid grounding in all three. The reviewer now made substantive sign/unit errors: it described a correctly sign-reversed credit and correctly converted minor-unit amount as inconsistent. Six simpler standalone controls still all passed. This is direct evidence that valid citations and a few passing controls do not establish semantic reliability. No failed result was relabeled or bypassed.

The final runtime passed **215 source tests, 215 production-mode tests and 19 Chromium tests**, with no failures/skips and Docker enabled. The added model-comparison driver subsequently passed TypeScript/build; all built runtime/UI asset hashes are byte-identical to that tested runtime. Latest build source identity, including the driver: `3f348c10219b7e2589122ddfc8329230ee5f7b05de66ee052cdc0696c0c684ae`.

Across the three accounting campaigns, 171 local inference attempts were recorded. Every produced ledger passed its deterministic numerical/provenance checks; end-to-end results remain the separate 0/9, 8/9 and 0/3 denominators. These repeated development cases must not be pooled into an independent reliability estimate.

## Controlled model comparison

An existing 27B Qwen model was found alongside 9B on the 24-GiB host. A separate [two-packet comparison](../test-plans/reviewer-model-comparison.md) reconstructs the exact failed review packet, verifies its original hash, and compares both installed models on that correct packet and a deliberately wrong variant. It does not change defaults, rerun the autonomous workflow, download models or establish independent qualification. The comparison finished with four local inference attempts; its [sanitized receipt](../evaluations/2026-09-22-reviewer-models-summary.json) retains model digests, packet hashes, limits and raw-artifact hashes.


| Model | Correct ledger | Wrong ledger | Structured correct verdicts |
| --- | --- | --- | --- |
| Qwen 9B | Incorrectly rejected, 23.1 seconds | No structured review, 35.7 seconds | 0/2 |
| Qwen 27B | Timed out, 90.0 seconds | Timed out, 90.0 seconds | 0/2 |

The 9B wrong-packet response blocked execution, but did so outside the required review schema and included faulty unit reasoning. It is an error, not a successful validated review. Neither model falsely accepted the wrong packet; errors and timeouts cannot establish discrimination. Model-loading latency is included. The two 27B timeouts show it did not meet this host's fixed operational limit, not that its reasoning quality was measured or that it can never work. No timeout was increased, failed trial retried, or model default changed.

The bounded remediation and comparison are complete; the main semantic-quality bottleneck remains unresolved. Human labeling of the prepared packet is now recorded. At the owner's subsequent request, Codex authored a fresh six-case packet and Theo supplied all six judgments. The [first candidate evaluation](2026-09-22-fresh-review-02.md) failed acceptance: three supported reports accepted, two unsupported reports correctly rejected, one protocol error, and zero false acceptances in nine calls. These cases are now exposed developer-authored evidence. The [independently authored fresh-case path](../test-plans/fresh-human-authored-review.md) remains outstanding. Further model or prompt tuning on exposed cases cannot become independent qualification evidence. General prose/PDF/OCR and actual owner correction time remain unmeasured. The second accounting campaign used fewer calls in the single-agent arm for the same correct ledgers; these observations provide no demonstrated swarm advantage.

There were 175 local inference attempts across the three accounting campaigns and this comparison. No paid/search requests, external business-app actions, deployment, commit or push were performed. VAC-23/28/42 and umbrella VAC-20 retain their previous states; completed engineering changes are recorded without closing their broader acceptance gates.
