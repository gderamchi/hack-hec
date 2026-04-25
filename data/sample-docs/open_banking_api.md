# EuroFlow Payments Group open banking API

EuroFlow offers account information and payment initiation services for users who connect external EU bank accounts. The dedicated interface exposes endpoints for consent creation, consent status, account list, balance retrieval, transaction retrieval, payment initiation status and consent revocation.

Consent creation requires user redirect to the bank authorization screen. The consent record stores bank identifier, account IDs, granted scopes, creation timestamp, expiry date, renewal status and consent status. Consent audit records are retained for customer support and compliance review.

Third-party connectivity is monitored through API latency, success rate, bank connector availability and error-class dashboards. EuroFlow maintains an incident channel for connector outages and publishes status updates to customer support.

The platform supports consent revocation when a bank returns a revoked status or when support manually disables an external account connection. A customer-facing permission dashboard is planned, but the product specification does not yet show an active consent list or self-service revoke action.
