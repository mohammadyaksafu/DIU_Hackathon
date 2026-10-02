# SOP-01 Account Takeover (ATO) Response
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## Indicators
Account takeover usually follows a SIM swap or SIM replacement request, a PIN/password reset, and a login from a device never seen on the wallet. The attacker then drains the balance quickly, often at night, to new recipients. Reason codes: R_ATO_COMBO, R_SIM_SWAP_RECENT, R_PASSWORD_RESET_RECENT, R_NEW_DEVICE, R_UNUSUAL_HOUR.

## Immediate actions
1. Keep the transaction on HOLD. Do not release funds until the customer is verified.
2. Temporarily restrict outgoing transfers from the wallet (24 h) and invalidate active sessions.
3. Call the customer on their registered alternate contact, not on the swapped SIM.
4. Verify identity with KYC questions; never ask for the PIN or OTP.

## Resolution
If the customer confirms they did not initiate the transfer, mark the alert as fraud, keep the restriction, and file a SIM-swap fraud report with the mobile operator. Flag every recipient wallet for mule review (SOP-03). If the customer confirms the transfer was genuine (e.g. bought a new phone), mark legitimate and release the hold.
