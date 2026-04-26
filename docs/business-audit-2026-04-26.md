# CompliancePilot - Business Audit

Date: 2026-04-26

## Executive verdict

CompliancePilot has a real market reason to exist, but the current positioning is too broad and too easy to dismiss as an "AI compliance checklist for PSD3/PSR". The stronger company is not "PSD3/PSR readiness in minutes"; it is an evidence operating layer for lean EU payment institutions that need to prove, not merely describe, readiness for fraud, SCA, open banking, instant payments and customer-protection controls.

My blunt recommendation: keep the PSD3/PSR wedge, but narrow the buyer and the promise. Sell "audit-ready evidence mapping and remediation tracking for payment compliance teams" rather than "regulatory readiness in minutes". The first sounds credible to a compliance leader; the second sounds like a hackathon slogan and raises legal-risk alarms.

## What is actually built

The repo currently describes and implements a Next.js workspace that:

- captures company type, country and payment service scope;
- requires evidence documents before analysis;
- extracts text from PDF/text/Markdown uploads;
- maps uploaded evidence against a hard-coded PSD3/PSR requirement base;
- optionally uses OpenAI, but always applies deterministic evidence gating;
- outputs a readiness matrix, gaps, roadmap, report preview and CSV export;
- optionally persists results in Supabase.

This is stronger than a generic chatbot because the final assessment is constrained by a local requirement base and a deterministic gate. The evidence gate is the most defensible product asset: it prevents policy-only text, demo placeholders and expected-evidence checklists from being overstated as full evidence.

The weak spot is that the current product is still mostly a point-in-time assessment. It does not yet prove continuous readiness, ownership, audit trail evolution, control evidence freshness, integrations with source systems, reviewer sign-off, or regulatory-content governance.

## Regulatory reality

The "why now" is real:

- PSD3/PSR reached provisional political agreement on 2025-11-27. The Council says the package creates a new Payment Services Regulation and amends PSD2, with a focus on fraud, transparency and consumer protection.
- The European Commission payment-services timeline lists the PSD2 review political agreement on 2025-11-27, instant-payment obligations that started in 2025, and a further phase in 2027 for PSPs outside the euro area.
- The Parliament legislative train says the files are close to adoption, not fully final. That matters: final text, Level 2/3 standards and national supervisory expectations can still shift.
- Instant payments and Verification of Payee are already pushing implementation work. The Commission timeline says euro-area PSPs had to receive instant payments and align fees from 2025-01-09, and send instant payments plus verify the intended beneficiary from 2025-10-09. Non-euro area PSPs have a 2027 phase.
- Fraud pressure is measurable. The 2025 EBA-ECB report says EEA payment fraud value increased from EUR 3.5bn in 2023 to EUR 4.2bn in 2024, while the annual fraud rate stayed around 0.002% of transaction value. For credit transfers, users bore about 85% of total fraud losses in 2024, mainly due to scams where users initiated fraudulent transactions.
- EBA has explicitly warned that SCA reduced credential-theft fraud but fraudsters adapted toward social engineering. That supports the product's focus on evidence around warnings, liability handling, monitoring and human support.
- DORA already applies from 2025-01-17 to many financial entities including payment institutions and e-money institutions. This means CompliancePilot itself will be assessed by buyers through an operational-resilience/vendor-risk lens.
- The EU AI Act is not peripheral. If the product influences material decisions, buyers will ask about logging, human oversight, documentation, robustness, transparency and AI governance.

Conclusion: the regulatory catalyst is valid, but the product must be positioned as a controlled decision-support system, not an automated legal conclusion.

## Market critique

The broad RegTech market is big, but that is almost irrelevant for the first wedge. Generic market-size slides are weak here because the buyer does not buy "RegTech"; they buy reduced remediation effort, audit preparation, lower external counsel dependence, better board reporting, or lower fraud-liability exposure.

The addressable first market is narrower:

- EU/EEA payment institutions, e-money institutions, neobanks, wallet providers and open banking providers;
- lean compliance teams that do not have large GRC implementations;
- firms preparing PSD3/PSR, instant payments/VOP and fraud-control changes;
- firms under supervisory pressure after authorisation, passporting, governance, AML/CFT or internal-control gaps.

The EBA central register confirms a searchable/downloadable register of authorised or registered payment and e-money institutions across the EU/EEA. That is a practical outbound list. A third-party mirror of EBA register data claimed roughly 399 payment institutions, 399 EMIs? Actually the public mirror's figures are not official enough to anchor a pitch. Use the EBA register as the source of truth and build a target-account list directly from it.

