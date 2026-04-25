export const PRODUCT_CONFIG = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "CompliancePilot",
  shortName: process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME ?? "CompliancePilot",
  tagline: "PSD3/PSR readiness workspace",
  csvPrefix: "compliancepilot-psd3"
} as const;

export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const DEFAULT_OPENAI_REASONING_EFFORT = "none";

export const REGULATORY_SOURCE_SUMMARY = [
  {
    label: "European Commission payment services timeline",
    url: "https://finance.ec.europa.eu/consumer-finance-and-payments/payment-services/payment-services_en"
  },
  {
    label: "COM(2023) 367 final - proposed Payment Services Regulation",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52023PC0367"
  },
  {
    label: "COM(2023) 366 final - proposed Payment Services Directive 3",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52023PC0366"
  }
] as const;
