# EuroFlow Payments Group SCA policy

EuroFlow applies strong customer authentication for account login, new device enrollment, card funding, instant credit transfer confirmation, open banking consent approval and remote mandate setup.

The standard authentication flow uses password plus mobile possession check. Sensitive payment actions require biometric confirmation or one-time passcode in the EuroFlow mobile app. Step-up authentication is triggered for new devices, unusual location, high transfer amount and new beneficiary transfers.

Authentication events are logged with timestamp, device ID, user ID, action type, result, authentication method and transaction binding metadata.

Failed authentication blocks the transaction and asks the customer to retry. The current policy describes basic retry handling but does not yet include a full exemption catalogue, fallback owner, fallback risk acceptance criteria or non-smartphone authentication route for users with accessibility constraints.
