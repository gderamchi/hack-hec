import type {
  CompanyProfile,
  CompanyType,
  ServiceFlow,
  UploadedDocument
} from "@/lib/types";
import { isCrossBorderProfile } from "@/lib/complee-requirement-mapper";

export type RequiredDocument = {
  id: string;
  title: string;
  description: string;
  appliesToServices?: ServiceFlow[];
  appliesToCompanyTypes?: CompanyType[];
  requirementIds: string[];
  keywords: string[];
};

export type RequiredDocumentStatus = RequiredDocument & {
  satisfiedBy: string[];
};

export type RequiredDocumentCheck = {
  required: RequiredDocumentStatus[];
  missing: RequiredDocumentStatus[];
};

const PAYMENT_SERVICES: ServiceFlow[] = [
  "Instant credit transfers",
  "Wallet transfers",
  "Card payments",
  "Open banking account access",
  "Payment initiation",
  "Merchant acquiring",
  "Electronic money issuance",
  "Multi-currency transfers",
  "Cash withdrawal support"
];

export const REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "regulatory-authorisation-scope",
    title: "Regulatory authorisation and service-scope pack",
    description:
      "Authorisation, licence scope, prudential capital, own-funds, budget forecast, outsourcing and cross-border service evidence.",
    appliesToCompanyTypes: [
      "Payment Institution",
      "Electronic Money Institution",
      "Open Banking Provider",
      "Neobank",
      "Crypto-asset Service Provider"
    ],
    requirementIds: [
      "PSD3-LIC-001",
      "PSD3-AUTH-001",
      "PSD3-TRANSITION-001",
      "PSD3-PASSPORT-001"
    ],
    keywords: [
      "authorisation",
      "authorization",
      "licence",
      "license",
      "regulated service scope",
      "own-funds",
      "own funds",
      "initial capital",
      "budget forecast",
      "passporting",
      "freedom to provide services",
      "right of establishment",
      "outsourcing"
    ]
  },
  {
    id: "customer-terms-fees-transparency",
    title: "Customer terms, charges and transparency pack",
    description:
      "Pre-initiation charges, fees, FX conversion, payment status, receipts, customer notices and dispute options.",
    appliesToServices: PAYMENT_SERVICES,
    requirementIds: ["PSR-TRANS-001", "PSR-FEE-001", "PSR-ADR-001"],
    keywords: [
      "terms",
      "fee",
      "fees",
      "charges",
      "currency conversion",
      "exchange rate",
      "payment status",
      "receipt",
      "dispute",
      "alternative dispute resolution",
      "adr"
    ]
  },
  {
    id: "support-refund-complaints",
    title: "Support, refund, complaint and ADR procedure",
    description:
      "Human support access, refund/reimbursement decisions, complaint handling, ADR handoff and customer communication templates.",
    appliesToServices: PAYMENT_SERVICES,
    requirementIds: [
      "PSR-LIAB-001",
      "PSR-HUMAN-001",
      "PSR-ADR-001",
      "PSR-IMPERSONATION-001",
      "PSR-UNAUTH-001"
    ],
    keywords: [
      "support",
      "human support",
      "complaint",
      "refund",
      "reimbursement",
      "liability",
      "customer outcome",
      "alternative dispute resolution",
      "adr",
      "impersonation"
    ]
  },
  {
    id: "payment-execution-payee",
    title: "Payment execution and payee-verification specification",
    description:
      "Payment initiation/execution flow, payee name and unique identifier matching, mismatch refusal/warnings, limits and audit events.",
    appliesToServices: [
      "Instant credit transfers",
      "Wallet transfers",
      "Payment initiation",
      "Multi-currency transfers"
    ],
    requirementIds: [
      "PSR-PAYEE-001",
      "PSR-WARN-001",
      "PSR-LIMIT-001",
      "PSR-AUDIT-001",
      "PSR-INSTANT-001"
    ],
    keywords: [
      "payment initiation",
      "payment execution",
      "credit transfer",
      "beneficiary",
      "payee",
      "unique identifier",
      "iban",
      "confirmation of payee",
      "mismatch",
      "spending limit",
      "audit"
    ]
  },
  {
    id: "fraud-controls-monitoring",
    title: "Fraud controls, monitoring and reporting pack",
    description:
      "Fraud policy, transaction monitoring, risk scoring, scam warnings, suspicious transaction freeze, fraud reporting and customer education.",
    appliesToServices: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Merchant acquiring",
      "Electronic money issuance",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    requirementIds: [
      "PSR-FRAUD-001",
      "PSR-TXN-001",
      "PSR-WARN-001",
      "PSR-INC-001",
      "PSR-SUSPICIOUS-001",
      "PSR-FRAUD-REPORT-001",
      "PSR-EDU-001"
    ],
    keywords: [
      "fraud policy",
      "fraud monitoring",
      "transaction monitoring",
      "risk score",
      "scam warning",
      "suspicious transaction",
      "freeze",
      "fraud reporting",
      "fraud statistics",
      "customer education",
      "incident"
    ]
  },
  {
    id: "app-fraud-liability",
    title: "APP fraud, impersonation and unauthorised transaction playbook",
    description:
      "APP fraud intake, social engineering/impersonation decision tree, police-report conditions, reimbursement and liability workflow.",
    appliesToServices: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Payment initiation",
      "Multi-currency transfers",
      "Fraud monitoring"
    ],
    requirementIds: [
      "PSR-APPFRAUD-001",
      "PSR-IMPERSONATION-001",
      "PSR-UNAUTH-001",
      "PSR-LIAB-001"
    ],
    keywords: [
      "authorised push payment",
      "authorized push payment",
      "app fraud",
      "impersonation",
      "social engineering",
      "police report",
      "unauthorised transaction",
      "unauthorized transaction",
      "reimbursement",
      "liability"
    ]
  },
  {
    id: "sca-policy",
    title: "SCA, risk assessment, fallback and accessibility policy",
    description:
      "SCA coverage, risk assessment, exemptions, fallback, failed authentication and accessible non-smartphone paths.",
    appliesToServices: [
      "Instant credit transfers",
      "Wallet transfers",
      "Card payments",
      "Open banking account access",
      "Payment initiation",
      "Strong customer authentication"
    ],
    requirementIds: ["PSD3-SCA-001", "PSD3-SCA-002", "PSD3-SCA-003", "PSR-LIMIT-001"],
    keywords: [
      "strong customer authentication",
      "sca",
      "mfa",
      "2fa",
      "biometric",
      "one-time passcode",
      "risk assessment",
      "exemption",
      "fallback",
      "failed authentication",
      "accessibility",
      "non-smartphone"
    ]
  },
  {
    id: "open-banking-interface-consent",
    title: "Open banking interface, consent and permission-dashboard pack",
    description:
      "Dedicated interface docs, access performance, prohibited obstacles assessment, consent lifecycle and user permission dashboard.",
    appliesToServices: ["Open banking account access", "Payment initiation"],
    requirementIds: [
      "PSD3-OB-001",
      "PSD3-OB-002",
      "PSD3-OB-003",
      "PSR-OB-004"
    ],
    keywords: [
      "open banking",
      "dedicated interface",
      "consent",
      "permission dashboard",
      "revoke access",
      "third-party provider",
      "tpp",
      "aspsp",
      "prohibited obstacle",
      "data access"
    ]
  },
  {
    id: "safeguarding-customer-funds",
    title: "Safeguarding and customer-funds reconciliation pack",
    description:
      "Safeguarding policy, customer funds segregation, reconciliations, concentration risk and board/compliance oversight.",
    appliesToServices: ["Wallet transfers", "Electronic money issuance"],
    requirementIds: ["PSD3-SAFE-001", "PSD3-LIC-001"],
    keywords: [
      "safeguarding",
      "customer funds",
      "segregated account",
      "reconciliation",
      "concentration risk",
      "board oversight",
      "electronic money"
    ]
  },
  {
    id: "card-acquiring-scheme-fees",
    title: "Card, acquiring and scheme-fee transparency pack",
    description:
      "Card payment flow, merchant acquiring, scheme fees, chargeback/unauthorised handling and customer/merchant fee disclosures.",
    appliesToServices: ["Card payments", "Merchant acquiring"],
    requirementIds: ["PSR-FEE-001", "PSR-LIAB-001", "PSR-TRANS-001", "PSR-UNAUTH-001"],
    keywords: [
      "card payment",
      "merchant acquiring",
      "scheme fee",
      "interchange",
      "chargeback",
      "unauthorised",
      "unauthorized",
      "merchant fee",
      "card funding"
    ]
  },
  {
    id: "cash-withdrawal-atm",
    title: "Cash withdrawal and ATM disclosure pack",
    description:
      "ATM or retail cash withdrawal flow, no-purchase withdrawal conditions, fees, FX rates, receipt and support handling.",
    appliesToServices: ["Cash withdrawal support"],
    appliesToCompanyTypes: ["Retail Cash Provider", "Independent ATM Deployer"],
    requirementIds: ["PSR-CASH-001", "PSR-CASH-002", "PSR-ATM-001"],
    keywords: [
      "cash withdrawal",
      "atm",
      "retail cash",
      "without purchase",
      "withdrawal fee",
      "exchange rate",
      "receipt",
      "cash access"
    ]
  },
  {
    id: "fraud-data-sharing-dpia",
    title: "Fraud data sharing, DPIA and GDPR governance pack",
    description:
      "Fraud-data sharing arrangements, DPIA, data minimisation, access controls and supervisory-authority consultation where required.",
    appliesToServices: ["Fraud monitoring"],
    requirementIds: ["PSR-DATA-001", "PSR-FRAUD-REPORT-001"],
    keywords: [
      "data protection impact assessment",
      "dpia",
      "fraud data",
      "information sharing",
      "data minimisation",
      "gdpr",
      "retention",
      "supervisory authority"
    ]
  },
  {
    id: "mobile-frand-front-end",
    title: "Mobile front-end and FRAND access evidence",
    description:
      "Mobile-device or electronic-service dependency map, payment data storage/transfer controls and FRAND vendor escalation evidence.",
    appliesToServices: [
      "Mobile wallet front-end services",
      "Wallet transfers",
      "Card payments",
      "Payment initiation"
    ],
    appliesToCompanyTypes: ["Technical Service Provider"],
    requirementIds: ["PSR-MOBILE-001"],
    keywords: [
      "frand",
      "fair reasonable and non-discriminatory",
      "mobile device",
      "front-end service",
      "payment data storage",
      "payment data transfer",
      "wallet front-end"
    ]
  },
  {
    id: "payment-account-access",
    title: "Payment account access for payment institutions",
    description:
      "Non-discriminatory account access policy, objective refusal criteria, SLA and competent-authority escalation evidence.",
    appliesToServices: ["Payment account provision to payment institutions"],
    requirementIds: ["PSD3-ACCOUNT-001"],
    keywords: [
      "payment institution account",
      "payment account access",
      "non-discriminatory",
      "refusal criteria",
      "account access sla",
      "competent authority"
    ]
  },
  {
    id: "platform-financial-ads-fraud",
    title: "Platform fraud-content and financial-advertising evidence",
    description:
      "Fraudulent content notice/takedown workflow, platform recovery process and financial-services advertiser authorisation checks.",
    appliesToServices: [
      "Financial services advertising",
      "Online platform fraud-content handling"
    ],
    appliesToCompanyTypes: ["Online Platform"],
    requirementIds: ["PSR-PLATFORM-001", "PSR-ADS-001"],
    keywords: [
      "fraudulent content",
      "online platform",
      "takedown",
      "financial services advertising",
      "advertiser authorisation",
      "advertiser authorization",
      "platform submission",
      "digital services act"
    ]
  }
];

