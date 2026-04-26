import type { RegulatorCode } from "./regulators";

export type Status = "Covered" | "Partial" | "Missing";
export type Priority = "Critical" | "High" | "Medium" | "Low";

export interface RequirementRow {
  requirement: string;
  source: string;
  status: Status;
  evidence: string;
  priority: Priority;
  confidence: number;
  /** detail panel data */
  whatsMissing: string;
  recommended: string;
  owner: "Compliance" | "Engineering" | "Product" | "Operations";
  effortDays: number;
  effortCost: string;
}

const GB: RequirementRow[] = [
  {
    requirement: "Strong customer authentication",
    source: "PSR 2017, Reg 100",
    status: "Covered",
    evidence: "SCA policy v3.2, sec. 4.1",
    priority: "Low",
    confidence: 94,
    whatsMissing: "Minor uplift recommended for biometric fallback flows.",
    recommended: "Annual review and align with FCA expectations on dynamic linking.",
    owner: "Compliance",
    effortDays: 4,
    effortCost: "£5k",
  },
  {
    requirement: "IBAN / name verification",
    source: "PSR Art. 83 (incoming PSD3)",
    status: "Missing",
    evidence: "No matching control found",
    priority: "Critical",
    confidence: 98,
    whatsMissing:
      "No confirmation-of-payee equivalent integration covering UK domestic payments.",
    recommended:
      "Integrate with Pay.UK CoP service and enforce mismatch warnings in payer journey.",
    owner: "Engineering",
    effortDays: 25,
    effortCost: "£35k",
  },
  {
    requirement: "Fraud reporting to authorities",
    source: "MLR 2017, Reg 86",
    status: "Partial",
    evidence: "Internal SOP exists, no external flow",
    priority: "High",
    confidence: 87,
    whatsMissing: "No external reporting pipeline to NCA / Action Fraud.",
    recommended: "Define SAR submission flow and assign MLRO ownership.",
    owner: "Compliance",
    effortDays: 10,
    effortCost: "£12k",
  },
  {
    requirement: "CASS 15 daily safeguarding reconciliation",
    source: "FCA PS25/12 (May 2026)",
    status: "Missing",
    evidence: "Not addressed in current docs",
    priority: "Critical",
    confidence: 95,
    whatsMissing: "No daily internal/external reconciliation framework documented.",
    recommended: "Draft CASS 15 reconciliation policy and supporting controls.",
    owner: "Compliance",
    effortDays: 15,
    effortCost: "£18k",
  },
  {
    requirement: "Consumer Duty board attestation",
    source: "FCA PRIN 2A",
    status: "Missing",
    evidence: "No equivalent in EU framework",
    priority: "High",
    confidence: 92,
    whatsMissing: "No annual board attestation or outcomes monitoring.",
    recommended: "Establish Consumer Duty champion, MI pack, and board attestation cycle.",
    owner: "Compliance",
    effortDays: 20,
    effortCost: "£24k",
  },
  {
    requirement: "Open banking permission dashboard",
    source: "PSRs Art. 36",
    status: "Missing",
    evidence: "Not in current API docs",
    priority: "High",
    confidence: 92,
    whatsMissing: "No customer-facing TPP permission dashboard.",
    recommended: "Build permission dashboard with revoke and audit trail.",
    owner: "Engineering",
    effortDays: 40,
    effortCost: "£55k",
  },
  {
    requirement: "Safeguarding diversification",
    source: "EMRs Reg 21, CASS 15.5",
    status: "Partial",
    evidence: "Single safeguarding bank — risk flag",
    priority: "Medium",
    confidence: 89,
    whatsMissing: "Concentration risk on a single safeguarding institution.",
    recommended: "Onboard a secondary safeguarding bank and update policy.",
    owner: "Operations",
    effortDays: 20,
    effortCost: "£10k",
  },
  {
    requirement: "MLRO appointment",
    source: "MLR 2017 Reg 21",
    status: "Covered",
    evidence: "Existing AML framework adapts",
    priority: "Low",
    confidence: 91,
    whatsMissing: "MLRO must be UK-resident with FCA approval.",
    recommended: "File SUP 10C application for UK MLRO once hired.",
    owner: "Operations",
    effortDays: 5,
    effortCost: "£3k",
  },
  {
    requirement: "Operational resilience",
    source: "FCA PS21/3",
    status: "Partial",
    evidence: "BCP exists, impact tolerances missing",
    priority: "Medium",
    confidence: 88,
    whatsMissing: "No defined impact tolerances per important business service.",
    recommended: "Map important business services and set impact tolerances.",
    owner: "Operations",
    effortDays: 18,
    effortCost: "£14k",
  },
  {
    requirement: "FOS complaints jurisdiction",
    source: "DISP 2.3",
    status: "Missing",
    evidence: "EU complaints flow only",
    priority: "High",
    confidence: 90,
    whatsMissing: "No FOS-aligned complaints handling and reporting.",
    recommended: "Set up FOS complaints flow, T&Cs disclosure, and DISP MI.",
    owner: "Compliance",
    effortDays: 8,
    effortCost: "£9k",
  },
];

