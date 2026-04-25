import type { Requirement } from "@/lib/types";

const PSR_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0367";
const PSD3_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52023PC0366";
const INSTANT_PAYMENTS_URL =
  "https://finance.ec.europa.eu/consumer-finance-and-payments/payment-services/payment-services_en";
const EP_AGREEMENT_URL =
  "https://www.europarl.europa.eu/news/en/press-room/20251121IPR31540/";
const EP_PSR_TRAIN_URL =
  "https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-revision-of-eu-rules-on-payment-services";
const EP_PSD3_TRAIN_URL =
  "https://www.europarl.europa.eu/legislative-train/theme-economic-and-monetary-affairs-econ/file-payment-services-and-electronic-money-services-%28directive%29";
const EBA_FRAUD_OPINION_URL =
  "https://www.eba.europa.eu/publications-and-media/press-releases/eba-has-identified-new-types-payment-fraud-and-proposes-measures-mitigate-underlying-risks-and";
const EBA_ECB_FRAUD_REPORT_URL =
  "https://www.eba.europa.eu/publications-and-media/press-releases/joint-eba-ecb-report-payment-fraud-strong-authentication-remains-effective-fraudsters-are-adapting";

export const PSD3_PSR_REQUIREMENTS: Requirement[] = [
  {
    id: "PSR-PAYEE-001",
    domain: "Payee Verification",
    title: "Verify payee name before credit transfer execution",
    summary:
      "Payment service providers should check whether the payee name matches the account identifier and notify the payer of discrepancies before execution.",
    expectedEvidence: [
      "payee-name or IBAN-name verification flow",
      "match, close-match and mismatch decision logic",
      "customer notification copy before execution",
      "audit events proving the check was offered and displayed"
    ],
    impactAreas: ["Product", "Engineering", "Compliance", "Fraud"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Instant credit transfers", "Multi-currency transfers"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Explanatory memorandum, authorisation of payment transactions; payee matching service",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-FRAUD-001",
    domain: "Fraud Prevention",
    title: "Operate risk-based fraud prevention controls",
    summary:
      "Providers should maintain controls that prevent, detect and investigate fraud across payment channels.",
    expectedEvidence: [
      "fraud policy",
      "risk scoring model and control ownership",
      "case management workflow",
      "periodic rule review and tuning evidence"
    ],
    impactAreas: ["Fraud", "Compliance", "Operations"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: ["Fraud monitoring"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Impact assessment objectives; strengthen user protection and confidence",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-TXN-001",
    domain: "Transaction Monitoring",
    title: "Monitor payment transactions for abnormal behavior",
    summary:
      "Transaction monitoring should consider normal user behavior, contextual factors and fraud indicators to support SCA and fraud detection.",
    expectedEvidence: [
      "transaction monitoring rules",
      "behavioral and environmental risk indicators",
      "alert thresholds and review procedure",
      "false positive and drift review evidence"
    ],
    impactAreas: ["Fraud", "Data", "Operations", "Security"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: ["Fraud monitoring", "Strong customer authentication"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Operational and security risks and authentication; transaction monitoring mechanisms",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-WARN-001",
    domain: "Customer Warning Flows",
    title: "Warn customers when suspected payment fraud is detected",
    summary:
      "Customers should receive clear risk-specific warnings when fraud signals or beneficiary mismatch risks arise before execution.",
    expectedEvidence: [
      "customer warning flow",
      "scam and impersonation warning copy",
      "trigger conditions",
      "audit trail of warnings shown"
    ],
    impactAreas: ["Product", "Fraud", "Customer Support"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Instant credit transfers", "Fraud monitoring"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Preferred options; fraud education and customer protection measures",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-APPFRAUD-001",
    domain: "Authorised Push Payment Fraud",
    title: "Define impersonation and APP fraud liability handling",
    summary:
      "Providers should evidence how they handle cases where a consumer was manipulated into authorising a payment by impersonation or deception.",
    expectedEvidence: [
      "APP fraud intake procedure",
      "impersonation scenario decision tree",
      "liability assessment checklist",
      "customer outcome and reimbursement templates"
    ],
    impactAreas: ["Compliance", "Fraud", "Customer Support", "Legal"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Instant credit transfers", "Wallet transfers", "Multi-currency transfers"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Liability provisions for manipulated authorised payment transactions",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-LIAB-001",
    domain: "Liability and Reimbursement",
    title: "Define customer reimbursement and liability handling",
    summary:
      "Providers should evidence refund, refusal, justification and escalation processes for unauthorised or incorrectly executed payment transactions.",
    expectedEvidence: [
      "reimbursement workflow",
      "liability decision criteria",
      "customer communication template",
      "appeal or dispute escalation path"
    ],
    impactAreas: ["Compliance", "Operations", "Customer Support", "Legal"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Instant credit transfers", "Card payments", "Wallet transfers"],
    sourceInstrument: "PSR proposal",
    sourceReference: "PSP liability for unauthorised transactions and refund refusal justification",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-TRANS-001",
    domain: "Customer Transparency",
    title: "Communicate payment risks, fees and outcomes clearly",
    summary:
      "Customer-facing communication should explain payment execution status, charges, delays, dispute options and fraud risk signals.",
    expectedEvidence: [
      "customer communication templates",
      "payment status and receipt copy",
      "fee and currency conversion disclosure",
      "support escalation messaging"
    ],
    impactAreas: ["Product", "Customer Support", "Compliance"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: ["Multi-currency transfers", "Card payments", "Merchant acquiring"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Transparency of conditions and information requirements",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-INC-001",
    domain: "Incident / Fraud Escalation",
    title: "Escalate fraud incidents with ownership and timelines",
    summary:
      "Fraud incidents should have clear triage, ownership, escalation timelines, post-incident reviews and evidence capture.",
    expectedEvidence: [
      "fraud incident escalation policy",
      "triage severity model",
      "owner and SLA matrix",
      "post-incident review template"
    ],
    impactAreas: ["Fraud", "Operations", "Compliance"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: ["Fraud monitoring"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Fraud prevention and information sharing measures",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-SCA-001",
    domain: "Strong Customer Authentication",
    title: "Apply SCA to high-risk payment and account access events",
    summary:
      "Providers should evidence how SCA is applied to payment initiation, account access, mandates and sensitive actions.",
    expectedEvidence: [
      "SCA policy",
      "MFA, possession, inherence or knowledge flow",
      "step-up triggers",
      "authentication audit events"
    ],
    impactAreas: ["Product", "Engineering", "Security", "Compliance"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider"
    ],
    serviceTriggers: ["Strong customer authentication", "Payment initiation"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Operational and security risks and authentication; SCA scope clarifications",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-SCA-002",
    domain: "SCA Fallback / Exemptions",
    title: "Define SCA fallback and exemption logic",
    summary:
      "Providers should document when exemptions apply, how failed authentication is handled, and who accepts residual risk.",
    expectedEvidence: [
      "SCA exemption policy",
      "fallback procedure",
      "risk acceptance criteria",
      "failed authentication handling"
    ],
    impactAreas: ["Product", "Engineering", "Risk", "Compliance"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider"
    ],
    serviceTriggers: ["Strong customer authentication"],
    sourceInstrument: "PSR proposal",
    sourceReference: "SCA exemptions, merchant initiated transactions and failed authentication handling",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-SCA-003",
    domain: "SCA Accessibility",
    title: "Provide accessible SCA methods for all customer groups",
    summary:
      "Providers should offer at least one SCA method usable by customers with disabilities, low digital skills, older users or no smartphone access.",
    expectedEvidence: [
      "accessible SCA option",
      "non-smartphone authentication path",
      "accessibility testing evidence",
      "customer support fallback process"
    ],
    impactAreas: ["Product", "Security", "Customer Support", "Compliance"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider"
    ],
    serviceTriggers: ["Strong customer authentication"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Accessibility of SCA for disabled, older and low-digital-skill customers",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-OB-001",
    domain: "Open Banking Dedicated Interface",
    title: "Maintain a reliable dedicated open banking interface",
    summary:
      "Account servicing PSPs should maintain a dedicated interface with performance, functionality and incident evidence for open banking providers.",
    expectedEvidence: [
      "dedicated interface documentation",
      "availability and latency metrics",
      "third-party access and onboarding procedure",
      "incident status and communication process"
    ],
    impactAreas: ["Engineering", "Platform", "Compliance"],
    priority: "High",
    relevantFor: ["Open Banking Provider", "Neobank", "Electronic Money Institution", "Payment Institution"],
    serviceTriggers: ["Open banking account access", "Payment initiation"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Open banking dedicated data access interface requirements",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-OB-002",
    domain: "User Permission Dashboard",
    title: "Provide a user dashboard for open banking permissions",
    summary:
      "Users should be able to view and withdraw open banking access permissions in a clear customer-facing dashboard.",
    expectedEvidence: [
      "permission dashboard",
      "active consent list",
      "revoke access action",
      "customer communication copy"
    ],
    impactAreas: ["Product", "Engineering", "Customer Support"],
    priority: "High",
    relevantFor: ["Open Banking Provider", "Neobank", "Electronic Money Institution", "Payment Institution"],
    serviceTriggers: ["Open banking account access", "Payment initiation"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Permissions dashboards for open banking users",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-OB-003",
    domain: "Open Banking Consent",
    title: "Capture and manage user consent lifecycle",
    summary:
      "Open banking services should evidence explicit consent capture, scope, duration, revocation and audit records.",
    expectedEvidence: [
      "consent endpoint documentation",
      "consent scope model",
      "consent expiry and renewal logic",
      "consent revocation audit records"
    ],
    impactAreas: ["Product", "Engineering", "Compliance"],
    priority: "High",
    relevantFor: ["Open Banking Provider", "Neobank", "Electronic Money Institution", "Payment Institution"],
    serviceTriggers: ["Open banking account access", "Payment initiation"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Open banking account information and payment initiation service changes",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-DATA-001",
    domain: "Data Protection / Fraud Data Sharing",
    title: "Govern fraud data sharing and special category processing",
    summary:
      "Providers should document fraud data sharing arrangements, DPIAs and GDPR governance where personal data is exchanged for fraud prevention.",
    expectedEvidence: [
      "fraud information sharing arrangement",
      "data protection impact assessment",
      "personal data minimisation controls",
      "supervisory authority consultation record where required"
    ],
    impactAreas: ["Legal", "Compliance", "Fraud", "Data"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: ["Fraud monitoring"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Data protection and voluntary fraud information sharing arrangements",
    sourceUrl: PSR_URL
  },
  {
    id: "PSD3-LIC-001",
    domain: "Licensing / Operational Readiness",
    title: "Evidence operational readiness for regulated services",
    summary:
      "Payment and e-money institutions should maintain evidence of governance, service scope, outsourcing and operational readiness.",
    expectedEvidence: [
      "operational readiness register",
      "regulated service scope",
      "outsourcing control inventory",
      "governance owner"
    ],
    impactAreas: ["Compliance", "Operations", "Leadership"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Open Banking Provider",
      "Neobank"
    ],
    serviceTriggers: ["Electronic money issuance", "Payment initiation", "Merchant acquiring"],
    sourceInstrument: "PSD3 proposal",
    sourceReference: "Authorisation, licensing and supervision of payment and e-money institutions",
    sourceUrl: PSD3_URL
  },
  {
    id: "PSD3-SAFE-001",
    domain: "Safeguarding / Customer Funds",
    title: "Safeguard payment and e-money customer funds",
    summary:
      "Institutions should evidence safeguarding arrangements, reconciliation, concentration risk controls and governance over customer funds.",
    expectedEvidence: [
      "safeguarding policy",
      "customer funds reconciliation evidence",
      "bank account diversification or concentration risk assessment",
      "board or compliance oversight record"
    ],
    impactAreas: ["Finance", "Compliance", "Operations", "Leadership"],
    priority: "High",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Wallet transfers", "Electronic money issuance"],
    sourceInstrument: "PSD3 proposal",
    sourceReference: "Payment and e-money institution supervision and safeguards",
    sourceUrl: PSD3_URL
  },
  {
    id: "PSR-CASH-001",
    domain: "Access to Cash",
    title: "Document cash withdrawal service disclosures where relevant",
    summary:
      "Where cash withdrawal services are supported, providers should evidence fees, conditions and customer information for ATM or merchant withdrawal journeys.",
    expectedEvidence: [
      "cash withdrawal flow",
      "ATM or merchant withdrawal fee disclosure",
      "customer receipt or statement evidence",
      "support handling for failed withdrawals"
    ],
    impactAreas: ["Product", "Compliance", "Customer Support"],
    priority: "Medium",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Cash withdrawal support"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Additional information requirements for domestic ATM withdrawals",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-INSTANT-001",
    domain: "Instant Payments",
    title: "Evidence instant payment reachability and beneficiary verification",
    summary:
      "Providers offering instant euro payments should evidence send/receive reachability, pricing controls and beneficiary verification readiness.",
    expectedEvidence: [
      "instant payment receive and send support evidence",
      "fee parity control",
      "beneficiary verification evidence",
      "operational monitoring for instant payments"
    ],
    impactAreas: ["Product", "Engineering", "Compliance", "Operations"],
    priority: "High",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: ["Instant credit transfers"],
    sourceInstrument: "Instant Payments Regulation",
    sourceReference: "Commission payment services timeline; instant payments phases in 2025 and 2027",
    sourceUrl: INSTANT_PAYMENTS_URL
  },
  {
    id: "PSR-AUDIT-001",
    domain: "Record Keeping / Audit Trail",
    title: "Keep audit evidence for payments, consent and fraud decisions",
    summary:
      "Providers should retain audit evidence for payment decisions, consent changes, warnings, escalations and reimbursement outcomes.",
    expectedEvidence: [
      "audit log schema",
      "retention policy",
      "decision history",
      "export or review workflow"
    ],
    impactAreas: ["Engineering", "Compliance", "Operations"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider"
    ],
    serviceTriggers: ["Fraud monitoring", "Open banking account access", "Payment initiation"],
    sourceInstrument: "PSR proposal",
    sourceReference: "Rights, obligations, liability, consent and fraud evidence requirements",
    sourceUrl: PSR_URL
  },
  {
    id: "PSR-LIMIT-001",
    domain: "Fraud Prevention / User Controls",
    title: "Offer spending limits and payment blocking measures",
    summary:
      "Payment service providers should evidence customer-facing spending limits and blocking controls that reduce payment fraud risk.",
    expectedEvidence: [
      "spending-limit configuration flow",
      "payment instrument or account blocking control",
      "risk-based trigger logic for limits and blocks",
      "audit evidence for customer changes and fraud blocks"
    ],
    impactAreas: ["Product", "Fraud", "Engineering", "Customer Support"],
    priority: "High",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; PSPs must offer spending limits and blocking measures",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-SUSPICIOUS-001",
    domain: "Fraud Prevention / Receiving PSP",
    title: "Freeze suspicious received transactions",
    summary:
      "Receiving PSPs should detect suspicious incoming transactions and freeze them where required by the fraud prevention framework.",
    expectedEvidence: [
      "incoming transaction suspicious-activity rules",
      "freeze or hold workflow for receiving PSP operations",
      "release/escalation approval procedure",
      "customer and counterparty communication templates"
    ],
    impactAreas: ["Fraud", "Operations", "Engineering", "Compliance"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; receiving PSP must freeze suspicious transactions",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-IMPERSONATION-001",
    domain: "Impersonation Fraud / Reimbursement",
    title: "Refund qualifying PSP impersonation fraud cases",
    summary:
      "Providers should define evidence, police-report, notification and reimbursement handling for cases where fraudsters impersonate PSP staff.",
    expectedEvidence: [
      "PSP impersonation fraud intake procedure",
      "police report and PSP notification evidence checklist",
      "full refund decision workflow",
      "customer outcome template and audit trail"
    ],
    impactAreas: ["Fraud", "Customer Support", "Compliance", "Legal"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; PSP impersonation fraud full refund where conditions are met",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-UNAUTH-001",
    domain: "Unauthorised Transactions",
    title: "Treat fraudster-initiated or altered transactions as unauthorised",
    summary:
      "Providers should handle cases where a fraudster initiates or changes a transaction as unauthorised transactions with full loss coverage where applicable.",
    expectedEvidence: [
      "fraudster-initiated transaction classification rules",
      "altered transaction investigation workflow",
      "full amount reimbursement decision criteria",
      "case evidence and customer notification templates"
    ],
    impactAreas: ["Fraud", "Customer Support", "Compliance", "Legal"],
    priority: "Critical",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank"],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; fraudster-initiated or changed transactions treated as unauthorised",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-HUMAN-001",
    domain: "Customer Support",
    title: "Provide human customer support for payment users",
    summary:
      "Payment service users should have access to human customer support and not be limited to chatbot-only support paths.",
    expectedEvidence: [
      "human support access channel",
      "support hours and escalation rules",
      "chatbot handoff procedure",
      "support accessibility and audit evidence"
    ],
    impactAreas: ["Customer Support", "Product", "Compliance"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Merchant acquiring",
      "Electronic money issuance",
      "Multi-currency transfers",
      "Cash withdrawal support"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; users must have access to human customer support",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-ADR-001",
    domain: "Dispute Resolution",
    title: "Participate in alternative dispute resolution when chosen by consumers",
    summary:
      "Providers should evidence participation in alternative dispute resolution procedures when a consumer chooses that path.",
    expectedEvidence: [
      "ADR procedure and competent body mapping",
      "consumer election and consent capture",
      "case handoff workflow",
      "outcome recording and customer communication templates"
    ],
    impactAreas: ["Compliance", "Customer Support", "Legal", "Operations"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Merchant acquiring",
      "Electronic money issuance",
      "Multi-currency transfers",
      "Cash withdrawal support"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; all PSPs participate in ADR procedures if the consumer chooses it",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-FEE-001",
    domain: "Customer Transparency",
    title: "Disclose all charges before payment initiation",
    summary:
      "Customers should receive pre-initiation information on all payment charges, including currency conversion and fixed fees.",
    expectedEvidence: [
      "pre-payment fee disclosure screen",
      "currency conversion charge calculation",
      "fixed fee disclosure by channel",
      "receipt and audit evidence of displayed charges"
    ],
    impactAreas: ["Product", "Compliance", "Customer Support"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Merchant acquiring",
      "Multi-currency transfers",
      "Cash withdrawal support"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; customers informed about all charges before payment initiation",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-CASH-002",
    domain: "Access to Cash",
    title: "Support retail cash withdrawals without purchase where offered",
    summary:
      "Retail cash withdrawal services should evidence no-purchase withdrawal conditions, limits, disclosures and operational handling.",
    expectedEvidence: [
      "retail cash withdrawal flow without purchase",
      "minimum and maximum withdrawal rule handling",
      "merchant or retailer operational procedure",
      "customer fee and failure disclosure"
    ],
    impactAreas: ["Product", "Operations", "Compliance"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Retail Cash Provider"
    ],
    serviceTriggers: ["Cash withdrawal support"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSD3 text summary; retail cash withdrawals without purchase to improve cash access",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-ATM-001",
    domain: "Access to Cash / Transparency",
    title: "Display ATM fees and exchange rates before withdrawal",
    summary:
      "ATM and cash withdrawal journeys should display all fees and exchange rates before the transaction is confirmed.",
    expectedEvidence: [
      "ATM fee pre-disclosure screen",
      "exchange-rate display logic",
      "customer acknowledgement or cancellation path",
      "cash withdrawal receipt evidence"
    ],
    impactAreas: ["Product", "Compliance", "Operations"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Independent ATM Deployer"
    ],
    serviceTriggers: ["Cash withdrawal support", "Multi-currency transfers"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Council mandate summary; ATM transactions show fees and exchange rates before execution",
    sourceUrl: EP_PSR_TRAIN_URL
  },
  {
    id: "PSR-OB-004",
    domain: "Open Banking Data Access",
    title: "Remove prohibited obstacles to open banking data access",
    summary:
      "Account-servicing providers should evidence that authorised open banking providers can access payment account data without discriminatory obstacles.",
    expectedEvidence: [
      "open banking obstacle assessment",
      "third-party provider access test evidence",
      "non-discrimination controls for ASPSP interfaces",
      "incident and denial reason logs"
    ],
    impactAreas: ["Platform", "Engineering", "Compliance", "Open Banking"],
    priority: "High",
    relevantFor: [
      "Open Banking Provider",
      "Neobank",
      "Electronic Money Institution",
      "Payment Institution"
    ],
    serviceTriggers: ["Open banking account access", "Payment initiation"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed text summary; prohibited obstacles to authorised open banking data access",
    sourceUrl: EP_PSD3_TRAIN_URL
  },
  {
    id: "PSD3-ACCOUNT-001",
    domain: "Access to Payment Accounts",
    title: "Provide payment institutions with non-discriminatory payment account access",
    summary:
      "Banks and account providers should evidence non-discriminatory access to payment accounts for payment institutions.",
    expectedEvidence: [
      "payment institution account access policy",
      "objective onboarding and refusal criteria",
      "account access SLA and escalation process",
      "refusal or restriction audit trail"
    ],
    impactAreas: ["Compliance", "Banking Operations", "Legal", "Partnerships"],
    priority: "High",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Neobank"],
    serviceTriggers: ["Payment account provision to payment institutions"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSD3 text summary; banks provide payment institutions with account access on a non-discriminatory basis",
    sourceUrl: EP_PSD3_TRAIN_URL
  },
  {
    id: "PSR-MOBILE-001",
    domain: "Mobile / Front-End Access",
    title: "Ensure FRAND access to mobile device and electronic service capabilities",
    summary:
      "Front-end service providers should evidence fair, reasonable and non-discriminatory access to store and transfer payment data where mobile or electronic service capabilities are needed.",
    expectedEvidence: [
      "mobile device or electronic service dependency map",
      "FRAND access assessment",
      "front-end payment data storage and transfer controls",
      "vendor restriction escalation evidence"
    ],
    impactAreas: ["Product", "Engineering", "Legal", "Partnerships"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Technical Service Provider"
    ],
    serviceTriggers: [
      "Mobile wallet front-end services",
      "Wallet transfers",
      "Card payments",
      "Payment initiation"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed text summary; device and electronic service providers allow front-end payment data storage and transfer on FRAND terms",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSD3-AUTH-001",
    domain: "Authorisation / Prudential Requirements",
    title: "Maintain PSD3 authorisation and prudential application evidence",
    summary:
      "Payment institutions should evidence authorisation, capital, own-funds calculations, budget forecasts and timelines aligned to the services provided.",
    expectedEvidence: [
      "authorisation application pack",
      "initial capital and own-funds calculation",
      "budget forecast and business plan",
      "service-by-service risk and control mapping"
    ],
    impactAreas: ["Compliance", "Finance", "Leadership", "Legal"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Open Banking Provider",
      "Neobank",
      "Crypto-asset Service Provider"
    ],
    serviceTriggers: [
      "Electronic money issuance",
      "Payment initiation",
      "Merchant acquiring",
      "Open banking account access"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSD3 text summary; authorisation subject to prudential and capital requirements, own-funds calculations, budget forecasts and harmonised timelines",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSD3-TRANSITION-001",
    domain: "Licensing / Transitional Measures",
    title: "Plan re-authorisation for existing PSD2 and e-money activities",
    summary:
      "Existing payment and e-money institutions should track transitional deadlines and evidence timely application under the new PSD3 framework.",
    expectedEvidence: [
      "existing licence inventory",
      "PSD3 re-authorisation timeline",
      "gap assessment against new application requirements",
      "board or compliance approval record"
    ],
    impactAreas: ["Compliance", "Legal", "Leadership"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Open Banking Provider",
      "Neobank"
    ],
    serviceTriggers: [
      "Electronic money issuance",
      "Payment initiation",
      "Merchant acquiring",
      "Open banking account access"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSD3 text summary; existing licences remain valid only through transitional measures and timely application",
    sourceUrl: EP_PSD3_TRAIN_URL
  },
  {
    id: "PSD3-PASSPORT-001",
    domain: "Cross-Border Services",
    title: "Evidence right-of-establishment and freedom-to-provide-services notifications",
    summary:
      "Providers operating across Member States should maintain passporting, branch, agent and freedom-to-provide-services evidence.",
    expectedEvidence: [
      "host Member State services inventory",
      "right of establishment or freedom to provide services notification",
      "branch or agent register evidence",
      "competent-authority correspondence"
    ],
    impactAreas: ["Compliance", "Legal", "Operations"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Open Banking Provider",
      "Neobank",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Merchant acquiring",
      "Electronic money issuance",
      "Multi-currency transfers"
    ],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "PSD3 negotiation scope; application to exercise right of establishment and freedom to provide services",
    sourceUrl: EP_PSD3_TRAIN_URL
  },
  {
    id: "PSR-PLATFORM-001",
    domain: "Online Platform Fraud",
    title: "Escalate fraudulent content to online platforms and recover platform-liability evidence",
    summary:
      "Where fraudulent payment content originates on online platforms, providers should evidence notification, takedown follow-up and reimbursement recovery records.",
    expectedEvidence: [
      "fraudulent content notification procedure",
      "platform takedown evidence",
      "customer reimbursement and platform recovery workflow",
      "DSA-linked escalation records"
    ],
    impactAreas: ["Fraud", "Legal", "Operations", "Customer Support"],
    priority: "Medium",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank", "Online Platform"],
    serviceTriggers: ["Fraud monitoring", "Online platform fraud-content handling"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; online platforms liable to PSPs if informed fraudulent content is not removed",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-ADS-001",
    domain: "Financial Services Advertising",
    title: "Verify authorisation evidence for financial services advertising",
    summary:
      "Financial services advertisers should evidence legal authorisation or exemption when advertising through very large online platforms or search engines.",
    expectedEvidence: [
      "advertiser authorisation or exemption evidence",
      "country-by-country advertising approval record",
      "platform submission proof",
      "marketing and legal review workflow"
    ],
    impactAreas: ["Marketing", "Legal", "Compliance"],
    priority: "Medium",
    relevantFor: ["Payment Institution", "Electronic Money Institution", "Wallet", "Neobank", "Online Platform"],
    serviceTriggers: ["Financial services advertising"],
    sourceInstrument: "PSD3/PSR provisional agreement",
    sourceReference: "Agreed PSR text summary; financial services advertisers prove legal authorisation or exemption to very large online platforms and search engines",
    sourceUrl: EP_AGREEMENT_URL
  },
  {
    id: "PSR-EDU-001",
    domain: "Fraud Education",
    title: "Provide fraud education and awareness content",
    summary:
      "Providers should evidence customer education and awareness measures that help users avoid payment fraud and impersonation scams.",
    expectedEvidence: [
      "fraud education content",
      "customer campaign or in-product awareness flow",
      "impersonation scam guidance",
      "content review and effectiveness evidence"
    ],
    impactAreas: ["Fraud", "Customer Support", "Product", "Compliance"],
    priority: "Medium",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "EBA fraud opinion",
    sourceReference: "EBA opinion and agreed PSR text summary; social engineering fraud requires additional mitigants and user education",
    sourceUrl: EBA_FRAUD_OPINION_URL
  },
  {
    id: "PSR-FRAUD-REPORT-001",
    domain: "Fraud Reporting",
    title: "Report fraud data and monitor fraud trends by payment instrument",
    summary:
      "Providers should retain fraud statistics and reporting evidence by payment instrument to support competent authority reporting and supervisory monitoring.",
    expectedEvidence: [
      "fraud reporting data model",
      "payment instrument fraud taxonomy",
      "semi-annual reporting workflow",
      "management review of fraud trends and mitigants"
    ],
    impactAreas: ["Fraud", "Data", "Compliance", "Operations"],
    priority: "High",
    relevantFor: [
      "Payment Institution",
      "Electronic Money Institution",
      "Wallet",
      "Neobank",
      "Open Banking Provider",
      "Payment Orchestrator"
    ],
    serviceTriggers: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Merchant acquiring",
      "Electronic money issuance",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    sourceInstrument: "EBA-ECB fraud report",
    sourceReference: "EBA-ECB fraud report; PSP fraud data reporting supports supervisory monitoring under PSD2 and related reporting frameworks",
    sourceUrl: EBA_ECB_FRAUD_REPORT_URL
  }
];