The painful truth: a one-off PSD3/PSR gap assessment is not a great SaaS category. Many firms will pay lawyers or consultants once, then move on. A recurring business needs either:

1. continuous evidence collection and control-owner workflow;
2. regulatory change monitoring and obligation mapping;
3. auditor/supervisor-ready packs with timestamps, reviews and approvals;
4. integration into Jira, Confluence, SharePoint, Google Drive, Slack/Teams and GRC tools;
5. recurring control testing and evidence freshness alerts.

Without one of those, the product risks becoming a demo people like but do not renew.

## Competitive landscape

You are squeezed from three sides:

- Horizontal GRC/regulatory-change platforms: CUBE, Compliance.ai/Archer, Wolters Kluwer, Thomson Reuters, MetricStream and similar tools already sell regulatory intelligence, workflow, impact analysis and policy/control mapping.
- Specialist compliance/fraud vendors: ComplyAdvantage, NICE Actimize, INFORM/RiskShield and others own AML, sanctions, screening, transaction monitoring and case management workflows.
- Payment-specific implementation vendors: SurePay, Finologee and other VOP/confirmation-of-payee providers solve concrete obligations with APIs, scheme readiness and production integrations.

CompliancePilot cannot beat incumbents by claiming broader coverage. It can compete by being much narrower, faster and evidence-first:

- "Bring your evidence, we show exactly which PSD3/PSR controls are unsupported."
- "We produce a remediation board that product, fraud, engineering and compliance can actually execute."
- "We separate legal-policy intent from operational evidence."

That last point is the defensible wedge. Do not try to be CUBE. Do not try to be SurePay. Be the evidence and remediation layer between regulatory interpretation, implementation tools and internal proof.

## Positioning challenge

Current positioning:

> PSD3/PSR readiness in minutes, not weeks.

Problem: this is attractive for a jury, but dangerous for a buyer. It implies speed over diligence and may trigger "this is not serious legal/compliance software".

Better:

> Audit-ready PSD3/PSR evidence mapping for payment compliance teams.

Alternative:

> Turn payment-control evidence into a PSD3/PSR remediation plan your product, fraud and compliance owners can sign off.

The word "readiness" is acceptable. The word "compliance" needs caution. Avoid "certify", "guarantee", "be compliant", "legal advice", "automatic compliance". The repo already includes this guardrail; it should be more central in the GTM.

## Ideal customer profile

Best first ICP:

- licensed or soon-to-be-licensed EU/EEA payment institution or e-money institution;
- 50-500 employees;
- compliance team of 2-10 people;
- product/engineering teams actively changing payment flows;
- multiple evidence stores, no mature GRC workflow, and a PSD3/PSR/instant-payments board pack due in the next 6-12 months;
- willingness to use a specialist tool but not enough budget/time for a heavy enterprise GRC rollout.

Avoid as first ICP:

- tier-1 banks with entrenched GRC procurement and long vendor-risk cycles;
- very early fintechs that are not yet licensed and need counsel more than tooling;
- companies that only want legal interpretation, not evidence operations;
- non-EU firms without EU payment obligations.

## Buyer, user and budget

Economic buyer:

- Chief Compliance Officer, Head of Regulatory Compliance, Head of Risk, or COO in smaller fintechs.

Daily users:

- compliance manager, product owner, fraud ops lead, security lead, support ops lead.

Influencers/blockers:

- internal legal, DPO, CISO, CTO, external counsel, internal audit.

Budget source:

- compliance transformation, audit readiness, regulatory change, external advisory reduction, product compliance backlog, possibly fraud-loss reduction.

Budget logic:

- A tool at EUR 500-2,000/month may be plausible for small/medium regulated fintechs if it replaces manual spreadsheet work and some consultant hours.
- Enterprise pricing only becomes plausible after integrations, SSO/RBAC, audit trails, vendor-security pack, data residency, review workflows and custom requirement packs.

## Business model

Recommended phased model:

1. Paid pilot: EUR 3k-10k for a 4-6 week PSD3/PSR evidence-mapping sprint, including setup, evidence import, first matrix and remediation board.
2. SaaS subscription: EUR 800-2,500/month for small/medium PSPs, based on entities, jurisdictions, users and evidence volume.
3. Enterprise tier: EUR 25k-100k/year for SSO, integrations, custom controls, multi-entity, private deployment/data residency and audit pack generation.
4. Partner channel: compliance consultancies and law firms use it to produce better evidence packs faster. This may be the fastest early revenue channel because trust is borrowed from advisors.

