// Complee — Guided execution steps for roadmap tasks.
// Generates contextual, actionable substeps per requirement based on its
// category, status, and the target authority. No backend, no AI calls —
// deterministic templates that read like a senior consultant's checklist.

import type { AssessmentResultRow, Requirement } from "@/data/requirements";

export interface GuideSubstep {
  id: string;
  title: string;
  detail: string;
  hint?: string;
}

export interface GuideTemplate {
  summary: string;
  outcome: string;
  estimatedTime: string;
  substeps: GuideSubstep[];
  resources: { label: string; href: string }[];
}

function ucfirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const CATEGORY_PLAYBOOK: Record<
  string,
  (req: Requirement) => Omit<GuideTemplate, "estimatedTime" | "resources">
> = {
  capital_requirements: (req) => ({
    summary: `Demonstrate that ${req.applies_to.join("/")} capital meets the ${req.authority} threshold and is held in eligible instruments.`,
    outcome: "A capital adequacy memo, signed by the CFO, plus evidence of segregated funds.",
    substeps: [
      {
        id: "cap-1",
        title: "Confirm the exact threshold and instrument eligibility",
        detail: `Open the source rule (${req.regulation_reference}) and record the threshold, eligible instruments, and any phase-in dates.`,
        hint: "Capital must usually be paid-up share capital or retained earnings — not pledged or encumbered.",
      },
      {
        id: "cap-2",
        title: "Map your current capital structure",
        detail: "Pull the latest management accounts and identify which line items qualify under the rule.",
      },
      {
        id: "cap-3",
        title: "Close any shortfall",
        detail: "If the qualifying capital is below threshold, schedule a capital injection or retained-earnings transfer before the application date.",
      },
      {
        id: "cap-4",
        title: "Produce the CFO attestation memo",
        detail: `Write a one-page memo: threshold, current qualifying capital, evidence references, signed and dated by the CFO. This is the artefact ${req.authority} expects in the application pack.`,
      },
    ],
  }),

  safeguarding: (req) => ({
    summary: `Stand up a safeguarding control set that satisfies ${req.authority}: segregated accounts, daily reconciliation, and an annual audit.`,
    outcome: "Updated safeguarding policy, daily reconciliation runbook, and a signed audit engagement letter.",
    substeps: [
      {
        id: "sg-1",
        title: "Open or confirm a dedicated safeguarding account",
        detail: "The account must be in your name, ring-fenced, and held with an authorised credit institution. Document the IBAN and the credit institution's authorisation reference.",
      },
      {
        id: "sg-2",
        title: "Implement daily reconciliation",
        detail: "Reconcile customer balances against the safeguarding account at end of each business day. Capture variance, root cause, and resolution in a log.",
        hint: "Variance > 0.1% should trigger an immediate escalation to the MLRO and Head of Finance.",
      },
      {
        id: "sg-3",
        title: "Update the safeguarding policy document",
        detail: "Cover: in-scope funds, segregation method, reconciliation frequency, escalation matrix, and breach notification protocol.",
      },
      {
        id: "sg-4",
        title: "Engage an external safeguarding auditor",
        detail: `${req.authority} expects an annual audit by an independent firm. Get the engagement letter signed before the application is submitted.`,
      },
    ],
  }),

  aml_kyc: (req) => ({
    summary: `Localise your AML/KYC framework for ${req.country} and appoint a locally-resident MLRO if required.`,
    outcome: "Localised AML policy, MLRO appointment letter, and an updated risk assessment for the target market.",
    substeps: [
      {
        id: "aml-1",
        title: "Run a target-market risk assessment",
        detail: "Identify customer, geography, product, and channel risks specific to the target country. Reuse your EU template, but refresh the typologies.",
      },
      {
        id: "aml-2",
        title: "Confirm MLRO and Nominated Officer arrangements",
        detail: `Verify whether ${req.authority} requires a locally-resident MLRO. If yes, prepare the appointment letter and SMF/Fit & Proper documentation.`,
        hint: "In the UK this is SMF17. In Germany BaFin expects a Geldwäschebeauftragter resident in the EU.",
      },
      {
        id: "aml-3",
        title: "Localise screening lists and SAR routing",
        detail: "Add the local FIU as the primary SAR recipient. Update sanctions lists to include the local consolidated list (e.g. OFSI for the UK).",
      },
      {
        id: "aml-4",
        title: "Refresh staff training",
        detail: "All customer-facing and operations staff need annual AML training that references the target jurisdiction's rules and red flags.",
      },
    ],
  }),

  fraud_prevention: (req) => ({
    summary: `Confirm Strong Customer Authentication and transaction-monitoring controls match ${req.authority} expectations.`,
    outcome: "SCA configuration record, exemption policy, and a fraud KPI dashboard for the target market.",
    substeps: [
      {
        id: "fr-1",
        title: "Audit your current SCA implementation",
        detail: "Document which factors (knowledge / possession / inherence) are used and the exemption logic (low value, TRA, MIT).",
      },
      {
        id: "fr-2",
        title: "Tune fraud rules for the target market",
        detail: "Local fraud typologies differ — APP scams dominate in the UK, SEPA Inst fraud rises in DE/NL. Add at least three target-market rules.",
      },
      {
        id: "fr-3",
        title: "Set the fraud KPI thresholds",
        detail: "Define the fraud rate threshold per payment instrument and the escalation path when breached. Include them in the board pack.",
      },
    ],
  }),

  governance: (req) => ({
    summary: `Build the governance pack ${req.authority} expects: board composition, fitness and propriety, and a regulatory business plan.`,
    outcome: "Authorisation pack: board pack, F&P questionnaires, org chart, and a 3-year business plan.",
    substeps: [
      {
        id: "gov-1",
        title: "Confirm board composition meets local rules",
        detail: `${req.authority} typically requires at least two executive directors (the "four-eyes" principle) and a clear separation between board and senior management.`,
      },
      {
        id: "gov-2",
        title: "Collect Fit & Proper documentation",
        detail: "For every director and qualifying shareholder: CV, criminal record check, regulatory references, and a signed F&P questionnaire.",
        hint: "Criminal record checks expire — most regulators want them <3 months old at submission.",
      },
      {
        id: "gov-3",
        title: "Draft the regulatory business plan",
        detail: "3-year financial projections, target customer segments, product roadmap, and a wind-down section. This is the single most-scrutinised document.",
      },
      {
        id: "gov-4",
        title: "Schedule the pre-application meeting",
        detail: `Most regulators (including ${req.authority}) offer a pre-application meeting. Book it before you submit — it surfaces blockers cheaply.`,
      },
    ],
  }),

  consumer_protection: (req) => ({
    summary: `Implement the local consumer-outcomes framework and prepare the annual board attestation.`,
    outcome: "Board-approved consumer outcomes policy and the first annual attestation draft.",
    substeps: [
      {
        id: "cp-1",
        title: "Map your customer journey to the four outcomes",
        detail: "Products & services, price & value, consumer understanding, consumer support. Identify gaps for each.",
      },
      {
        id: "cp-2",
        title: "Build the outcomes MI pack",
        detail: "Each outcome needs measurable indicators (e.g. complaint root cause, vulnerable customer flags, fee transparency tests).",
      },
      {
        id: "cp-3",
        title: "Draft the annual board attestation",
        detail: "The board must attest annually that the firm is delivering good outcomes. Have the first draft ready before authorisation.",
      },
    ],
  }),

  operational_resilience: (req) => ({
    summary: `Map important business services, set impact tolerances, and run a severe-but-plausible scenario test.`,
    outcome: "Important business service register, impact tolerance log, and a scenario test report.",
    substeps: [
      {
        id: "or-1",
        title: "Identify important business services (IBS)",
        detail: "Anything whose disruption would cause intolerable customer harm or threaten market integrity. Usually 3-6 services for an EMI/PI.",
      },
      {
        id: "or-2",
        title: "Set impact tolerances per IBS",
        detail: "Maximum tolerable disruption (in hours or transactions) for each IBS. Approved by the board.",
      },
      {
        id: "or-3",
        title: "Run a scenario test and document lessons",
        detail: "Severe-but-plausible scenarios: cloud outage, third-party processor failure, ransomware. Record what broke and the remediation backlog.",
      },
    ],
  }),

  reporting: (req) => ({
    summary: `Configure regulatory reporting feeds for ${req.authority} and confirm submission cadence.`,
    outcome: "Reporting calendar, data lineage doc, and a successful test submission.",
    substeps: [
      {
        id: "rp-1",
        title: "Build the reporting calendar",
        detail: "List every return, its frequency, the regulatory deadline, and the internal sign-off owner.",
      },
      {
        id: "rp-2",
        title: "Document data lineage for each return",
        detail: "Source system → transformation → submission file. Auditors will trace every figure back to a system of record.",
      },
      {
        id: "rp-3",
        title: "Run a dry-run submission",
        detail: "Most regulators offer a test environment. Submit a dry run before go-live to flush out schema errors.",
      },
    ],
  }),
};

