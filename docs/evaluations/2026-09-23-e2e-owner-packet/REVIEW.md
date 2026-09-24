# Owner review: accounting outputs

Review the actual artifacts against [register.csv](register.csv) and [supplement.txt](supplement.txt). These are synthetic records, not real accounts. For this task, GBP/EUR major amounts convert to minor units at 100:1; amounts in minor units are already integers. Count identical normalized entity/ID records once, retain each original row with its source evidence, and reverse the sign of a credit amount. Keep supplier/currency totals separate.

The required output is a ledger with `rows` and `totals`, normalized integer minor amounts, source-row field evidence, duplicate decisions and signed amounts. No prose calculations are required. Judge whether the artifact meets this task, not whether its prose sounds confident.

Original outputs: [A.json](A.json), [B.json](B.json), [C.json](C.json). These are byte-for-byte exports from the run stores. A and B are identical, so one content judgment can explicitly apply to both. Do not spend time repeating the same review merely to create three measurements. Neutral labels do not establish full blinding; prior commentary and repeated artifacts may influence review.

Start a timer only if you intend to measure review effort. If you actually make corrections, save a separate copy and measure correction time separately. Do not overwrite these originals. A proposed correction is not measured correction work. Unknown is valid; zero means you measured no correction time, not that you did not measure it.

Reply using this form:

```text
A/B: acceptable / needs correction / unusable / inconclusive
Reason and specific corrections:
Review minutes: measured value or unknown
Actual correction minutes: measured value or unknown

C: acceptable / needs correction / unusable / inconclusive
Reason and specific corrections:
Review minutes: measured value or unknown
Actual correction minutes: measured value or unknown

Could you use either output directly for the stated task? Why?
```

Owner judgments are recorded separately from machine status. An acceptable artifact does not convert a blocked workflow into a completed one. Since A/B share content, this review cannot establish separate owner-effort estimates for their production modes.