Do not start with usage-based pricing on AI tokens. The value is not token usage; it is audit readiness, time saved, and reduced remediation ambiguity.

## User journey critique

Current journey is good for a demo:

1. choose scope;
2. upload documents;
3. block missing required evidence;
4. run analysis;
5. inspect matrix;
6. export report/CSV.

For a real buyer, the missing journey is:

- invite control owners;
- assign each missing evidence item;
- connect sources of evidence;
- record reviewer comments and sign-off;
- track evidence expiry/freshness;
- compare runs over time;
- export an audit pack with immutable timestamps;
- show regulator/legal review status;
- prove which requirement version was used;
- manage exceptions and risk acceptance.

The current product is a strong "first assessment". It is not yet a system of record.

## Product gaps that matter commercially

Critical gaps:

- No versioned regulatory corpus. Requirement data is code-maintained and must be governed when final PSD3/PSR texts change.
- No legal expert review workflow. A compliance buyer will ask who validates the obligation mapping.
- No evidence provenance beyond uploaded file/excerpt. Need document hash, timestamp, uploader, source system, extraction confidence and reviewer decision.
- No OCR/scanned PDF support. In compliance reality, many packs are scans, screenshots, exports or mixed PDFs.
- No collaboration/RBAC. A board/report product needs roles, comments, owners, approvals and history.
- No integrations. Evidence lives in SharePoint, Confluence, Jira, Google Drive, GitHub, ticketing, monitoring, case-management and GRC systems.
- No privacy/security package. Buyers will upload sensitive policies, controls, incident records, fraud cases and possibly personal data.
- No country-specific overlays. PSD3 is a directive; PSR is directly applicable, but supervisory practice and local implementation still matter.
- No continuous monitoring. The value drops sharply after the first report if nothing reminds teams what changed.

## Regulatory risk for CompliancePilot itself

The product must behave like regulated-sector software even if it is not itself a regulated PSP:

- Data protection: uploaded evidence may contain personal data, fraud cases, support tickets and security incidents. Need retention controls, deletion, DPA, subprocessor list, encryption, access logs and clear AI-processing policy.
- AI governance: keep the product as decision support with human review. Log prompts, model/version, output schema validation, evidence gate decisions and reviewer override.
- Professional liability: avoid legal advice claims. Use disclaimers, but also use product design that forces human review and explicit sign-off.
- Vendor risk/DORA: PSP buyers will treat it as an ICT third-party service. Have uptime, incident response, backup, access control, penetration-test roadmap, change management and exit/export plans.
- Confidentiality: for external LLM use, offer a no-AI/local-deterministic mode and a private-processing option.

## Strategic options

Option A - PSD3/PSR assessment tool:

- Fastest demo.
- Weakest recurring revenue.
- Easy to copy.

Option B - Evidence operations for payment compliance:

- Stronger recurring product.
- Needs workflow, integrations and audit trails.
- Best match with current evidence-gate asset.

Option C - Regulatory intelligence platform:

- Huge market.
- Very hard against CUBE/Compliance.ai/Wolters Kluwer.
- Requires expert legal content operations.

Option D - Payment fraud/control implementation assistant:

- Strong urgency due to fraud liability and VOP.
- But competes closer to fraud, VOP and transaction-monitoring vendors.

Recommendation: choose Option B, with PSD3/PSR as the initial regulatory pack.

## MVP repositioning

Build the next MVP around this promise:

> Upload your PSD3/PSR evidence pack. CompliancePilot maps proof to obligations, separates policy from operational evidence, assigns gaps to owners and exports an audit-ready remediation pack.

Minimum credible features:

- requirement pack versioning and source links;
- evidence document hashing and extraction logs;
- owner assignment and due dates;
- reviewer approval / reject / needs more evidence;
- run-to-run comparison;
- exportable audit pack with source excerpts and review history;
- admin roles and data-retention controls;
- no-AI mode plus AI-assisted mode clearly separated.

Nice-to-have later:

- SharePoint/Google Drive/Confluence/Jira connectors;
- country overlays;
- consultant/law-firm workspace;
- VOP/SCA/fraud-control deep packs;
- supervisor-ready templates by jurisdiction.

## Go-to-market

Do not start with a generic landing page to "European payment fintechs". Start with founder-led outbound to a precise list:

- EU/EEA PIs and EMIs from the EBA central register;
- PSPs with instant-payment/VOP projects;
- fintechs hiring compliance/regulatory roles around PSD3/PSR, DORA or fraud;
- consultancies and boutique law firms advising payment firms.

Best first offer:

