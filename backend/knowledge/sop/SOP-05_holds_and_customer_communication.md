# SOP-05 Holds, Releases and Customer Communication
> Synthetic demo procedure written for the Shurokkha hackathon prototype. Not an official upay document.

## Decision tiers
ALLOW: the transfer proceeds. WARN: the customer sees an explanation and chooses to cancel or continue. HOLD: the transfer is paused until an analyst reviews it. The system never permanently blocks a customer automatically.

## Service levels
Review HOLD cases within 15 minutes during business hours and within 60 minutes at night. If an alert cannot be resolved in time, contact the customer to explain the delay.

## Communication rules
Use plain language in the customer's preferred language. Explain the main reasons shown on the alert. Never ask for PIN, OTP or password. Never disclose internal model scores or details of other customers.

## Releasing a hold
If the analyst confirms the transfer is legitimate, mark the alert legitimate; the transfer is completed automatically and the label is used to improve the model.
