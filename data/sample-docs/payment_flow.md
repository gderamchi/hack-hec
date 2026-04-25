# EuroFlow Payments Group payment flow

EuroFlow Payments Group is a composite EU payment institution that operates consumer wallets, SME payment accounts, merchant acquiring, card funding, instant credit transfers, payment initiation and multi-currency transfers.

Customers can create a wallet, link an external bank account, add a new beneficiary and initiate an instant credit transfer from the mobile app or web console. The payment screen shows amount, currency, beneficiary display name, beneficiary IBAN, scheduled execution time, fees, estimated arrival time, payment status copy and support reference.

For new beneficiaries, the customer enters the beneficiary display name and IBAN. EuroFlow validates the IBAN format, screens the beneficiary against internal sanctions and fraud blocklists, and calls a beneficiary verification service. The service returns match, close match, mismatch or unavailable. Match results are stored with timestamp, beneficiary name submitted, provider response and decision ID.

When there is a close match or mismatch, the app shows a mismatch warning before the payment order can be confirmed. The customer must either cancel, edit the beneficiary or explicitly continue. The warning event is retained in the audit log.

The payment service validates available balance, daily limits, velocity, merchant risk, device trust and fraud risk before execution. If the transaction passes checks, EuroFlow sends the transfer through its banking partner. The confirmation receipt includes transaction ID, timestamp, beneficiary IBAN, amount, currency, fees, status and support reference.

Audit events are written for payment initiation, beneficiary verification, customer warning, balance check, limit check, fraud score, customer confirmation and execution response.
