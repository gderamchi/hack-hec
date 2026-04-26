// Complee — Detailed step playbooks with form inputs and document outputs.
// Each playbook lists 6–10 substeps, structured form fields the user fills in,
// and the deliverable documents Complee will generate from those inputs.

import type { AssessmentResultRow, Requirement } from "@/data/requirements";

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "radio_explained"
  | "capital_calculator"
  | "capital_structure_table"
  | "capital_threshold_lookup";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

export interface FormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  options?: string[];
  /** Only used by radio_explained — richer options with descriptions. */
  radioOptions?: RadioOption[];
  helper?: string;
  required?: boolean;
  /** One-line explanation of *why* this input is needed. Shown as a popover. */
  why?: string;
  /** A concrete example value, shown beneath the field. */
  example?: string;
  /**
   * Optional substep this input belongs to. When set, the form field is
   * rendered inline beneath the matching substep so the user is asked for
   * the data at the moment it actually becomes relevant. Fields without
   * a substepId fall back to a generic "Additional details" section.
   */
  substepId?: string;
}

export interface Substep {
  id: string;
  title: string;
  detail: string;
  hint?: string;
  /** Plain-English "why does the regulator want this" (1–2 sentences). */
  why?: string;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  // section render produces structured paragraphs from the inputs
  build: (ctx: DocumentContext) => DocumentSection[];
}

export interface DocumentTable {
  /** Column headers, left-to-right. */
  columns: string[];
  /** Each row is an array of stringified cell values matching `columns`. */
  rows: string[][];
  /** Optional footer row rendered with bold styling (e.g. totals). */
  footer?: string[];
  /** Optional caption shown above the table. */
  caption?: string;
}

export interface DocumentSection {
  heading: string;
  body: string[]; // paragraphs
  /** Optional structured tables rendered after the body paragraphs. */
  tables?: DocumentTable[];
}

export interface DocumentContext {
  companyName: string;
  authority: string;
  country: string;
  homeCountry: string;
  requirement: Requirement;
  inputs: Record<string, string>;
  generatedAt: string; // ISO date
}

export interface Playbook {
  summary: string;
  outcome: string;
  estimatedTime: string;
  substeps: Substep[];
  formFields: FormField[];
  documents: DocumentTemplate[];
  resources: { label: string; href: string }[];
}

// ---------- helpers ----------

function val(ctx: DocumentContext, id: string, fallback = "[to be completed]") {
  const v = ctx.inputs[id]?.trim();
  return v && v.length > 0 ? v : fallback;
}

/**
 * Read a sub-key from a field whose value is JSON-serialised
 * (e.g. capital_calculator stores { threshold, method, currency, qualifying }).
 */
function valFromJson(
  ctx: DocumentContext,
  fieldId: string,
  key: string,
  fallback = "[to be completed]",
) {
  const raw = ctx.inputs[fieldId];
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const v = parsed?.[key];
    return v != null && String(v).trim().length > 0 ? String(v) : fallback;
  } catch {
    return fallback;
  }
}

function days(req: Requirement) {
  const d = req.typical_effort_days || 5;
  return d <= 1 ? "Less than a day" : d <= 10 ? `${d} working days` : `~${Math.round(d / 5)} weeks`;
}

/**
 * Build a structured capital-structure table + supporting paragraphs from the
 * JSON value persisted by the CapitalStructureTable widget. Falls back to a
 * single placeholder paragraph when the user has not filled it in yet.
 */
function buildCapitalStructureSection(
  ctx: DocumentContext,
): { body: string[]; tables: DocumentTable[] } {
  const raw = ctx.inputs["capital_structure"];
  const currency = (() => {
    const calcRaw = ctx.inputs["capital_calc"];
    if (!calcRaw) return "EUR";
    try {
      const parsed = JSON.parse(calcRaw);
      return typeof parsed?.currency === "string" && parsed.currency.length > 0
        ? parsed.currency
        : "EUR";
    } catch {
      return "EUR";
    }
  })();

  const fmt = (n: number) => {
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(n);
    } catch {
      return `${currency} ${Math.round(n).toLocaleString("en-GB")}`;
    }
  };

  if (!raw) {
    return {
      body: ["Qualifying capital composition documented in supporting workings."],
      tables: [],
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      lines?: { label: string; amount: number; qualifies: boolean; manual?: boolean }[];
      totals?: { qualifying: number; nonQualifying: number; total: number };
      summary?: string;
    };
    const lines = parsed.lines ?? [];
    if (lines.length === 0) {
      return {
        body: ["Qualifying capital composition documented in supporting workings."],
        tables: [],
      };
    }
    const totals = parsed.totals ?? {
      qualifying: lines.filter((l) => l.qualifies).reduce((s, l) => s + (l.amount || 0), 0),
      nonQualifying: lines.filter((l) => !l.qualifies).reduce((s, l) => s + (l.amount || 0), 0),
      total: lines.reduce((s, l) => s + (l.amount || 0), 0),
    };

    const rows = lines.map((l) => [
      l.label,
      fmt(l.amount || 0),
      l.qualifies ? "Qualifying" : "Excluded",
      l.manual ? "Manual override" : "Auto-classified",
    ]);

    const table: DocumentTable = {
      caption: "Balance sheet items mapped to CRR Article 26 own-funds eligibility:",
      columns: ["Balance sheet item", "Amount", "Treatment", "Source"],
      rows,
      footer: ["Total qualifying own funds", fmt(totals.qualifying), "", ""],
    };

    const body: string[] = [
      `Qualifying own funds total: ${fmt(totals.qualifying)}.`,
      `Excluded items total: ${fmt(totals.nonQualifying)}.`,
      `Gross balance sheet capital reviewed: ${fmt(totals.total)}.`,
    ];
    if (parsed.summary && parsed.summary.trim().length > 0) {
      body.push(parsed.summary.trim());
    }
    return { body, tables: [table] };
  } catch {
    return {
      body: ["Qualifying capital composition documented in supporting workings."],
      tables: [],
    };
  }
}

// ---------- category playbooks ----------

