# VAC-38 operation recovery and reconciliation

Implemented an owner-controlled remote reconciliation path and fixed uncertain connector writes being repeated under a fresh call ID. This is a fail-closed recovery contract, not exactly-once delivery across arbitrary providers.

## Operation classes and boundaries

| Class | Examples | Recovery rule |
| --- | --- | --- |
| Pure | Calculator and deterministic accounting computation | Recompute within the root's existing limits. |
| Read | Project/file/evidence reads, connector tools declared read | A fresh read can be requested; previous attempts and usage stay recorded. A connector's declared effect is an owner trust decision. |
| Internally guarded writes | Versioned project files, cached successful tool receipts | Existing expected-version checks, immutable versions and call receipts prevent blind duplicate writes. Restart does not resurrect interrupted work. |
| Externally idempotent | No generic provider guarantee is assumed | Treat external writes as uncertain even if the provider informally claims idempotency. |
| Uncertain side effects | Connector writes and browser interactions; unconfirmed local proposals | Stop on uncertainty. Connector recovery uses the protocol below. Browser actions and unsupported/legacy connector operations do not gain automatic replay. Memory proposals still need owner review. |

Connector operation records now retain canonical argument identity, configuration hash, classification and status before dispatch. Object key reordering, a different node, a new run or a fresh call ID cannot bypass an unresolved equivalent write for that connector. Legacy uncertain writes without comparable identity conservatively block the same connector/tool. Successful cached receipts remain reusable without another dispatch. This does not correlate separately registered connector IDs or distinct payloads representing the same business action.

## Provider contract

A connector write tool may have:

```json
{
  "name": "save",
  "effect": "write",
  "reconciliation": {
    "statusTool": "operation_status",
    "operationKeyArgument": "operationKey"
  }
}
```

`operation_status` must be separately declared as a read tool. The operation-key argument is reserved for VAC, is not part of the model's write argument schema, and cannot be supplied by the model. VAC injects the original call ID into the outbound write. The gateway must retain that identity atomically with the business effect and expose a lookup with the same argument name. A lookup returns exactly:

```json
{"operationKey":"the-original-call-id","status":"not_applied","final":true}
```

Allowed statuses are `applied`, `not_applied`, and `unknown`. `final:true` must be an authoritative terminal statement: notably, `not_applied` must mean the original request cannot apply later, not merely that the record is currently absent. Pending/eventually-consistent absence is `final:false` or `unknown`. MCP gateways use `structuredContent` for this object. Unsupported or dishonest gateways cannot acquire exactly-once guarantees from VAC; configuration requires the owner to trust these semantics.

The owner stops the run and selects **Check remote status**. The authenticated route uses only the configured read tool and original operation key, with the same bounded transport, endpoint restrictions and credential isolation. Every check is recorded before I/O, including failures. Results carry a hash and operation binding. Wrong identity, malformed data, configuration drift, cancellation, failed lookup and non-final responses cannot authorize a repeat. A new check invalidates any prior unused authorization.

A final `applied` result blocks an equivalent repeat. A final `not_applied` result permits the separate **Authorize one repeat** action. The resulting authorization is consumed atomically by one replacement operation and is valid for five minutes from the remote check. A new run and its normal exact-action approval are still required. No route resumes the failed run, erases original attempts, resets usage or automatically retries a write. The remote lookup is an owner administrative read recorded in the reconciliation audit, not a model tool call charged retroactively to a terminal run.

Changed connector configuration or stale evidence blocks dispatch. Connectors without a status contract retain uncertainty and cannot repeat the same unresolved write. The UI states this explicitly. Recovery policy is additive; existing grants, approvals, deadline/call budgets and cancellation checks remain active.

## Verification

Real local HTTP fixtures test lost responses, equivalent arguments with different object-key ordering/call IDs, applied/non-applied/non-final results, wrong identity, failed checks, stale evidence, changed configuration, owner authorization, one-time consumption and successful-receipt reuse. An actual child process is killed after the fixture records the remote effect but before a response: intent and reserved usage survive, the remote lookup confirms application and replacement dispatch is rejected. Cancellation after remote application likewise preserves uncertainty and blocks replay. Unsupported and legacy operations fail closed.

A built-app browser test performs the initial exact-action approval, observes failure, checks remote status, explicitly authorizes one repeat, reloads and confirms persisted owner authorization. The API rejects unauthenticated repeat authorization. An initial browser fixture had an incorrect prompt-prefix/selector and was corrected; it was not an application pass. Final full-suite results are appended after validation.

Additional defect fixed: the structured accounting read limit now leaves receipt-metadata headroom below the model observation limit; oversized ledgers fail instead of being silently cut off. The existing failed model pilot remains unchanged. No provider credentials were displayed, no real external write or paid inference was exercised, and no deployment is claimed.

Final acceptance: TypeScript/build passed; source and production-mode suites each passed **194 tests with zero failures or skips**, with Docker enabled. All **18 browser tests passed**, including the complete replacement-run path with a fresh exact-action approval, one confirmed replacement write, consumed recovery authorization and unchanged original usage. Final tested build source hash: `41f21673094de0213eb27cae40bf5e021f3a22d6b70f2ae621acc5f86d2d4764`. The final source-candidate and release-allowlist secret scans reported zero findings. Ambiguous duplicate connector tool names are also rejected before registration. These are source/build acceptance results using controlled gateways; deploying the release and qualifying a specific business provider are separate actions.
