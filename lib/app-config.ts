export const PRODUCT_CONFIG = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Complee",
  shortName: process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME ?? "Complee",
  tagline: "AI compliance workspace for fintech expansion",
  csvPrefix: "complee-readiness"
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
  },
  {
    label: "European Parliament 27 Nov 2025 provisional PSD3/PSR agreement",
    url: "https://www.europarl.europa.eu/news/en/press-room/20251121IPR31540/"
  },
  {
    label: "European Parliament legislative train - Payment Services Regulation",
    url: "https://www.europarl.europa.eu/legislative-train/theme-an-economy-that-works-for-people/file-revision-of-eu-rules-on-payment-services"
  },
  {
    label: "European Parliament legislative train - PSD3",
    url: "https://www.europarl.europa.eu/legislative-train/theme-economic-and-monetary-affairs-econ/file-payment-services-and-electronic-money-services-%28directive%29"
  },
  {
    label: "EBA opinion on new types of payment fraud",
    url: "https://www.eba.europa.eu/publications-and-media/press-releases/eba-has-identified-new-types-payment-fraud-and-proposes-measures-mitigate-underlying-risks-and"
  },
  {
    label: "EBA-ECB 2025 payment fraud report",
    url: "https://www.eba.europa.eu/publications-and-media/press-releases/joint-eba-ecb-report-payment-fraud-strong-authentication-remains-effective-fraudsters-are-adapting"
  },
  {
    label: "FCA payment and e-money safeguarding regime",
    url: "https://www.fca.org.uk/publications/policy-statements/ps25-12-changes-safeguarding-regime-payments-and-e-money-firms"
  },
  {
    label: "BaFin payment services authorisation",
    url: "https://www.bafin.de/EN/Aufsicht/ZahlungsdienstePSD2/ZulassungsverfahrenundLaufendeAufsicht/ZulassungsverfahrenundLaufendeAufsicht_node_en.html"
  },
  {
    label: "ACPR authorisation portal",
    url: "https://acpr.banque-france.fr/en"
  },
  {
    label: "DNB supervision portal",
    url: "https://www.dnb.nl/en"
  },
  {
    label: "Banco de Espana supervision portal",
    url: "https://www.bde.es/wbe/en"
  }
] as const;
