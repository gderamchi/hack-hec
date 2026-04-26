import { PSD3_PSR_REQUIREMENTS } from "@/data/psd3-psr-requirements";
import {
  getCompleeExpansionRequirements,
  isCrossBorderProfile
} from "@/lib/complee-requirement-mapper";
import type {
  CompanyProfile,
  Requirement,
  ServiceFlow,
  UploadedDocument
} from "@/lib/types";

type ServiceSignal = {
  service: ServiceFlow;
  patterns: RegExp[];
};

const SERVICE_SIGNALS: ServiceSignal[] = [
  {
    service: "Instant credit transfers",
    patterns: [/\binstant (credit )?transfer(s)?\b/i, /\binstant payment(s)?\b/i]
  },
  {
    service: "Wallet transfers",
    patterns: [/\bwallet(s)?\b/i, /\bhold value\b/i, /\bholding .*balance(s)?\b/i]
  },
  {
    service: "Card payments",
    patterns: [/\bcard payment(s)?\b/i, /\bchargeback(s)?\b/i, /\binterchange\b/i]
  },
  {
    service: "Open banking account access",
    patterns: [/\bopen banking\b/i, /\baccount information\b/i, /\baisp\b/i]
  },
  {
    service: "Payment initiation",
    patterns: [/\bpayment initiation\b/i, /\bpisp\b/i, /\binitiat(e|ion).*payment\b/i]
  },
  {
    service: "Merchant acquiring",
    patterns: [/\bmerchant acquiring\b/i, /\bacquiring\b/i, /\bmerchant settlement\b/i]
  },
  {
    service: "Electronic money issuance",
    patterns: [/\belectronic money\b/i, /\be-money\b/i, /\bemi\b/i]
  },
  {
    service: "Multi-currency transfers",
    patterns: [/\bmulti-currency\b/i, /\bcurrency conversion\b/i, /\bfx\b/i]
  },
  {
    service: "Cash withdrawal support",
    patterns: [/\bcash withdrawal\b/i, /\batm\b/i, /\bcash[- ]out\b/i]
  },
  {
    service: "Fraud monitoring",
    patterns: [/\bfraud monitoring\b/i, /\bfraud tooling\b/i, /\btransaction monitoring\b/i]
  },
  {
    service: "Strong customer authentication",
    patterns: [/\bstrong customer authentication\b/i, /\bsca\b/i, /\bmfa\b/i]
  },
  {
    service: "Payment account provision to payment institutions",
    patterns: [/\bpayment account access\b/i, /\baccount provision\b/i]
  },
  {
    service: "Mobile wallet front-end services",
    patterns: [/\bmobile wallet\b/i, /\bfront-end service\b/i, /\bfrand\b/i]
  },
  {
    service: "Financial services advertising",
    patterns: [/\bfinancial services advertising\b/i, /\badvertiser authori[sz]ation\b/i]
  },
  {
    service: "Online platform fraud-content handling",
    patterns: [/\bfraudulent content\b/i, /\btakedown\b/i, /\bonline platform\b/i]
  }
];

export function getRelevantRequirements(
  companyProfile: CompanyProfile
): Requirement[] {
  const psd3PsrRequirements = PSD3_PSR_REQUIREMENTS.filter((requirement) =>
    isRelevantRequirement(requirement, companyProfile)
  );

  if (!isCrossBorderProfile(companyProfile)) {
    return psd3PsrRequirements;
  }

  return uniqueRequirements([
    ...getCompleeExpansionRequirements(companyProfile),
    ...psd3PsrRequirements
  ]);
}

export function isRelevantRequirement(
  requirement: Requirement,
  companyProfile: CompanyProfile
): boolean {
  if (requirement.serviceTriggers?.length) {
    return requirement.serviceTriggers.some((service) =>
      companyProfile.services.includes(service)
    );
  }

  return requirement.relevantFor.includes(companyProfile.companyType);
}

export function inferServicesFromDocuments(
  documents: UploadedDocument[]
): ServiceFlow[] {
  const text = documents
    .map((document) => `${document.name}\n${document.content}`)
    .join("\n\n");

  return SERVICE_SIGNALS.filter((signal) =>
    signal.patterns.some((pattern) => pattern.test(text))
  ).map((signal) => signal.service);
}

export function buildScopeWarnings(
  companyProfile: CompanyProfile,
  documents: UploadedDocument[]
): string[] {
  const inferredServices = inferServicesFromDocuments(documents);
  const selected = new Set(companyProfile.services);
  const unselectedDocumentServices = inferredServices.filter(
    (service) => !selected.has(service)
  );

  const warnings: string[] = [];

  if (unselectedDocumentServices.length > 0) {
    warnings.push(
      `Uploaded documents mention service(s) outside the selected analysis scope: ${unselectedDocumentServices.join(", ")}. These are not used as covered evidence unless selected.`
    );
  }

  if (
    isCrossBorderProfile(companyProfile) &&
    companyProfile.homeCountry === companyProfile.targetCountry
  ) {
    warnings.push(
      "Cross-border mode is selected but home and target countries match; expansion-specific requirements may be limited."
    );
  }

  return warnings;
}

function uniqueRequirements(requirements: Requirement[]): Requirement[] {
  const seen = new Set<string>();

  return requirements.filter((requirement) => {
    if (seen.has(requirement.id)) {
      return false;
    }

    seen.add(requirement.id);
    return true;
  });
}