export const CROSS_BORDER_REQUIRED_DOCUMENTS: RequiredDocument[] = [
  {
    id: "cross-border-authorisation",
    title: "Home authorisation and target-market licence scope",
    description:
      "Existing licence, regulated services perimeter, passporting or authorisation route and target-country application checklist.",
    requirementIds: [
      "PSD3-PASSPORT-001",
      "COMPLEE-GB-CASS15-DAILY-RECON",
      "COMPLEE-DE-ZAG-AUTHORISATION",
      "COMPLEE-FR-ACPR-LICENCE",
      "COMPLEE-ES-BDE-REGISTER"
    ],
    keywords: [
      "authorisation",
      "authorization",
      "licence",
      "license",
      "passporting",
      "target market",
      "service scope",
      "application checklist",
      "competent authority",
      "registration"
    ]
  },
  {
    id: "cross-border-governance-controls",
    title: "Local governance, risk and conduct controls",
    description:
      "Country-specific governance, risk management, complaints, consumer outcomes and compliance ownership evidence.",
    requirementIds: [
      "COMPLEE-GB-CONSUMER-DUTY",
      "COMPLEE-DE-MARISK-RISK",
      "COMPLEE-NL-DNB-INTEGRITY"
    ],
    keywords: [
      "governance",
      "risk management",
      "consumer duty",
      "complaints",
      "customer outcome",
      "integrity screening",
      "internal control",
      "outsourcing",
      "board"
    ]
  },
  {
    id: "cross-border-fincrime-safeguarding",
    title: "Financial crime, safeguarding and operational evidence",
    description:
      "MLRO ownership, suspicious activity escalation, safeguarding reconciliations, incident records and operational dashboards.",
    requirementIds: [
      "COMPLEE-GB-MLRO-APPOINTMENT",
      "COMPLEE-GB-CASS15-DAILY-RECON",
      "PSD3-SAFE-001",
      "PSR-FRAUD-REPORT-001"
    ],
    keywords: [
      "mlro",
      "financial crime",
      "suspicious activity",
      "safeguarding",
      "reconciliation",
      "customer funds",
      "incident",
      "dashboard",
      "audit event"
    ]
  }
];

