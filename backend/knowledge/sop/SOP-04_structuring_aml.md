# SOP-04 Structuring and AML Escalation
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## Indicator
Structuring means splitting a large amount into several cash-outs just below the per-transaction limit (25,000 BDT in this prototype), often on the same day at the same agent, sometimes after a large inflow from an unknown business wallet. Reason codes: R_STRUCTURING, R_HIGH_VELOCITY.

## Steps
1. List the wallet's cash-outs in the last 7 days and the agents used.
2. Check whether other wallets cashed out near the limit at the same agent on the same day (coordinated structuring).
3. Legitimate shopkeepers may cash out large amounts in the evening; compare with their history before escalating.
4. Escalate confirmed cases to the compliance team for a suspicious transaction report. Do not tip off the customer.
