# SOP-03 Money-Mule Network Review
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## What a mule ring looks like
Collector wallets receive money from many unrelated senders (high fan-in), forward it within minutes to other wallets, which cash out at a small number of agents. Mule wallets can be newly opened or older accounts that were rented or sold. Reason codes: R_MULE_NETWORK, R_RAPID_FORWARDING, R_RAPID_CASHOUT_AFTER_INFLOW, R_YOUNG_RECIPIENT_ACCOUNT.

## Review steps
1. Open the network view for the wallet and inspect the 2-hop neighbourhood and community.
2. Check the community fan-in (external senders per member) and cash-out ratio. Values above 1.5 senders per member with more than 80% cashed out are strong indicators.
3. Identify the cash-out agents involved and check them for repeated involvement.
4. Distinguish legitimate high fan-in wallets (online sellers, shopkeepers): they have steady customer flows, longer history and do not forward money to other personal wallets.

## Actions
Restrict outgoing transfers on confirmed mule wallets pending investigation, notify the agent-network team about involved agents, and prepare a suspicious activity report for the compliance team. All restrictions require human approval.