const FR: RequirementRow[] = [
  { requirement: "Authorisation dossier (Programme of operations)", source: "Code monétaire et financier Art. L.526-7", status: "Partial", evidence: "Programme drafted, missing French translation", priority: "High", confidence: 91, whatsMissing: "ACPR requires French-language submission with FR org chart.", recommended: "Translate dossier and adapt governance section.", owner: "Compliance", effortDays: 12, effortCost: "€14k" },
  { requirement: "LCB-FT (AML) framework", source: "CMF Art. L.561-1 et seq.", status: "Covered", evidence: "AML policy v2.4 mapped to LCB-FT", priority: "Low", confidence: 93, whatsMissing: "Minor adaptation to TRACFIN reporting flows.", recommended: "Configure TRACFIN ERMES connector.", owner: "Compliance", effortDays: 6, effortCost: "€7k" },
  { requirement: "Fit-and-proper assessment of dirigeants", source: "ACPR Instruction 2014-I-01", status: "Missing", evidence: "No FR-style dirigeant pack", priority: "Critical", confidence: 96, whatsMissing: "Need formal fit-and-proper dossier for two dirigeants effectifs.", recommended: "Prepare dirigeant questionnaires and CVs in ACPR format.", owner: "Compliance", effortDays: 10, effortCost: "€12k" },
  { requirement: "Cantonnement (safeguarding) account", source: "CMF Art. L.522-17", status: "Missing", evidence: "No FR safeguarding bank", priority: "Critical", confidence: 95, whatsMissing: "Safeguarding must sit at a French credit institution.", recommended: "Open cantonnement account and document segregation.", owner: "Operations", effortDays: 25, effortCost: "€18k" },
  { requirement: "DSP2 strong authentication", source: "RTS 2018/389", status: "Covered", evidence: "SCA aligned to RTS", priority: "Low", confidence: 94, whatsMissing: "Confirm exemption logic for low-value contactless.", recommended: "Document exemption thresholds in policy.", owner: "Engineering", effortDays: 4, effortCost: "€5k" },
  { requirement: "Reporting COREP / FINREP allégé", source: "ACPR notice 2017-R-02", status: "Partial", evidence: "Only home regulator templates", priority: "High", confidence: 88, whatsMissing: "No XBRL submission pipeline to ACPR ONEGATE.", recommended: "Set up ONEGATE submission and templates.", owner: "Engineering", effortDays: 22, effortCost: "€28k" },
  { requirement: "RGPD / data residency", source: "RGPD + CNIL guidance", status: "Partial", evidence: "GDPR baseline only", priority: "Medium", confidence: 87, whatsMissing: "Need CNIL-aligned DPIA and FR DPO contact.", recommended: "Appoint FR DPO and refresh DPIA.", owner: "Compliance", effortDays: 8, effortCost: "€9k" },
  { requirement: "Plan de continuité d'activité", source: "Arrêté du 3 nov. 2014", status: "Partial", evidence: "BCP exists, no FR scenarios", priority: "Medium", confidence: 86, whatsMissing: "Scenarios specific to FR market and SEPA settlement.", recommended: "Add FR-specific BCP scenarios and tests.", owner: "Operations", effortDays: 10, effortCost: "€8k" },
  { requirement: "Externalisation critique notification", source: "Arrêté 3 nov. 2014 Art. 231", status: "Missing", evidence: "No outsourcing register submitted", priority: "High", confidence: 90, whatsMissing: "Critical outsourcing register not notified to ACPR.", recommended: "Compile outsourcing register and notify ACPR.", owner: "Compliance", effortDays: 7, effortCost: "€8k" },
  { requirement: "Médiateur de la consommation", source: "Code de la consommation L.612-1", status: "Missing", evidence: "No FR ombudsman in place", priority: "Medium", confidence: 89, whatsMissing: "Mandatory consumer mediator referral missing.", recommended: "Sign up to an approved médiateur and disclose in T&Cs.", owner: "Operations", effortDays: 5, effortCost: "€4k" },
];

