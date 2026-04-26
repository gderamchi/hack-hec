export type RegulatorCode = "FR" | "DE" | "NL" | "ES" | "GB";

export interface Regulator {
  code: RegulatorCode;
  country: string;
  flag: string;
  authority: string;
  authorityFull: string;
  website: string;
  licenceTypes: string[];
  minCapitalEMI: string;
  minCapitalPI: string;
  avgTimeToLicence: string;
  keyRegulations: string[];
  passporting: string;
}

export const REGULATORS: Regulator[] = [
  {
    code: "FR",
    country: "France",
    flag: "🇫🇷",
    authority: "ACPR",
    authorityFull: "Autorité de Contrôle Prudentiel et de Résolution",
    website: "https://acpr.banque-france.fr/en",
    licenceTypes: [
      "Authorised E-Money Institution",
      "Payment Institution",
      "Account Information Service Provider",
    ],
    minCapitalEMI: "€350,000",
    minCapitalPI: "€20,000 – €125,000",
    avgTimeToLicence: "9–15 months",
    keyRegulations: ["EMD2", "PSD2", "MLR transposition", "ACPR fit-and-proper guidelines"],
    passporting: "EU passport available",
  },
  {
    code: "DE",
    country: "Germany",
    flag: "🇩🇪",
    authority: "BaFin",
    authorityFull: "Bundesanstalt für Finanzdienstleistungsaufsicht",
    website: "https://www.bafin.de/EN",
    licenceTypes: [
      "E-Money Institution (ZAG §11)",
      "Payment Institution (ZAG §10)",
      "AIS Provider (ZAG §34)",
    ],
    minCapitalEMI: "€350,000",
    minCapitalPI: "€20,000 – €125,000",
    avgTimeToLicence: "12–18 months",
    keyRegulations: [
      "ZAG (Payment Services Supervision Act)",
      "KWG (Banking Act)",
      "MaRisk",
      "BAIT (IT requirements)",
    ],
    passporting: "EU passport available",
  },
  {
    code: "NL",
    country: "Netherlands",
    flag: "🇳🇱",
    authority: "DNB / AFM",
    authorityFull: "De Nederlandsche Bank and Autoriteit Financiële Markten",
    website: "https://www.dnb.nl/en",
    licenceTypes: ["Electronic Money Institution", "Payment Institution", "AIS Provider"],
    minCapitalEMI: "€350,000",
    minCapitalPI: "€20,000 – €125,000",
    avgTimeToLicence: "9–14 months",
    keyRegulations: ["Wft (Financial Supervision Act)", "Wwft (AML)", "DNB integrity rules"],
    passporting: "EU passport available",
  },
  {
    code: "ES",
    country: "Spain",
    flag: "🇪🇸",
    authority: "Banco de España",
    authorityFull: "Banco de España (with CNMV for securities)",
    website: "https://www.bde.es/wbe/en",
    licenceTypes: [
      "Entidad de Dinero Electrónico",
      "Entidad de Pago",
      "Proveedor de Información sobre Cuentas",
    ],
    minCapitalEMI: "€350,000",
    minCapitalPI: "€20,000 – €125,000",
    avgTimeToLicence: "10–16 months",
    keyRegulations: [
      "Ley 7/2020",
      "Ley 21/2011",
      "AML Law 10/2010",
      "Banco de España Circular 3/2019",
    ],
    passporting: "EU passport available",
  },
  {
    code: "GB",
    country: "United Kingdom",
    flag: "🇬🇧",
    authority: "FCA",
    authorityFull: "Financial Conduct Authority",
    website: "https://www.fca.org.uk",
    licenceTypes: [
      "Authorised E-Money Institution (AEMI)",
      "Authorised Payment Institution (API)",
      "Small EMI",
      "RAISP",
    ],
    minCapitalEMI: "£350,000",
    minCapitalPI: "£20,000 – £125,000",
    avgTimeToLicence: "6–18 months",
    keyRegulations: [
      "EMRs 2011",
      "PSRs 2017",
      "MLR 2017",
      "CASS 15 (from May 2026)",
      "Consumer Duty",
      "SM&CR",
    ],
    passporting: "No EU passport — Brexit. Separate licence required.",
  },
];

export const getRegulator = (code: RegulatorCode): Regulator =>
  REGULATORS.find((r) => r.code === code)!;

export const SERVICE_OPTIONS = [
  "Wallet accounts",
  "Card issuing",
  "Instant credit transfers",
  "Open banking AISP",
  "Open banking PISP",
  "Fraud monitoring",
  "Strong customer authentication",
  "Cross-border FX",
  "Lending",
] as const;

export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const CUSTOMER_BUCKETS = ["<10k", "10k–100k", "100k–1M", "1M+"] as const;
export type CustomerBucket = (typeof CUSTOMER_BUCKETS)[number];