function defaultPlaybook(
  req: Requirement,
): Omit<GuideTemplate, "estimatedTime" | "resources"> {
  return {
    summary: `Localise this control to satisfy ${req.authority} (${req.regulation_reference}).`,
    outcome: "A documented control with named owner, evidence trail, and review cadence.",
    substeps: [
      {
        id: "d-1",
        title: "Read the source rule end-to-end",
        detail: `Open ${req.regulation_reference} and extract the obligations, in-scope perimeter, and any deadlines.`,
        hint: "Highlight verbs ('must', 'shall') — those are the obligations regulators test against.",
      },
      {
        id: "d-2",
        title: "Compare with your existing control",
        detail: "Identify what you already do, what is missing, and where the evidence currently sits.",
      },
      {
        id: "d-3",
        title: "Draft or update the policy",
        detail: "Write the policy/procedure that satisfies the rule. Assign a named owner and a review cadence (typically 12 months).",
      },
      {
        id: "d-4",
        title: "Capture the evidence",
        detail: "Store the artefact in a folder the regulator could audit (signed PDF, board minutes, test logs).",
      },
    ],
  };
}

export function buildGuide(row: AssessmentResultRow): GuideTemplate {
  const req = row.requirement;
  const builder =
    CATEGORY_PLAYBOOK[String(req.category)] ?? defaultPlaybook;
  const base = builder(req);

  // Adjust opening line for status.
  const statusLead =
    row.status === "missing"
      ? `This is a NEW control for ${req.country}. ${base.summary}`
      : row.status === "partial"
        ? `You already have related controls — they need ${ucfirst(req.country)}-specific localisation. ${base.summary}`
        : base.summary;

  const days = req.typical_effort_days || 5;
  const estimatedTime =
    days <= 1 ? "Less than a day" : days <= 10 ? `${days} working days` : `~${Math.round(days / 5)} weeks`;

  const resources: { label: string; href: string }[] = [];
  if (req.source_url) {
    resources.push({ label: `${req.authority} — source rule`, href: req.source_url });
  }

  return {
    summary: statusLead,
    outcome: base.outcome,
    estimatedTime,
    substeps: base.substeps,
    resources,
  };
}

export function taskKey(row: AssessmentResultRow): string {
  return (
    row.requirement.id ??
    `${row.requirement.country}-${row.requirement.regulation_reference}-${row.requirement.title}`
  );
}