const DE: RequirementRow[] = [
  { requirement: "Erlaubnisantrag E-Geld-Institut", source: "ZAG §11", status: "Partial", evidence: "Application drafted in EN", priority: "High", confidence: 90, whatsMissing: "BaFin requires DE-language submission and tied custody arrangements.", recommended: "Translate and adapt application; engage German legal counsel.", owner: "Compliance", effortDays: 18, effortCost: "€22k" },
  { requirement: "Geschäftsleiter fit & proper", source: "ZAG §13, KWG §25c", status: "Missing", evidence: "No DE-style Geschäftsleiter dossier", priority: "Critical", confidence: 96, whatsMissing: "Two Geschäftsleiter required with DE-language CVs and police records.", recommended: "Hire/assign two qualified Geschäftsleiter and prepare BaFin packs.", owner: "Operations", effortDays: 45, effortCost: "€60k" },
  { requirement: "MaRisk governance", source: "BaFin Rundschreiben 05/2023 (MaRisk)", status: "Missing", evidence: "Not mapped", priority: "Critical", confidence: 95, whatsMissing: "Risk management framework not aligned to MaRisk modules.", recommended: "Map ICAAP-lite and risk inventory to MaRisk AT/BT structure.", owner: "Compliance", effortDays: 25, effortCost: "€30k" },
  { requirement: "BAIT IT requirements", source: "BaFin BAIT Rundschreiben 10/2017", status: "Partial", evidence: "ISO 27001 controls", priority: "High", confidence: 88, whatsMissing: "BAIT-specific IT governance and outsourcing controls.", recommended: "Run BAIT gap-assessment and remediate.", owner: "Engineering", effortDays: 30, effortCost: "€38k" },
  { requirement: "GwG (AML) compliance", source: "Geldwäschegesetz §4 ff.", status: "Covered", evidence: "AML aligned to AMLD5/6", priority: "Low", confidence: 92, whatsMissing: "Minor uplift to FIU goAML reporting.", recommended: "Configure goAML connector.", owner: "Compliance", effortDays: 6, effortCost: "€7k" },
  { requirement: "Sicherungsanforderungen (safeguarding)", source: "ZAG §17", status: "Missing", evidence: "No DE safeguarding bank", priority: "Critical", confidence: 95, whatsMissing: "Customer funds must be safeguarded at a German credit institution.", recommended: "Open DE safeguarding account and update policy.", owner: "Operations", effortDays: 25, effortCost: "€18k" },
  { requirement: "Auslagerungsregister", source: "ZAG §26, MaRisk AT 9", status: "Missing", evidence: "No outsourcing register notified", priority: "High", confidence: 90, whatsMissing: "Critical outsourcing not notified to BaFin.", recommended: "Maintain Auslagerungsregister and notify BaFin per AT 9.", owner: "Compliance", effortDays: 8, effortCost: "€9k" },
  { requirement: "Beschwerdemanagement", source: "BaFin MaComp", status: "Partial", evidence: "EU complaints flow only", priority: "Medium", confidence: 87, whatsMissing: "No DE-language complaints handling and Ombudsstelle referral.", recommended: "Set up DE complaints flow with Ombudsmann der privaten Banken.", owner: "Operations", effortDays: 7, effortCost: "€6k" },
  { requirement: "Notfallkonzept (BCP)", source: "MaRisk AT 7.3", status: "Partial", evidence: "Group BCP exists", priority: "Medium", confidence: 86, whatsMissing: "DE-specific scenarios and recovery testing missing.", recommended: "Localise BCP and run annual test.", owner: "Operations", effortDays: 10, effortCost: "€8k" },
  { requirement: "Reporting an Bundesbank/BaFin", source: "ZAG §22", status: "Missing", evidence: "No DE submission pipeline", priority: "High", confidence: 91, whatsMissing: "No Bundesbank ExtraNet templates configured.", recommended: "Set up ExtraNet reporting and templates.", owner: "Engineering", effortDays: 20, effortCost: "€26k" },
];

