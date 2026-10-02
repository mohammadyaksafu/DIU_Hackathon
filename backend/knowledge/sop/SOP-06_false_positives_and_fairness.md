# SOP-06 False Positives, Feedback and Fairness
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## Why feedback matters
Every analyst label (fraud, legitimate, unsure) is stored and used for retraining and threshold tuning. Accurate labels reduce friction for good customers.

## Handling likely false positives
Online sellers, shopkeepers and salary recipients can look unusual: many incoming payments, quick cash-outs, large evening cash-outs. Check account history and the counterparty relationship before escalating. Mark clearly legitimate cases quickly.

## Fairness monitoring
The fairness report compares false-positive rates across divisions, age bands, KYC levels, personas and account tenure. If one segment's false-positive rate is more than 1.25 times another's, the risk team reviews thresholds or segment overrides in the policy file. Demographic attributes are not used as model inputs.
