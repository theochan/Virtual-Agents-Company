# Upgrade alignment review

Date: 2026-09-06. Scope: current uncommitted source changes against `upgrades.md`, including removal of OmniRoute and Tavily/Brave search configuration. This report does not certify the installed runtime or complete the production backlog.

## Verdict

Partially aligned. The changes advance retrieval, timeout validation, and basic diagnostics. They do not establish successful live inference, business-task quality, disaster recovery, full operational readiness, or bounded spending. The application remains experimental.

## Findings and corrections

| Finding in the incoming changes | Correction |
|---|---|
| Search keys were persisted in SQLite settings, so database backups would contain credentials despite the documented separation. | UI-saved search keys now live in an atomic owner-only `search-credentials.json` file. Legacy settings keys migrate at startup. Public settings return configured/masked values only. Removal persists across restart. This is plaintext private storage; old backups/pages may retain historical keys. |
| Tavily's generated answer was inserted as a search result and assigned the first result's URL. That falsely attributed a model-generated synthesis to a source. | Request source results without the generated answer and ignore any unsolicited answer field. Source snippets and guidance remain separate. |
| Any nonempty search response claimed complete coverage. | All returned results are partial evidence. Empty results have `found: false` and coverage `none`. Page dates are not asserted to be publication dates for Brave. |
| Tavily and Brave requests followed redirects by default while carrying credentials. | Both reject redirects. Source URLs are restricted to HTTP(S), response schemas are validated, and results/snippets are bounded. |
| Provider failures were logged and silently replaced by fallback results. Cancellation could enter the fallback path. | Attempts and sanitized failures are retained in receipts. Explicit provider selection does not switch services. Auto alone falls back after failures; cancellation stops further requests. A failed search yields a failed tool receipt, while valid empty results are successful execution with no evidence. |
| Failed DuckDuckGo rewrites disappeared from provenance. | Preserve attempted rewritten queries even when they return no result. Brave's reported altered query is retained. |
| The health route wrote to storage, disclosed the private directory, and suggested overall health without testing worker progress or providers. | Keep public liveness cheap. Put storage/queue diagnostics behind authenticated `/api/ready`, omit the private path, and label provider readiness untested. Full operational readiness remains open. |
| Removing the provider list alone did not explicitly reject every persisted retired-provider run. | Supported-provider allowlist guards configuration resolution and inference. Retired-provider records stay historical; users must select a supported model. The selector presents unsupported configuration explicitly. |
| The settings page claimed zero cloud egress for local models, despite external search tools. | Explain that local inference does not prevent web-search queries from leaving the machine. |

OmniRoute adapter defaults, credentials, discovery route, UI choices, model presets, and runtime types are removed. Remaining mentions in historical reviews, migration guidance, and negative regression tests are intentional evidence, not supported integrations. Existing private records and configuration files were not deleted or silently reassigned to another provider.

## Search behavior and credential contract

- Owner configures workspace-wide keys in Settings. Only equipped agents at access level 3 or 4 can execute Web search; keys do not enter model context.
- Tavily Only and Brave Only use the selected provider. Auto tries configured Tavily, then Brave on failure, then limited DuckDuckGo. Valid empty results stop further calls.
- Saved keys override environment defaults. Removing a key stores an empty override. The separate file is excluded from the SQLite backup process but must be protected like other private configuration.
- Test Connection consumes one real search request when used. No live account validation was performed in this review.
- Snippets and dates support review; they do not constitute exhaustive research, verified full-page content, or live financial quotes.

The adapters were checked against the official [Tavily Search contract](https://docs.tavily.com/documentation/api-reference/endpoint/search) and [Brave Web Search contract](https://api-dashboard.search.brave.com/api-reference/web/search/get). Tavily documents its optional answer as LLM-generated; Brave documents query alteration and page-age semantics. These distinctions informed the evidence handling above.

## Validation

- `npm run check`: TypeScript validation, 31 automated tests, and production build passed during this review.
- New coverage includes retired-provider rejection, credential migration/removal/restart, protected search settings, masked API read-back, provider selection and failure receipts, cancellation without fallback, invalid source URLs, bounded excerpts, query rewriting, and timeout bounds.
- Disposable production UI at a separate loopback port: sign-in, both search-key inputs with dummy values, configured status, and key removal verified. No real search credentials were used for those interactions.
- Search fixtures validate contracts and failure behavior; they do not establish subscription access or real-world search quality. Browser interactions were manual agent verification, not browser CI.

## Remaining release gates

1. Validate a supported live model and actual Tavily/Brave subscription end to end, including an agent consuming a search receipt.
2. Define the three supported workflows and run the fixed business evaluation set, including relevance, freshness and unsupported requests.
3. Perform a full application restore drill and interrupted-run recovery.
4. Add worker progress monitoring, logs/retention, supervised deployment, and verified release identity.
5. Add paid-search/model budget controls and validate queue/storage growth at the declared workload.
6. Finish browser CI, fresh-checkout release acceptance, owner access lifecycle, and distribution provenance review.

No commit, push, or production-service restart was performed. Existing work was reviewed and extended in place.
