# Fresh reviewer cases: author handoff

The prepared six-case packet now has owner-supplied labels in `../evaluations/2026-09-22-human-accounting-adjudication.json`. Those cases remain developer-authored. This next batch is pending human authorship; no cases have been generated or evaluated for it.

Theo or another human independent of the implementation should prepare six new source/report pairs: three supported reports and three unsupported reports, with a written rationale for each. Cover numerical source accounting, dates or supersession, and currency or units. Use genuinely different situations, not renamed or renumbered copies of the old packet. Keep each pair self-contained and small enough for the existing review context limit. Do not use the candidate reviewer to generate or repair the cases or labels. Disclose any other model assistance and prior exposure; such cases require an accurate authorship label rather than an unqualified human-authored claim.

Provide two separate files or message blocks:

1. Cases: case ID, source text, report text, and the criterion to assess. Include no expected labels or explanations in this block.
2. Answer key: author identity, case ID, supported/unsupported judgment, evidence-based reason, and any model assistance or prior use. Review time may remain unknown. Keep this block out of all candidate model prompts.

Human authors may know their own answer key. “Unseen” here means the cases have not been used for candidate inference or tuning. This is owner-authored and owner-labeled evidence if the same person supplies both, not a second independent human adjudication.

Before the operator opens the new case content, freeze the candidate source, evaluation driver, two-stage review prompts/schema, model digest, and acceptance rule in a manifest. Freeze both case and key bytes before inference, validate six unique IDs and complete labels, and record provenance. Do not modify the candidate based on inspection of new cases. If a case is ambiguous or outside the supported contract, retain that intake outcome and do not quietly replace it to improve results.

For this bounded reviewer-only batch, retain the existing Qwen3.5:9b configuration: temperature 0, 1,536 output tokens, 90 seconds per inference call, and at most two stages per case. Use the shared inference reservation ledger, at most 12 calls, and one attempt per case. A first-stage failure is final; only provisional passes receive consistency confirmation. No retry, timeout increase, provider substitution or tuning after exposure. The driver must enforce manifest hashes and exclusive report creation before running.

Acceptance rule: zero false acceptances, all three supported controls accepted, and zero inference/protocol errors. Publish all six outcomes, including inconclusive decisions, errors, tokens, latency and evidence hashes. Safe blocking of an unsupported report is distinguished from a precise correct diagnosis. Any unresolved human label prevents a qualification verdict. No general reliability estimate, autonomous workflow qualification, or swarm advantage is established by six reviewer cases.

Current status: awaiting independent case authorship and a frozen executable evaluation manifest. This document is a handoff protocol, not an executed evaluation or a claim that the current working tree is frozen.