const NL: RequirementRow[] = [
  { requirement: "Vergunningaanvraag EGI", source: "Wft Art. 2:54a", status: "Partial", evidence: "Application in EN", priority: "High", confidence: 90, whatsMissing: "DNB expects Dutch summary and local governance.", recommended: "Adapt application with NL governance section.", owner: "Compliance", effortDays: 14, effortCost: "€16k" },
  { requirement: "Geschiktheid en betrouwbaarheid", source: "Wft Art. 3:8 / 3:9", status: "Missing", evidence: "No NL-style fit-and-proper", priority: "Critical", confidence: 95, whatsMissing: "DNB fit-and-proper interviews required for board.", recommended: "Prepare board members for DNB interviews.", owner: "Operations", effortDays: 20, effortCost: "€18k" },
  { requirement: "Wwft (AML) compliance", source: "Wwft Art. 2 ff.", status: "Covered", evidence: "AML aligned to AMLD", priority: "Low", confidence: 93, whatsMissing: "Minor uplift to FIU-NL reporting.", recommended: "Configure FIU-NL goAML pipeline.", owner: "Compliance", effortDays: 6, effortCost: "€7k" },
  { requirement: "Safeguarding via stichting derdengelden", source: "Wft Art. 3:29a", status: "Missing", evidence: "No stichting in place", priority: "Critical", confidence: 95, whatsMissing: "NL prefers stichting derdengelden structure.", recommended: "Incorporate stichting and migrate safeguarding.", owner: "Operations", effortDays: 30, effortCost: "€22k" },
  { requirement: "DNB integriteitsbeleid", source: "DNB Beleidsregel integriteit", status: "Partial", evidence: "Generic integrity policy", priority: "High", confidence: 88, whatsMissing: "SIRA (systematic integrity risk analysis) not performed.", recommended: "Run SIRA and document outcomes.", owner: "Compliance", effortDays: 12, effortCost: "€14k" },
  { requirement: "Sanctiewet screening", source: "Sanctiewet 1977", status: "Partial", evidence: "OFAC/EU only", priority: "High", confidence: 89, whatsMissing: "NL national sanctions list not screened.", recommended: "Add NL sanctions list to screening engine.", owner: "Engineering", effortDays: 8, effortCost: "€10k" },
  { requirement: "PSD2 SCA compliance", source: "RTS 2018/389", status: "Covered", evidence: "SCA aligned", priority: "Low", confidence: 94, whatsMissing: "Confirm exemption telemetry shared with DNB on request.", recommended: "Add reporting hook.", owner: "Engineering", effortDays: 4, effortCost: "€5k" },
  { requirement: "Klachtenregeling and Kifid", source: "Wft Art. 4:17 / Kifid reglement", status: "Missing", evidence: "No Kifid registration", priority: "High", confidence: 90, whatsMissing: "Mandatory Kifid registration missing.", recommended: "Register with Kifid and disclose in T&Cs.", owner: "Operations", effortDays: 5, effortCost: "€4k" },
  { requirement: "Uitbestedingsbeleid", source: "Wft Art. 3:18", status: "Partial", evidence: "Group outsourcing policy", priority: "Medium", confidence: 87, whatsMissing: "Critical outsourcing not notified to DNB.", recommended: "Notify DNB and maintain register.", owner: "Compliance", effortDays: 7, effortCost: "€8k" },
  { requirement: "Reporting aan DNB", source: "Wft Art. 3:72", status: "Missing", evidence: "No DNB DLR pipeline", priority: "High", confidence: 91, whatsMissing: "Digitaal Loket Rapportages templates not configured.", recommended: "Set up DLR submissions.", owner: "Engineering", effortDays: 18, effortCost: "€22k" },
];