export function evaluateRequiredDocuments(
  companyProfile: CompanyProfile,
  documents: UploadedDocument[]
): RequiredDocumentCheck {
  const required = getRequiredDocuments(companyProfile).map((requirement) => ({
    ...requirement,
    satisfiedBy: documents
      .filter((document) => matchesRequiredDocument(requirement, document))
      .map((document) => document.name)
  }));

  return {
    required,
    missing: required.filter((requirement) => requirement.satisfiedBy.length === 0)
  };
}

export function getRequiredDocuments(companyProfile: CompanyProfile): RequiredDocument[] {
  const sourceDocuments = isCrossBorderProfile(companyProfile)
    ? [...CROSS_BORDER_REQUIRED_DOCUMENTS, ...REQUIRED_DOCUMENTS]
    : REQUIRED_DOCUMENTS;
  const required = sourceDocuments.filter((requirement) => {
    const modeOnlyRequirement =
      isCrossBorderProfile(companyProfile) &&
      CROSS_BORDER_REQUIRED_DOCUMENTS.some((item) => item.id === requirement.id);
    const companyTypeMatches =
      requirement.appliesToCompanyTypes?.includes(companyProfile.companyType) ?? false;
    const serviceMatches =
      requirement.appliesToServices?.some((service) =>
        companyProfile.services.includes(service)
      ) ?? false;

    return modeOnlyRequirement || companyTypeMatches || serviceMatches;
  });

  return Array.from(new Map(required.map((requirement) => [requirement.id, requirement])).values());
}

function matchesRequiredDocument(
  requirement: RequiredDocument,
  document: UploadedDocument
): boolean {
  const searchable = `${document.name}\n${document.type}\n${document.content}`.toLowerCase();
  return requirement.keywords.some((keyword) => searchable.includes(keyword.toLowerCase()));
}