- "Send us 5-10 evidence docs. In 48 hours we return a PSD3/PSR evidence matrix, top 10 unsupported controls, and a remediation board. You keep the report; if useful, we convert it into a live workspace."

This is service-assisted SaaS. That is not a weakness at this stage; it is how you learn the real workflows and earn trust.

## Jury / pitch framing

Strong framing:

- "PSD3/PSR is moving from legal text to operational proof."
- "The expensive part is not reading the rule; it is proving which controls exist and what is still unsupported."
- "CompliancePilot separates policy language from real operational evidence and turns gaps into work for product, fraud, engineering and compliance."

Avoid:

- "We make companies compliant in minutes."
- "AI replaces lawyers/compliance."
- "This is a universal compliance platform."
- "Our TAM is the whole RegTech market."

## Kill criteria

Stop or pivot if:

- 10 target compliance leaders agree the report is useful but none would pay for recurring workflow;
- buyers insist external counsel must own the mapping and will not trust a software-first obligation library;
- evidence collection remains entirely manual and users do not want to maintain it after first assessment;
- security/vendor-risk review blocks pilots because sensitive evidence cannot be uploaded;
- competitors or consultancies offer the same deliverable bundled with advisory for a price the buyer prefers.

## What I would change now

1. Rename the core category from "readiness workspace" to "evidence mapping and remediation workspace".
2. Make the first screen less magical: "Map evidence to PSD3/PSR obligations" beats "readiness in minutes".
3. Add a reviewer/sign-off concept to the product narrative.
4. Add "requirement pack version" everywhere in diagnostics/report.
5. Add "AI-assisted, human-approved" language.
6. Build an audit-pack export before building more visual polish.
7. Add a partner motion for payment compliance consultancies.
8. Add a no-AI confidential mode as a selling point, not only a fallback.
9. Create 3 demo personas: compliance lead, fraud ops lead, product owner.
10. Build one deep vertical pack first: payee verification / APP fraud / SCA / suspicious transaction freeze.

## Sources used

- Council of the EU, provisional PSD3/PSR agreement, 2025-11-27: https://www.consilium.europa.eu/en/press/press-releases/2025/11/27/payment-services-council-and-parliament-agree-to-step-up-the-fight-against-fraud-and-increase-transparency/
- European Commission payment-services timeline: https://finance.ec.europa.eu/consumer-finance-and-payments/payment-services/payment-services_en
- European Parliament legislative train, Payment Services Regulation, 02/2026: https://www.europarl.europa.eu/legislative-train/carriage/revision-of-eu-rules-on-payment-services/report?sid=10001
- ECB/EBA 2025 payment fraud report press release: https://www.ecb.europa.eu/press/pr/date/2025/html/ecb.pr251215~e133d9d683.en.html
- EBA central register of payment and e-money institutions: https://www.eba.europa.eu/risk-and-data-analysis/data/registers/payment-institutions-register
- EBA peer review follow-up on PI/EMI authorisation: https://www.eba.europa.eu/publications-and-media/press-releases/eba-publishes-follow-peer-review-authorisation-payment-institutions-and-electronic-money
- EBA opinion on new types of payment fraud, 2024-04-29: https://www.eba.europa.eu/publications-and-media/press-releases/eba-has-identified-new-types-payment-fraud-and-proposes-measures-mitigate-underlying-risks-and
- EBA DORA / ICT risk update, 2025-02-11: https://www.eba.europa.eu/publications-and-media/press-releases/eba-amends-its-guidelines-ict-and-security-risk-management-measures-context-dora-application
- European Commission AI Act overview and timeline: https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
- EDPB opinion on AI models and GDPR: https://www.edpb.europa.eu/news/news/2024/edpb-opinion-ai-models-gdpr-principles-support-responsible-ai_en
- CUBE regulatory intelligence positioning: https://cube.global/resources/blog/how-automated-regulatory-intelligence-is-transforming-compliance-in-financial-services
- Compliance.ai / Archer RegTech positioning: https://www.compliance.ai/regtech/
- Finologee Verification of Payee / PSD3 positioning: https://finologee.com/verification-of-payee/
- SurePay Verification of Payee EU overview: https://www.surepay.eu/verification-of-payee-in-the-eu/
- Research and Markets broad RegTech estimate via GlobeNewswire. Directional only, not a GTM anchor: https://www.globenewswire.com/news-release/2025/11/18/3189777/0/en/RegTech-Industry-Research-Report-2025-2035-115-5-Bn-Market-Accelerates-as-Financial-Sector-Digital-Transformation-and-Rising-Regulatory-Demands-Drive-Adoption-of-AI-Enabled-Complia.html
