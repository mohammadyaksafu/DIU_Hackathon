# SOP-02 Social-Engineering Scams (Prize, Fee, Refund, OTP)
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## Common patterns
Prize or lottery scam: the victim is told they won a prize and must pay a "processing fee" or "tax" first, usually a round amount to a number they have never paid before. Wrong-send refund scam: a stranger sends a small amount, then calls claiming a mistake and asks for a larger "refund". OTP scam: the caller impersonates support and asks for the OTP or PIN. Reason codes: R_ROUND_AMOUNT, R_NEW_RECIPIENT, R_RECIPIENT_HIGH_FANIN, R_REFUND_PATTERN, R_UNUSUAL_AMOUNT.

## Customer intervention
Show the pre-transaction warning in the customer's language (Bangla by default). Offer cancel, a cooling-off delay and a "call upay" option. Never block a customer's own legitimate payment permanently; the goal is informed choice.

## Analyst actions
1. If the customer cancelled after the warning, record the case as "scam averted" and review the recipient wallet.
2. If money was sent, contact the receiving wallet's provider immediately for a temporary freeze request.
3. When the recipient has many new senders in 24 hours, escalate to mule review (SOP-03).
