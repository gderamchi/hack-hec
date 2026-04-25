import type { Requirement } from "@/lib/types";

const PSR_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0367";
const PSD3_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52023PC0366";
const INSTANT_PAYMENTS_URL =
  "https://finance.ec.europa.eu/consumer-finance-and-payments/payment-services/payment-services_en";

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
  }
];