const PLAYBOOKS: Record<string, (req: Requirement) => Omit<Playbook, "estimatedTime" | "resources">> = {
  capital_requirements: (req) => {
    // Decide whether the "ongoing own-funds calculation" substep is meaningful
    // for this institution. AISPs hold PII, not own funds; Small EMIs have no
    // ongoing requirement (just a €5m business cap). For those we drop cap-3
    // entirely so the user isn't asked to run a formula that doesn't apply.
    const applies = req.applies_to ?? [];
    const isAispOnly = applies.length > 0 && applies.every((a) => a === "AISP");
    const isSmallEmiOnly = applies.length > 0 && applies.every((a) => a === "Small EMI");
    const showOngoingStep = !isAispOnly && !isSmallEmiOnly;

    // EMIs do NOT use Methods A/B/C — they apply a fixed 2% rule. Tailor copy.
    const isEmiFamily =
      applies.length > 0 && applies.every((a) => a === "EMI" || a === "Small EMI");
    const ongoingDetail = isEmiFamily
      ? "EMIs apply the fixed 2% rule: ongoing own funds = max(initial-capital floor, 2% of average outstanding e-money). The calculator runs this for you — just enter the average outstanding e-money."
      : "Pick the calculation method that applies (PSD2 Methods A, B or C) and run the formula. Compare to qualifying capital and document the working.";
    const ongoingWhy = isEmiFamily
      ? "Initial capital is one number. EMIs additionally must hold 2% of average outstanding e-money at all times — the regulator wants both met continuously."
      : "Initial capital is one number. Ongoing own-funds scales with your business — for PIs it's a function of payment volume. The regulator wants both met at all times.";

    return {
    summary: `Demonstrate that ${req.applies_to.join("/")} initial and ongoing capital meet the ${req.authority} thresholds in ${req.regulation_reference}, held in eligible instruments and free of encumbrance.`,
    outcome: "Capital adequacy memo signed by the CFO, ICARA/ICAAP-style supporting workings, and an evidence pack of bank statements.",
    substeps: [
      {
        id: "cap-1",
        title: "Confirm the exact capital threshold",
        detail: `Open ${req.regulation_reference} and record the minimum initial capital, ongoing own-funds calculation method (Method A/B/C for PSD2 PIs, fixed 2% rule for EMIs), and any phase-in dates.`,
        hint: "Capital must be paid-up share capital or audited retained earnings — not pledged or encumbered.",
        why: "Regulators set this floor so a failing firm has a buffer to wind down without harming customers. Get the exact number wrong and the application fails on the first read.",
      },
      {
        id: "cap-2",
        title: "Map your current capital structure",
        detail: "Pull the latest management accounts. Tag every line as qualifying / non-qualifying under the rule.",
        why: "Only certain instruments count as 'own funds' (paid-up share capital, audited retained earnings). Loans, deferred tax assets, and goodwill don't. The mapping is what proves you actually meet the threshold.",
      },
      ...(showOngoingStep
        ? [{
            id: "cap-3",
            title: isEmiFamily
              ? "Calculate the ongoing 2% requirement"
              : "Calculate the ongoing own-funds requirement",
            detail: ongoingDetail,
            why: ongoingWhy,
          }]
        : []),
      {
        id: "cap-4",
        title: "Close any shortfall",
        detail: "If qualifying capital is below threshold, schedule a capital injection or retained-earnings transfer before the application date.",
        why: "Submitting an application while under-capitalised is one of the fastest ways to get rejected. Fix the gap before you press send.",
      },
      {
        id: "cap-5",
        title: "Get bank confirmation of segregation",
        detail: "Request a letter from the credit institution confirming the capital account is in your name and unencumbered.",
        why: "Without a third-party letter, the regulator has only your word that the capital exists and isn't pledged. The letter is the audit-grade evidence.",
      },
      {
        id: "cap-6",
        title: "Draft the CFO attestation memo",
        detail: `One-page memo covering: threshold, current qualifying capital, method used, headroom, and signatory. This is the artefact ${req.authority} expects in the application pack.`,
        why: "Personal CFO sign-off shifts liability and signals senior accountability — exactly what supervisors look for.",
      },
      {
        id: "cap-7",
        title: "Board approval",
        detail: "Get the memo approved at the next board meeting and capture the resolution in the minutes.",
        why: "Capital adequacy is a board-level matter under all major EU/UK regimes. No board minute = no governance trail.",
      },
    ],
    formFields: [
      // Auto-resolved threshold lookup — Complee shows the exact figure,
      // formula, citation, and source link so the user never has to open
      // the regulation themselves.
      {
        id: "capital_threshold_ref",
        label: "Your exact capital threshold (auto-resolved)",
        type: "capital_threshold_lookup",
        substepId: "cap-1",
        why: "Complee maps your institution type and target country to the exact regulation, article, and figure — no PDF lookup required. Click 'Confirmed' once you've reviewed it.",
      },
      // The calculator is a self-contained widget that captures threshold,
      // method, currency, and qualifying capital with live computation.
      {
        id: "capital_calc",
        label: "Own-funds calculator",
        type: "capital_calculator",
        substepId: "cap-3",
        required: true,
        why: "Method A/B/C apply to PSD2 Payment Institutions; EMIs use a fixed minimum + 2% of average outstanding e-money. The calculator runs the right formula and tells you live whether you meet it.",
      },
      // Capital structure table — qualifying vs non-qualifying mapping.
      {
        id: "capital_structure",
        label: "Map your current capital structure",
        type: "capital_structure_table",
        substepId: "cap-2",
        required: true,
        why: "Tag each line of your balance sheet as qualifying (paid-up share capital, audited retained earnings) or non-qualifying (loans, goodwill, deferred tax). The total qualifying number is what flows into the calculator and the memo.",
      },
      {
        id: "bank_name",
        label: "Bank holding the capital account",
        type: "text",
        placeholder: "e.g. BNP Paribas",
        substepId: "cap-5",
        required: true,
        why: "The regulator cross-references the named credit institution to confirm it's authorised in the EEA / UK.",
        example: "BNP Paribas SA",
      },
      {
        id: "bank_iban",
        label: "Capital account IBAN (last 4)",
        type: "text",
        placeholder: "e.g. ****1234",
        substepId: "cap-5",
        why: "Only the last 4 digits — enough to tie the bank letter to a specific account without exposing full account data.",
      },
      {
        id: "cfo_name",
        label: "CFO full name",
        type: "text",
        placeholder: "e.g. Marie Laurent",
        substepId: "cap-6",
        required: true,
        why: "The CFO personally attests that the capital position is true. Their name appears on the signed memo.",
      },
      {
        id: "board_date",
        label: "Date of board approval",
        type: "date",
        substepId: "cap-7",
        why: "The regulator looks for a board minute dated on or before the application submission date.",
      },
    ],
    documents: [
      {
        id: "capital-memo",
        title: "Capital Adequacy Memo",
        description: "Signed memo declaring own-funds compliance — required in the authorisation pack.",
        build: (ctx) => [
          { heading: "1. Purpose", body: [`This memo is submitted by ${ctx.companyName} to ${ctx.authority} in support of its application under ${ctx.requirement.regulation_reference}. It evidences compliance with the minimum capital and ongoing own-funds requirements applicable in ${ctx.country}.`] },
          {
            heading: "2. Capital Position",
            body: [
              `Qualifying capital held: ${valFromJson(ctx, "capital_calc", "qualifying")} ${valFromJson(ctx, "capital_calc", "currency", "EUR")}.`,
              `Regulatory threshold: ${valFromJson(ctx, "capital_calc", "threshold")} ${valFromJson(ctx, "capital_calc", "currency", "EUR")}.`,
              `Calculation method: ${valFromJson(ctx, "capital_calc", "method")}.`,
              `Headroom vs requirement: ${valFromJson(ctx, "capital_calc", "headroom", "[computed]")} ${valFromJson(ctx, "capital_calc", "currency", "EUR")}.`,
            ],
          },
          (() => {
            const cs = buildCapitalStructureSection(ctx);
            return { heading: "3. Capital Structure", body: cs.body, tables: cs.tables };
          })(),
          { heading: "4. Custody and Segregation", body: [`Capital is held with ${val(ctx, "bank_name")} (account reference ${val(ctx, "bank_iban", "[REDACTED]")}) in the name of ${ctx.companyName}. The account is unencumbered and not subject to any pledge, charge, or third-party right.`] },
          { heading: "5. Governance", body: [`This position was reviewed and approved by the Board on ${val(ctx, "board_date")} and is signed below by the Chief Financial Officer.`] },
          { heading: "6. Attestation", body: [`I, ${val(ctx, "cfo_name")}, Chief Financial Officer of ${ctx.companyName}, attest that the above is true and accurate as of ${ctx.generatedAt}.`, "Signature:", " ", "Auditor signature:"] },
        ],
      },
    ],
    };
  },

  safeguarding: (req) => ({
    summary: `Stand up a safeguarding control set that satisfies ${req.authority}: segregated accounts, daily reconciliation, annual audit, and breach notification.`,
    outcome: "Updated Safeguarding Policy, daily reconciliation runbook, and a signed audit engagement letter.",
    substeps: [
      { id: "sg-1", title: "Open or confirm a dedicated safeguarding account", detail: "Account must be in your name, ring-fenced, held with an authorised credit institution. Record the IBAN and the institution's authorisation reference." },
      { id: "sg-2", title: "Define the relevant funds perimeter", detail: "Document which incoming funds become 'relevant funds' and at what point segregation begins (typically T+0 end of day for EMIs)." },
      { id: "sg-3", title: "Implement daily reconciliation", detail: "Reconcile customer balances against the safeguarding account at end of each business day. Capture variance, root cause, and resolution in a log.", hint: "Variance > 0.1% must trigger an immediate escalation to the MLRO and Head of Finance." },
      { id: "sg-4", title: "Update the Safeguarding Policy", detail: "Cover: in-scope funds, segregation method (account vs insurance), reconciliation frequency, escalation matrix, breach notification, wind-down treatment." },
      { id: "sg-5", title: "Engage an external safeguarding auditor", detail: `${req.authority} expects an annual audit by an independent firm. Get the engagement letter signed before the application is submitted.` },
      { id: "sg-6", title: "Train operations and finance staff", detail: "Train all staff who touch customer funds on segregation rules. Capture attendance and a short test." },
      { id: "sg-7", title: "Run a tabletop breach exercise", detail: "Walk through what happens if the safeguarding account is unavailable for 24 hours. Capture the resolution playbook." },
    ],
    formFields: [
      {
        id: "method_choice",
        label: "Safeguarding method",
        type: "radio_explained",
        radioOptions: [
          {
            value: "Segregation (designated account)",
            label: "Segregation (designated account)",
            description:
              "Customer funds sit in a separate, ring-fenced bank account at an authorised credit institution. Most common method for EMIs.",
          },
          {
            value: "Insurance / comparable guarantee",
            label: "Insurance / comparable guarantee",
            description:
              "An insurance policy or bank guarantee covers the full customer balance. Rare in practice — premiums scale with float and few insurers offer it.",
          },
        ],
        substepId: "sg-1",
        required: true,
        why: "PSD2/EMD2 give you two routes. Segregation is the standard; insurance is permitted but operationally complex. The regulator wants you to make a deliberate choice and stick to it.",
      },
      { id: "credit_institution", label: "Credit institution name", type: "text", placeholder: "e.g. Barclays Bank PLC", substepId: "sg-1", required: true, why: "Must be an authorised credit institution in the EEA / UK. The regulator cross-checks the name against authorised firms registers." },
      { id: "credit_inst_ref", label: "Authorisation reference of the credit institution", type: "text", placeholder: "e.g. PRA 122702", substepId: "sg-1", why: "Lets the regulator confirm in one click that the bank is supervised." },
      { id: "iban", label: "Safeguarding account IBAN (last 4)", type: "text", placeholder: "e.g. ****8842", substepId: "sg-1" },
      { id: "recon_owner", label: "Reconciliation owner (role)", type: "text", placeholder: "e.g. Head of Finance Operations", substepId: "sg-3", required: true, why: "A named owner with personal accountability for the daily reconciliation is what the regulator looks for." },
      { id: "auditor_firm", label: "External auditor firm", type: "text", placeholder: "e.g. Mazars LLP", substepId: "sg-5", why: "The annual safeguarding audit must be done by an independent firm — typically a registered auditor." },
      { id: "audit_period_end", label: "Audit period end date", type: "date", substepId: "sg-5" },
    ],
    documents: [
      {
        id: "safeguarding-policy",
        title: "Safeguarding Policy",
        description: "Board-approved safeguarding policy — required for the authorisation submission.",
        build: (ctx) => [
          { heading: "1. Scope", body: [`This Policy governs the safeguarding of customer funds held by ${ctx.companyName} in connection with services regulated by ${ctx.authority} under ${ctx.requirement.regulation_reference}.`] },
          { heading: "2. Method", body: [`${ctx.companyName} safeguards relevant funds via: ${val(ctx, "method_choice")}.`] },
          { heading: "3. Custody", body: [`Relevant funds are held with ${val(ctx, "credit_institution")} (authorisation reference ${val(ctx, "credit_inst_ref", "[reference]")}) in account ${val(ctx, "iban", "[IBAN]")}, in the name of ${ctx.companyName} and ring-fenced from the firm's own funds.`] },
          { heading: "4. Reconciliation", body: [`A daily reconciliation between the firm's customer ledger and the safeguarding account is performed by the ${val(ctx, "recon_owner")}. Variances are escalated to the MLRO and Head of Finance the same business day.`] },
          { heading: "5. Independent Audit", body: [`An annual safeguarding audit is performed by ${val(ctx, "auditor_firm")} for the period ending ${val(ctx, "audit_period_end")}.`] },
          { heading: "6. Breach and Wind-down", body: [`In the event of a safeguarding breach the firm will notify ${ctx.authority} within one business day and execute the wind-down plan to ensure customer funds are returned in full.`] },
        ],
      },
    ],
  }),

  aml_kyc: (req) => ({
    summary: `Localise the AML/KYC framework for ${req.country}, appoint a locally-resident MLRO/Geldwäschebeauftragter where required, and refresh the customer risk assessment.`,
    outcome: "Localised AML Policy, MLRO appointment letter, refreshed customer risk assessment, and SAR routing procedure.",
    substeps: [
      { id: "aml-1", title: "Run a target-market customer risk assessment", detail: "Identify customer, geography, product, and channel risks specific to the target country. Refresh typologies." },
      { id: "aml-2", title: "Confirm MLRO arrangements", detail: `Verify whether ${req.authority} requires a locally-resident MLRO. If yes, prepare the appointment letter and SMF/F&P documentation.`, hint: "UK = SMF17. DE = Geldwäschebeauftragter resident in the EU." },
      { id: "aml-3", title: "Localise screening and sanctions lists", detail: "Add the local consolidated sanctions list (OFSI for UK, Bundesbank for DE)." },
      { id: "aml-4", title: "Update SAR routing", detail: "Configure the local FIU as the primary recipient (NCA for UK, FIU at Zoll for DE, TRACFIN for FR)." },
      { id: "aml-5", title: "Refresh staff training", detail: "All customer-facing and operations staff need annual AML training that references the target jurisdiction's rules and red flags." },
      { id: "aml-6", title: "Document EDD triggers", detail: "PEP, high-risk geography, complex ownership, unusual transaction pattern. Each must have a documented escalation path." },
      { id: "aml-7", title: "Test the framework end-to-end", detail: "Run two synthetic test cases (one EDD, one SAR) and capture the timeline and outputs." },
    ],
    formFields: [
      { id: "mlro_name", label: "MLRO full name", type: "text", placeholder: "e.g. James O'Connor", substepId: "aml-2", required: true, why: "The MLRO is personally accountable for AML compliance and SAR filing. Most regimes (UK SMF17, German Geldwäschebeauftragter) require the regulator to approve the appointment." },
      { id: "mlro_residence", label: "MLRO country of residence", type: "text", placeholder: "e.g. United Kingdom", substepId: "aml-2", required: true, why: "Some regulators (e.g. BaFin) require the MLRO to be EU-resident; the FCA requires UK-based for SMF17." },
      { id: "mlro_appointed", label: "MLRO appointment date", type: "date", substepId: "aml-2" },
      {
        id: "sanctions_list",
        label: "Local sanctions lists screened",
        type: "multi_select",
        options: [
          "EU consolidated list",
          "UN consolidated list",
          "OFSI (UK)",
          "OFAC (US)",
          "Bundesbank embargo (DE)",
          "DGTPE (FR)",
          "Tresor (FR)",
        ],
        substepId: "aml-3",
        why: "EU + UN are baseline. Add the local supervisor's list (OFSI for UK, Bundesbank for DE, DGTPE for FR). OFAC is good practice if you have any US nexus.",
      },
      {
        id: "fiu_name",
        label: "Local FIU / SAR recipient",
        type: "radio_explained",
        radioOptions: [
          { value: "UK NCA", label: "UK NCA", description: "United Kingdom — National Crime Agency receives SARs via the SAR Online portal." },
          { value: "TRACFIN", label: "TRACFIN", description: "France — Treatment of Intelligence and Action against Financial Circuits." },
          { value: "FIU at Zoll", label: "FIU at Zoll (DE)", description: "Germany — Financial Intelligence Unit hosted by the customs authority." },
          { value: "FIU-NL", label: "FIU-NL", description: "Netherlands — Financial Intelligence Unit; submissions via goAML." },
          { value: "SEPBLAC", label: "SEPBLAC", description: "Spain — Executive Service of the Commission for Prevention of Money Laundering." },
        ],
        substepId: "aml-4",
        required: true,
        why: "The local FIU is the only valid recipient for SARs in the target market. Sending to the wrong agency means the report does not count.",
      },
      { id: "training_provider", label: "Annual training provider", type: "text", placeholder: "e.g. Internal LMS / Thomson Reuters", substepId: "aml-5" },
      { id: "high_risk_countries", label: "High-risk jurisdictions tagged in screening", type: "textarea", placeholder: "Comma-separated list", substepId: "aml-6", why: "Should at minimum mirror the EU AMLD high-risk list and FATF call-for-action list. Add any country-specific risks from your customer base." },
    ],
    documents: [
      {
        id: "aml-policy",
        title: "AML & Counter-Terrorist Financing Policy (Localised)",
        description: "Target-market AML policy referencing the local FIU, sanctions regime, and MLRO.",
        build: (ctx) => [
          { heading: "1. Scope", body: [`This Policy governs the anti-money-laundering and counter-terrorist-financing framework operated by ${ctx.companyName} in ${ctx.country}, supervised by ${ctx.authority} under ${ctx.requirement.regulation_reference}.`] },
          { heading: "2. MLRO", body: [`${val(ctx, "mlro_name")}, resident in ${val(ctx, "mlro_residence")}, has been appointed as MLRO with effect from ${val(ctx, "mlro_appointed")}. The MLRO has direct access to the Board.`] },
          { heading: "3. Customer Due Diligence", body: ["Standard CDD is performed on all customers at onboarding and refreshed on a risk-based cycle. EDD is triggered by PEP status, high-risk geography, complex ownership structures, or anomalous transaction patterns."] },
          { heading: "4. Sanctions Screening", body: [`Customers and counterparties are screened against ${val(ctx, "sanctions_list")} and against the EU and UN consolidated lists. Screening is performed at onboarding and on a daily delta basis.`] },
          { heading: "5. SAR Reporting", body: [`Suspicious activity is reported to ${val(ctx, "fiu_name")} without delay using the prescribed channel. Internal SARs are escalated to the MLRO within 24 hours of detection.`] },
          { heading: "6. Training", body: [`All in-scope staff complete annual AML training delivered via ${val(ctx, "training_provider")}. Records of completion are retained for five years.`] },
          { heading: "7. High-risk Jurisdictions", body: [val(ctx, "high_risk_countries", "Aligned with the EU AMLD high-risk third-country list and the FATF call-for-action list.")] },
        ],
      },
    ],
  }),

  fraud_prevention: (req) => ({
    summary: `Confirm Strong Customer Authentication, transaction-monitoring rules, and fraud KPIs match ${req.authority} expectations for ${req.country}.`,
    outcome: "SCA configuration record, exemption policy, target-market fraud-monitoring rules, and a fraud KPI dashboard specification.",
    substeps: [
      { id: "fr-1", title: "Audit current SCA implementation", detail: "Document which factors (knowledge / possession / inherence) are used and the exemption logic (low value, TRA, MIT)." },
      { id: "fr-2", title: "Document the exemption policy", detail: "Per-channel and per-instrument: which exemptions you apply, their thresholds, and the fraud-rate ceilings that govern them." },
      { id: "fr-3", title: "Tune fraud rules for the target market", detail: "Local fraud typologies differ — APP scams dominate in the UK, SEPA Inst fraud rises in DE/NL. Add at least three target-market rules." },
      { id: "fr-4", title: "Set fraud KPI thresholds", detail: "Define the fraud rate threshold per payment instrument and the escalation path when breached. Include in the board pack." },
      { id: "fr-5", title: "Document the customer-victim reimbursement policy", detail: "Especially relevant in the UK with mandatory reimbursement for APP scams from Oct 2024." },
      { id: "fr-6", title: "Run a quarterly fraud council", detail: "Cross-functional review of incidents, near-misses, rule performance, and false-positive rate." },
    ],
    formFields: [
      { id: "sca_factors", label: "SCA factors implemented", type: "textarea", placeholder: "e.g. Knowledge: PIN; Possession: device binding; Inherence: biometric", substepId: "fr-1", required: true },
      { id: "exemptions_used", label: "Exemptions applied", type: "textarea", placeholder: "e.g. Low-value, TRA, MIT", substepId: "fr-2" },
      { id: "kpi_threshold_card", label: "Card fraud KPI threshold (bps)", type: "number", placeholder: "e.g. 7", substepId: "fr-4" },
      { id: "kpi_threshold_credit_transfer", label: "Credit transfer fraud KPI threshold (bps)", type: "number", placeholder: "e.g. 1", substepId: "fr-4" },
      { id: "fraud_owner", label: "Head of Fraud (role/name)", type: "text", substepId: "fr-6", required: true },
    ],
    documents: [
      {
        id: "fraud-policy",
        title: "Fraud Prevention & SCA Policy",
        description: "SCA configuration, exemption policy, and target-market fraud-monitoring rules.",
        build: (ctx) => [
          { heading: "1. Strong Customer Authentication", body: [`${ctx.companyName} applies the following SCA factors: ${val(ctx, "sca_factors")}.`] },
          { heading: "2. Exemptions", body: [`The following exemptions are applied where conditions are met: ${val(ctx, "exemptions_used")}. Exemption decisions are logged at transaction level for audit purposes.`] },
          { heading: "3. Fraud KPIs", body: [`Card fraud rate threshold: ${val(ctx, "kpi_threshold_card", "[bps]")} bps. Credit transfer fraud rate threshold: ${val(ctx, "kpi_threshold_credit_transfer", "[bps]")} bps. Breach of either threshold triggers immediate notification to the Board and to ${ctx.authority}.`] },
          { heading: "4. Governance", body: [`Day-to-day ownership sits with ${val(ctx, "fraud_owner")}. A quarterly Fraud Council reviews incidents, rule performance, and false-positive rates.`] },
        ],
      },
    ],
  }),

  governance: (req) => ({
    summary: `Build the governance pack ${req.authority} expects: board composition, fitness and propriety, organisational structure, and a 3-year regulatory business plan.`,
    outcome: "Authorisation pack: board composition memo, F&P questionnaires, org chart, and a 3-year business plan.",
    substeps: [
      { id: "gov-1", title: "Confirm board composition meets local rules", detail: `${req.authority} typically requires at least two executive directors (the "four-eyes" principle) and a clear separation between board and senior management.` },
      { id: "gov-2", title: "Collect Fit & Proper documentation", detail: "For every director and qualifying shareholder: CV, criminal record check, regulatory references, signed F&P questionnaire.", hint: "Criminal record checks expire — most regulators want them <3 months old at submission." },
      { id: "gov-3", title: "Map qualifying shareholders (>10%)", detail: "Document the ownership chain up to ultimate beneficial owners. UBO declarations must be signed." },
      { id: "gov-4", title: "Draft the regulatory business plan", detail: "3-year financial projections, target customer segments, product roadmap, wind-down section. Most-scrutinised document." },
      { id: "gov-5", title: "Build the organisational chart", detail: "Show all functions, reporting lines, and the SMF/F&P-holders. Mark independent directors." },
      { id: "gov-6", title: "Schedule the pre-application meeting", detail: `${req.authority} offers a pre-application meeting. Book it before submission — surfaces blockers cheaply.` },
      { id: "gov-7", title: "Board approval of the application pack", detail: "Final board resolution authorising submission. Capture in minutes." },
    ],
    formFields: [
      { id: "country_of_inc", label: "Country of incorporation", type: "text", placeholder: "e.g. France", substepId: "gov-1" },
      { id: "registered_office", label: "Registered office address (target country)", type: "textarea", substepId: "gov-1" },
      { id: "ceo_name", label: "CEO full name", type: "text", substepId: "gov-1", required: true },
      { id: "exec_directors", label: "Executive directors (one per line)", type: "textarea", placeholder: "Name — Role", substepId: "gov-1", required: true },
      { id: "non_exec_directors", label: "Non-executive directors", type: "textarea", placeholder: "Name — Role", substepId: "gov-1" },
      { id: "qualifying_shareholders", label: "Qualifying shareholders (>10%)", type: "textarea", placeholder: "Name — % held — UBO", substepId: "gov-3" },
      { id: "pre_app_meeting_date", label: "Pre-application meeting date", type: "date", substepId: "gov-6" },
    ],
    documents: [
      {
        id: "governance-memo",
        title: "Governance & Senior Management Memo",
        description: "Board composition, Fit & Proper coverage, and ownership structure.",
        build: (ctx) => [
          { heading: "1. Corporate Information", body: [`Applicant: ${ctx.companyName}. Country of incorporation: ${val(ctx, "country_of_inc")}. Registered office in ${ctx.country}: ${val(ctx, "registered_office")}.`] },
          { heading: "2. Board Composition", body: [`Chief Executive: ${val(ctx, "ceo_name")}.`, `Executive directors: ${val(ctx, "exec_directors")}.`, `Non-executive directors: ${val(ctx, "non_exec_directors", "None at the date of submission.")}`] },
          { heading: "3. Qualifying Shareholders", body: [val(ctx, "qualifying_shareholders", "None above the 10% threshold.")] },
          { heading: "4. Fit & Proper", body: ["A signed F&P questionnaire, CV, regulatory references, and a criminal record check (<3 months old) are submitted for each director and qualifying shareholder. Documents are bundled in Annex G.1."] },
          { heading: "5. Pre-application Meeting", body: [`A pre-application meeting with ${ctx.authority} is scheduled for ${val(ctx, "pre_app_meeting_date")}.`] },
        ],
      },
    ],
  }),

  consumer_protection: (req) => ({
    summary: `Implement the local consumer-outcomes framework and prepare the annual board attestation.`,
    outcome: "Board-approved Consumer Outcomes Policy and the first annual attestation draft.",
    substeps: [
      { id: "cp-1", title: "Map your customer journey to the four outcomes", detail: "Products & services, price & value, consumer understanding, consumer support. Identify gaps for each." },
      { id: "cp-2", title: "Build the outcomes MI pack", detail: "Each outcome needs measurable indicators (complaint root cause, vulnerable customer flags, fee transparency tests)." },
      { id: "cp-3", title: "Document fair-value assessment", detail: "Per product family: cost to deliver, price charged, value drivers, target market." },
      { id: "cp-4", title: "Vulnerable customer process", detail: "Identification, recording, tailored support, staff training. Annual review." },
      { id: "cp-5", title: "Draft the annual board attestation", detail: "The board must attest annually that the firm is delivering good outcomes. Have the first draft ready before authorisation." },
    ],
    formFields: [
      { id: "products_in_scope", label: "Products in scope", type: "textarea", placeholder: "Comma-separated", substepId: "cp-1", required: true },
      { id: "vulnerable_customer_pct", label: "% customers flagged vulnerable (estimate)", type: "number", substepId: "cp-4" },
      { id: "owner_name", label: "Consumer Outcomes Owner (name)", type: "text", substepId: "cp-5", required: true },
      { id: "owner_role", label: "Owner role", type: "text", placeholder: "e.g. Chief Customer Officer", substepId: "cp-5", required: true },
    ],
    documents: [
      {
        id: "consumer-outcomes-policy",
        title: "Consumer Outcomes Policy",
        description: "Local consumer-outcomes framework and governance.",
        build: (ctx) => [
          { heading: "1. Ownership", body: [`Accountability for consumer outcomes sits with ${val(ctx, "owner_name")} (${val(ctx, "owner_role")}).`] },
          { heading: "2. Products in Scope", body: [val(ctx, "products_in_scope")] },
          { heading: "3. The Four Outcomes", body: ["Products & services, price & value, consumer understanding, and consumer support are each tracked through dedicated MI and reviewed quarterly by the Consumer Outcomes Committee."] },
          { heading: "4. Vulnerable Customers", body: [`Approximately ${val(ctx, "vulnerable_customer_pct", "[%]")}% of the customer base is currently flagged as potentially vulnerable. Tailored journeys and second-line review apply.`] },
        ],
      },
    ],
  }),

  operational_resilience: (req) => ({
    summary: `Map important business services, set impact tolerances, and run a severe-but-plausible scenario test.`,
    outcome: "Important Business Service register, impact tolerance log, and a scenario test report.",
    substeps: [
      { id: "or-1", title: "Identify Important Business Services (IBS)", detail: "Anything whose disruption would cause intolerable customer harm or threaten market integrity. Usually 3–6 services for an EMI/PI." },
      { id: "or-2", title: "Set impact tolerances per IBS", detail: "Maximum tolerable disruption (in hours or transactions) for each IBS. Approved by the board." },
      { id: "or-3", title: "Map third-party dependencies", detail: "For each IBS list the critical third parties (BIN sponsor, KYC provider, cloud, processor)." },
      { id: "or-4", title: "Run a scenario test and document lessons", detail: "Severe-but-plausible: cloud outage, third-party processor failure, ransomware. Record what broke and the remediation backlog." },
      { id: "or-5", title: "Board sign-off", detail: "Board must approve the IBS list, tolerances, and scenario test outcomes annually." },
    ],
    formFields: [
      { id: "ibs_list", label: "Important Business Services (one per line)", type: "textarea", placeholder: "e.g. Card payments authorisation\nWallet top-up", substepId: "or-1", required: true },
      { id: "tolerance_payments", label: "Impact tolerance — payments authorisation (max hours)", type: "number", substepId: "or-2" },
      { id: "third_parties", label: "Critical third parties", type: "textarea", placeholder: "Provider — service provided", substepId: "or-3" },
      { id: "scenario_test_date", label: "Last scenario test date", type: "date", substepId: "or-4" },
    ],
    documents: [
      {
        id: "op-resilience-statement",
        title: "Operational Resilience Statement",
        description: "Self-assessment and IBS register for the application pack.",
        build: (ctx) => [
          { heading: "1. Important Business Services", body: [val(ctx, "ibs_list")] },
          { heading: "2. Impact Tolerances", body: [`Payments authorisation: maximum tolerable disruption ${val(ctx, "tolerance_payments", "[hours]")} hours.`] },
          { heading: "3. Third-Party Dependencies", body: [val(ctx, "third_parties")] },
          { heading: "4. Scenario Testing", body: [`The most recent severe-but-plausible scenario test was conducted on ${val(ctx, "scenario_test_date")}. Findings and remediation actions are tracked in the operational resilience register.`] },
        ],
      },
    ],
  }),

  reporting: (req) => ({
    summary: `Configure regulatory reporting feeds for ${req.authority}, document data lineage, and run a successful test submission.`,
    outcome: "Reporting calendar, data lineage document, and confirmation of a successful test submission.",
    substeps: [
      { id: "rp-1", title: "Build the reporting calendar", detail: "List every return, frequency, regulatory deadline, and internal sign-off owner." },
      { id: "rp-2", title: "Document data lineage", detail: "Source system → transformation → submission file. Auditors will trace every figure back to a system of record." },
      { id: "rp-3", title: "Set up the regulator's portal access", detail: "Request user accounts, certificates, and 2FA for the regulator's submission portal." },
      { id: "rp-4", title: "Run a dry-run submission", detail: "Most regulators offer a test environment. Submit a dry run before go-live to flush out schema errors." },
      { id: "rp-5", title: "Define the four-eyes sign-off", detail: "Each return needs a preparer and an approver. Capture both in the calendar." },
    ],
    formFields: [
      { id: "regulatory_returns", label: "Regulatory returns in scope (one per line)", type: "textarea", placeholder: "Return name — Frequency — Deadline", substepId: "rp-1", required: true },
      { id: "portal_account", label: "Regulator portal account holder", type: "text", substepId: "rp-3" },
      { id: "preparer", label: "Default preparer (role)", type: "text", substepId: "rp-5", required: true },
      { id: "approver", label: "Default approver (role)", type: "text", substepId: "rp-5", required: true },
    ],
    documents: [
      {
        id: "reporting-procedure",
        title: "Regulatory Reporting Procedure",
        description: "Calendar, ownership, and four-eyes sign-off for regulatory returns.",
        build: (ctx) => [
          { heading: "1. Returns in Scope", body: [val(ctx, "regulatory_returns")] },
          { heading: "2. Ownership", body: [`Default preparer: ${val(ctx, "preparer")}. Default approver: ${val(ctx, "approver")}. The four-eyes principle applies to every submission.`] },
          { heading: "3. Portal Access", body: [`The ${ctx.authority} reporting portal account is held by ${val(ctx, "portal_account")} with 2FA enforced.`] },
        ],
      },
    ],
  }),

  data_protection: (req) => ({
    summary: `Confirm GDPR / UK GDPR alignment, appoint a DPO if required, and document cross-border data transfers.`,
    outcome: "DPO appointment letter, ROPA, and the standard contractual clauses register.",
    substeps: [
      { id: "dp-1", title: "Confirm DPO requirement and appoint", detail: "If you process personal data at scale, a DPO is mandatory. The DPO must be reachable for the local supervisory authority." },
      { id: "dp-2", title: "Refresh the Record of Processing Activities (ROPA)", detail: "Article 30 record. Each processing activity, lawful basis, retention, and recipients." },
      { id: "dp-3", title: "Document cross-border transfers", detail: "Identify every transfer to a third country. Apply SCCs / IDTA and a Transfer Impact Assessment." },
      { id: "dp-4", title: "Run a DPIA on the highest-risk processing", detail: "Required for high-risk processing (e.g. behavioural fraud scoring)." },
      { id: "dp-5", title: "Update the customer privacy notice", detail: "Localise to the target country language and supervisory authority." },
    ],
    formFields: [
      { id: "dpo_name", label: "DPO full name", type: "text", substepId: "dp-1", required: true },
      { id: "dpo_email", label: "DPO contact email", type: "text", substepId: "dp-1", required: true },
      { id: "supervisory_authority", label: "Lead supervisory authority", type: "text", placeholder: "e.g. ICO (UK)", substepId: "dp-2" },
      { id: "transfers", label: "Cross-border transfers in place", type: "textarea", placeholder: "Recipient — Country — Mechanism", substepId: "dp-3" },
    ],
    documents: [
      {
        id: "data-protection-statement",
        title: "Data Protection Statement",
        description: "Summary of DPO, ROPA, and cross-border transfer arrangements.",
        build: (ctx) => [
          { heading: "1. Data Protection Officer", body: [`${val(ctx, "dpo_name")} is appointed as DPO and reachable at ${val(ctx, "dpo_email")}.`] },
          { heading: "2. Lead Supervisory Authority", body: [val(ctx, "supervisory_authority")] },
          { heading: "3. Cross-Border Transfers", body: [val(ctx, "transfers", "No cross-border transfers outside the EEA / UK at the date of submission.")] },
          { heading: "4. ROPA & DPIAs", body: ["A current Record of Processing Activities is maintained under Article 30. DPIAs are completed for high-risk processing including transaction-monitoring scoring."] },
        ],
      },
    ],
  }),

  complaints: (req) => ({
    summary: `Stand up a local complaints-handling procedure aligned with ${req.authority} timelines and the local ombudsman scheme.`,
    outcome: "Complaints Procedure document, complaints register, and FOS / local ombudsman wording.",
    substeps: [
      { id: "co-1", title: "Confirm timelines", detail: "Most regulators require acknowledgement <5 business days and final response <8 weeks." },
      { id: "co-2", title: "Configure local ombudsman wording", detail: "UK = FOS. France = ACPR médiateur. Wording must appear in the final response letter." },
      { id: "co-3", title: "Build the complaints register", detail: "Date received, category, root cause, resolution, time to resolution. Reportable to the regulator." },
      { id: "co-4", title: "Train customer-facing staff", detail: "Identification of complaints (vs queries) and the escalation path." },
      { id: "co-5", title: "Quarterly board review", detail: "Volumes, categories, root causes, and remediation actions." },
    ],
    formFields: [
      { id: "ack_sla_days", label: "Acknowledgement SLA (business days)", type: "number", placeholder: "e.g. 5", substepId: "co-1" },
      { id: "final_resp_weeks", label: "Final response SLA (weeks)", type: "number", placeholder: "e.g. 8", substepId: "co-1" },
      { id: "ombudsman_name", label: "Local ombudsman scheme", type: "text", placeholder: "e.g. Financial Ombudsman Service", substepId: "co-2" },
      { id: "complaints_owner", label: "Complaints owner (role/name)", type: "text", substepId: "co-3", required: true },
    ],
    documents: [
      {
        id: "complaints-procedure",
        title: "Complaints-Handling Procedure",
        description: "Procedure aligned to regulator timelines and ombudsman referral.",
        build: (ctx) => [
          { heading: "1. Ownership", body: [`Complaints handling is owned by ${val(ctx, "complaints_owner")}.`] },
          { heading: "2. Service Levels", body: [`Acknowledgement within ${val(ctx, "ack_sla_days", "5")} business days. Final response within ${val(ctx, "final_resp_weeks", "8")} weeks.`] },
          { heading: "3. Onward Referral", body: [`If the customer remains dissatisfied, they may refer the complaint to ${val(ctx, "ombudsman_name")}. This wording appears in every final response letter.`] },
          { heading: "4. Reporting", body: ["Complaints volumes, categories, and root causes are reviewed quarterly by the Board. Reportable returns are filed in line with the regulator's reporting calendar."] },
        ],
      },
    ],
  }),

  wind_down: (req) => ({
    summary: `Produce a credible wind-down plan that ${req.authority} can execute if the firm fails.`,
    outcome: "Board-approved Wind-Down Plan with triggers, timelines, and customer-fund return mechanics.",
    substeps: [
      { id: "wd-1", title: "Define wind-down triggers", detail: "Capital, liquidity, customer-fund integrity, regulatory action. Each with an objective threshold." },
      { id: "wd-2", title: "Map customer-fund return mechanics", detail: "Show step-by-step how every customer's balance is returned. This is the heart of the plan." },
      { id: "wd-3", title: "Estimate wind-down costs and time", detail: "Typically 6–12 months. Funded from a wind-down reserve or unused capital headroom." },
      { id: "wd-4", title: "Stress test the plan", detail: "Run two scenarios: solvent wind-down and insolvent wind-down with regulator-led intervention." },
      { id: "wd-5", title: "Board approval and annual refresh", detail: "Plan must be approved by the board and refreshed annually." },
    ],
    formFields: [
      { id: "trigger_capital", label: "Capital trigger threshold", type: "text", placeholder: "e.g. Own funds < 110% of requirement", substepId: "wd-1" },
      { id: "wind_down_reserve", label: "Wind-down reserve amount", type: "number", placeholder: "e.g. 750000", substepId: "wd-3" },
      { id: "currency", label: "Currency", type: "select", options: ["EUR", "GBP", "USD"], substepId: "wd-3" },
      { id: "estimated_duration_months", label: "Estimated wind-down duration (months)", type: "number", placeholder: "e.g. 9", substepId: "wd-3" },
    ],
    documents: [
      {
        id: "wind-down-plan",
        title: "Wind-Down Plan",
        description: "Triggers, timelines, costs, and customer-fund return mechanics.",
        build: (ctx) => [
          { heading: "1. Triggers", body: [`Wind-down is triggered when capital falls below ${val(ctx, "trigger_capital")} or when customer-fund integrity, liquidity, or regulatory standing is at material risk.`] },
          { heading: "2. Reserve and Duration", body: [`A wind-down reserve of ${val(ctx, "wind_down_reserve")} ${val(ctx, "currency", "EUR")} is held. Estimated execution time: ${val(ctx, "estimated_duration_months", "9")} months.`] },
          { heading: "3. Customer-Fund Return", body: ["Customer balances are returned in full from the safeguarding account on a first-priority basis, in line with the Safeguarding Policy."] },
          { heading: "4. Governance", body: ["The Wind-Down Plan is approved annually by the Board and is held by the Company Secretary as part of the recovery and resolution suite."] },
        ],
      },
    ],
  }),

  outsourcing: (req) => ({
    summary: `Implement an outsourcing register and critical-supplier oversight in line with ${req.authority} expectations.`,
    outcome: "Outsourcing register, critical-supplier dossier, exit plans, and notification log.",
    substeps: [
      { id: "ou-1", title: "Build the outsourcing register", detail: "Every outsourced function: provider, criticality, contract reference, exit plan link." },
      { id: "ou-2", title: "Identify critical / important outsourcing arrangements", detail: "Apply the EBA Guidelines test. Critical = disruption would impair regulatory compliance or service to customers." },
      { id: "ou-3", title: "Pre-notify the regulator for critical outsourcing", detail: "Required in most EU regimes before contract signature." },
      { id: "ou-4", title: "Document the exit plan per critical supplier", detail: "Replacement provider, transition timeline, data extraction, exit cost estimate." },
      { id: "ou-5", title: "Annual supplier review", detail: "KPIs, audit rights exercised, incidents, financial standing." },
    ],
    formFields: [
      { id: "register_owner", label: "Outsourcing register owner (role)", type: "text", substepId: "ou-1", required: true },
      { id: "critical_suppliers", label: "Critical suppliers (one per line)", type: "textarea", placeholder: "Provider — Function — Contract ref", substepId: "ou-2" },
      { id: "exit_plan_template", label: "Exit plan template version", type: "text", placeholder: "e.g. v2.1 (2025-01)", substepId: "ou-4" },
    ],
    documents: [
      {
        id: "outsourcing-policy",
        title: "Outsourcing Policy & Register Summary",
        description: "Outsourcing governance and critical supplier register summary.",
        build: (ctx) => [
          { heading: "1. Ownership", body: [`The outsourcing register is maintained by ${val(ctx, "register_owner")}.`] },
          { heading: "2. Critical Suppliers", body: [val(ctx, "critical_suppliers", "None classified as critical at the date of submission.")] },
          { heading: "3. Exit Planning", body: [`Each critical supplier has a documented exit plan based on template ${val(ctx, "exit_plan_template", "v1.0")}.`] },
        ],
      },
    ],
  }),
};

