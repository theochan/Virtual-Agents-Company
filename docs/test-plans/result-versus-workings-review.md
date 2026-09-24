# Result correctness versus required workings

Use one of these explicit rubric forms for future tasks. This does not amend the consumed F01 case or its human label.

**Result-only:** The reported result must agree with an independent calculation from the source, including units, scope and rounding. Intermediate calculations and citations inside the report are not required. The reviewer must provide its own grounded evidence and reasoning.

**Result and workings:** The reported result must be correct, and the report must explicitly show the listed intermediate calculations, units and operation order. Specify those steps in the criterion. A correct final number alone does not satisfy this criterion; displayed but incorrect calculations do not satisfy it either.

Select the rubric before execution based on the actual task requirement. Never select it after seeing a model verdict. Keep the existing strict evidence validation and two-stage review; acceptance needs both stages to pass. A fail or inconclusive decision blocks acceptance, and an invalid response is a protocol error.

## Packet 03 declaration

Six fresh developer-authored cases will distinguish these rubrics, including paired cases that hold source and report fixed while changing the explicit criterion. Paired cases are correlated; six cases do not represent six independent observations. Expected composition is three supported and three unsupported cases, subject to the owner's judgments. Disagreement or an inconclusive human label must be retained and resolved before inference, without silently substituting cases.

Before writing the cases, hash-pin current source and the evaluation driver in `../evaluations/2026-09-23-rubric-review-preparation.json`. Pin the expected existing Qwen3.5:9b digest from the prior verified campaign and require a live digest match before inference. Hash the completed packet and separate developer answer key before human review. Require a separate hash-bound owner judgment record before creating the execution manifest. Keep labels out of candidate prompts. Do not change source or driver after authoring to fit cases.

Use the existing candidate's required `submit_review` tool, temperature zero, 1,536 output tokens, 90 seconds per call, at most two stages per case, and at most 12 shared-ledger inference reservations. Run once in packet order, in separate requests with no cross-case conversational history. No retries, default changes, provider substitution, limit increases or tuning within the campaign.

Gate: all three supported cases accepted, zero false acceptances, zero protocol/inference errors, and six completed case attempts. Report valid rejections, inconclusive decisions and errors separately. Preserve every attempt and manifest. Success would show a bounded rubric-discrimination result on Codex-authored, owner-adjudicated cases, not independent human authorship or general reviewer qualification.
