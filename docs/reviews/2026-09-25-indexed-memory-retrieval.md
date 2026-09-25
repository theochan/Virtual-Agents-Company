# VAC-47 bounded indexed project-memory retrieval

VAC-47 delivers the local retrieval slice explicitly allowed by VAC-39. Project memory reads no longer scan the full memory history or use a case-insensitive substring over the last 20 matches. SQLite FTS5 supplies bounded relevance search, while non-query reads use a bounded indexed recency path. Requests expose explicit limits and offsets, cap returned context at 20 records, and remain project-isolated.

## Truth and conflict controls

- Every result retains its source run, source node and creation timestamp.
- Owner approval is labeled `owner_approved_historical`; each result warns that time-sensitive claims require current evidence.
- An optional owner-declared subject identifies facts that may change. Multiple approved memories for one subject are withheld rather than arbitrarily ranked.
- A replacement proposal must name an approved memory with the same project and subject. When the owner approves it, all prior approved claims for that subject become immutable `superseded` records pointing to the replacement.
- Re-review is rejected. Proposed and rejected memories never enter retrieval, and superseded memories remain counted but unavailable as current context.

## Acceptance evidence

The focused corpus covers exclusion before approval, indexed prefix retrieval, immutable provenance, historical-freshness labeling, conflict withholding, explicit supersession, repeat-review rejection, pagination and cross-project isolation. A 2,500-record test disables the generic history loader and still retrieves a bounded seven-record page, proving the retrieval path does not load project-memory history.

The complete source suite and the built-server suite each passed 217 runnable tests with zero failures and six Docker-only skips. TypeScript, the production build, the license gate, the frozen publication-evidence gate and whitespace validation passed. The existing Vite chunk-size advisory is unchanged.

## Boundary

This closes VAC-47, not VAC-39. It does not establish large-file/blob migration, backup/restore at scale, distributed retrieval, multi-host capacity, long-horizon relevance, or latency and memory qualification at VAC-39's eventual declared production sizes. No deployment, commit or push is included.

Evidence: [sanitized acceptance summary](../evaluations/2026-09-25-indexed-memory-retrieval-summary.json) and [sanitized Plane closure receipt](../evaluations/2026-09-25-indexed-memory-retrieval-plane.json).