const ES: RequirementRow[] = [
  { requirement: "Solicitud de autorización EDE", source: "Ley 21/2011 Art. 3", status: "Partial", evidence: "Application drafted in EN", priority: "High", confidence: 90, whatsMissing: "Banco de España requires Spanish submission with local governance.", recommended: "Translate and adapt application.", owner: "Compliance", effortDays: 14, effortCost: "€16k" },
  { requirement: "Honorabilidad y experiencia de directivos", source: "Circular 3/2019 BdE", status: "Missing", evidence: "No ES fit-and-proper dossier", priority: "Critical", confidence: 95, whatsMissing: "Honorabilidad evaluation pack missing for directivos.", recommended: "Prepare fit-and-proper dossier in ES format.", owner: "Compliance", effortDays: 12, effortCost: "€14k" },
  { requirement: "Ley 10/2010 prevención blanqueo", source: "Ley 10/2010 Art. 3 ff.", status: "Covered", evidence: "AML aligned", priority: "Low", confidence: 93, whatsMissing: "Minor uplift to SEPBLAC reporting.", recommended: "Configure SEPBLAC connector.", owner: "Compliance", effortDays: 6, effortCost: "€7k" },
  { requirement: "Salvaguarda de fondos", source: "Ley 21/2011 Art. 10", status: "Missing", evidence: "No ES safeguarding bank", priority: "Critical", confidence: 95, whatsMissing: "Funds must be safeguarded at a Spanish credit entity.", recommended: "Open ES safeguarding account.", owner: "Operations", effortDays: 25, effortCost: "€18k" },
  { requirement: "Reporting al Banco de España", source: "Circular 3/2019", status: "Missing", evidence: "No BdE reporting pipeline", priority: "High", confidence: 91, whatsMissing: "FINREP/COREP-light templates not configured.", recommended: "Set up BdE reporting submissions.", owner: "Engineering", effortDays: 20, effortCost: "€26k" },
  { requirement: "Política de externalización", source: "Circular 3/2019 Norma 8", status: "Partial", evidence: "Group outsourcing policy", priority: "Medium", confidence: 87, whatsMissing: "Outsourcing register not notified to BdE.", recommended: "Notify BdE and maintain register.", owner: "Compliance", effortDays: 7, effortCost: "€8k" },
  { requirement: "PSD2 SCA RTS 2018/389", source: "Ley 7/2020", status: "Covered", evidence: "SCA aligned", priority: "Low", confidence: 94, whatsMissing: "Confirm exemption logic.", recommended: "Document exemption thresholds.", owner: "Engineering", effortDays: 4, effortCost: "€5k" },
  { requirement: "Servicio de atención al cliente", source: "Orden ECC/2502/2012", status: "Missing", evidence: "No ES SAC in place", priority: "High", confidence: 90, whatsMissing: "SAC and reglamento not registered with BdE.", recommended: "Set up SAC, draft reglamento, register with BdE.", owner: "Operations", effortDays: 10, effortCost: "€9k" },
  { requirement: "Plan de contingencia", source: "Circular 3/2019 Norma 9", status: "Partial", evidence: "Group BCP", priority: "Medium", confidence: 86, whatsMissing: "ES-specific scenarios missing.", recommended: "Localise BCP for ES market.", owner: "Operations", effortDays: 8, effortCost: "€7k" },
  { requirement: "Protección de datos LOPDGDD", source: "LOPDGDD + RGPD", status: "Partial", evidence: "GDPR baseline", priority: "Medium", confidence: 87, whatsMissing: "Need AEPD-aligned DPIA and ES DPO.", recommended: "Appoint ES DPO and refresh DPIA.", owner: "Compliance", effortDays: 8, effortCost: "€9k" },
];

export const RESULTS_BY_COUNTRY: Record<RegulatorCode, RequirementRow[]> = {
  GB,
  FR,
  DE,
  NL,
  ES,
};