function defaultBuilder(req: Requirement): Omit<Playbook, "estimatedTime" | "resources"> {
  return {
    summary: `Localise this control to satisfy ${req.authority} (${req.regulation_reference}).`,
    outcome: "A documented control with named owner, evidence trail, and review cadence.",
    substeps: [
      { id: "d-1", title: "Read the source rule end-to-end", detail: `Open ${req.regulation_reference} and extract the obligations, in-scope perimeter, and any deadlines.`, hint: "Highlight verbs ('must', 'shall') — those are the obligations regulators test against." },
      { id: "d-2", title: "Compare with your existing control", detail: "Identify what you already do, what is missing, and where the evidence currently sits." },
      { id: "d-3", title: "Draft or update the policy", detail: "Write the policy/procedure that satisfies the rule. Assign a named owner and a review cadence (typically 12 months)." },
      { id: "d-4", title: "Capture the evidence", detail: "Store the artefact in a folder the regulator could audit (signed PDF, board minutes, test logs)." },
      { id: "d-5", title: "Schedule the next review", detail: "Add to the compliance calendar. Most regulators expect annual review." },
    ],
    formFields: [
      { id: "owner_name", label: "Control owner (name)", type: "text", substepId: "d-3", required: true },
      { id: "owner_role", label: "Control owner (role)", type: "text", substepId: "d-3", required: true },
      { id: "evidence_location", label: "Evidence storage location", type: "text", placeholder: "e.g. SharePoint > Compliance > Evidence", substepId: "d-4" },
      { id: "review_frequency", label: "Review frequency", type: "select", options: ["Quarterly", "Semi-annual", "Annual"], substepId: "d-5" },
    ],
    documents: [
      {
        id: "control-summary",
        title: `${req.title} — Control Summary`,
        description: "One-page control summary for the application pack.",
        build: (ctx) => [
          { heading: "1. Control", body: [ctx.requirement.title, ctx.requirement.description ?? ""] },
          { heading: "2. Source", body: [`${ctx.requirement.regulation_reference} (${ctx.requirement.authority}).`] },
          { heading: "3. Owner", body: [`${val(ctx, "owner_name")} — ${val(ctx, "owner_role")}.`] },
          { heading: "4. Review", body: [`${val(ctx, "review_frequency", "Annual")}. Evidence stored at: ${val(ctx, "evidence_location")}.`] },
        ],
      },
    ],
  };
}

export function getPlaybook(row: AssessmentResultRow): Playbook {
  const req = row.requirement;
  const builder = PLAYBOOKS[String(req.category)] ?? defaultBuilder;
  const base = builder(req);
  const resources: { label: string; href: string }[] = [];
  if (req.source_url) {
    resources.push({ label: `${req.authority} — source rule`, href: req.source_url });
  }
  return {
    ...base,
    estimatedTime: days(req),
    resources,
  };
}

export function taskKey(row: AssessmentResultRow): string {
  return (
    row.requirement.id ??
    `${row.requirement.country}-${row.requirement.regulation_reference}-${row.requirement.title}`
  );
}
