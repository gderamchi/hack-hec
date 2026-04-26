import type { OperatingModel, TeamName } from "@/lib/monitor-types";
import {
  getTargetCountry,
  isCrossBorderProfile
} from "@/lib/complee-requirement-mapper";
import type { CompanyProfile, CompanyType, ServiceFlow } from "@/lib/types";

const COMPANY_TYPE_MAP: Partial<Record<CompanyType, string>> = {
  "Electronic Money Institution": "Electronic Money Institution",
  "Open Banking Provider": "Open Banking Provider",
  "Payment Institution": "Payment Institution",
  Neobank: "Neobank",
  "Payment Orchestrator": "Payment Orchestrator",
  "Technical Service Provider": "Technical Service Provider",
  "Online Platform": "Online Platform",
  "Crypto-asset Service Provider": "Crypto-asset Service Provider"
};

const SERVICE_MAP: Partial<Record<ServiceFlow, string[]>> = {
  "Instant credit transfers": ["Instant credit transfers"],
  "Wallet transfers": ["Wallet transfers"],
  "Card payments": ["Card payments"],
  "Open banking account access": ["Open banking account access"],
  "Payment initiation": ["Payment initiation"],
  "Merchant acquiring": ["Merchant acquiring"],
  "Electronic money issuance": ["Electronic money issuance"],
  "Multi-currency transfers": ["Multi-currency transfers"],
  "Cash withdrawal support": ["Cash withdrawal support"],
  "Fraud monitoring": ["Fraud monitoring"],
  "Strong customer authentication": ["Strong customer authentication"],
  "Payment account provision to payment institutions": [
    "Payment account provision to payment institutions"
  ],
  "Mobile wallet front-end services": ["Mobile wallet front-end services"]
};

export function mapCompanyProfileToOperatingModel(
  profile: CompanyProfile
): OperatingModel {
  const crossBorder = isCrossBorderProfile(profile);
  const country = crossBorder ? getTargetCountry(profile) : profile.country;
  const services = profile.services.flatMap(
    (service) => SERVICE_MAP[service] ?? []
  );

  return {
    companyName: profile.companyName.trim(),
    companyType: COMPANY_TYPE_MAP[profile.companyType] ?? "Payment Institution",
    country,
    services: [...new Set(services)],
    techStack: defaultTechStackForProfile(profile),
    teams: defaultTeamsForProfile(profile),
    internalAssets: defaultInternalAssetsForProfile(profile),
    vendors: ["Cloud infrastructure provider", "Core banking provider"]
  };
}

export function activeRegulationsForProfile(profile: CompanyProfile): string[] {
  const regulations = new Set(["DORA", "PSD3/PSR"]);

  if (isCrossBorderProfile(profile) && getTargetCountry(profile) === "United Kingdom") {
    regulations.add("FCA Consumer Duty");
  }

  if (
    profile.services.includes("AI-based fraud detection" as ServiceFlow) ||
    profile.services.includes("AI-based credit scoring" as ServiceFlow)
  ) {
    regulations.add("EU AI Act");
  }

  return [...regulations];
}

function defaultTeamsForProfile(profile: CompanyProfile): TeamName[] {
  const teams = new Set<TeamName>(["Compliance", "Legal", "Operations"]);

  if (
    profile.services.some((service) =>
      [
        "Payment initiation",
        "Open banking account access",
        "Strong customer authentication",
        "Mobile wallet front-end services"
      ].includes(service)
    )
  ) {
    teams.add("Engineering");
    teams.add("Product");
  }

  if (
    profile.services.some((service) =>
      ["Fraud monitoring", "Instant credit transfers", "Card payments"].includes(service)
    )
  ) {
    teams.add("Fraud & Financial Crime");
    teams.add("Risk");
  }

  if (
    profile.services.some((service) =>
      [
        "Electronic money issuance",
        "Wallet transfers",
        "Multi-currency transfers",
        "Cash withdrawal support"
      ].includes(service)
    )
  ) {
    teams.add("Finance & Treasury");
  }

  return [...teams];
}

function defaultTechStackForProfile(profile: CompanyProfile): string[] {
  const stack = new Set(["Cloud platform", "Transaction monitoring"]);

  if (
    profile.services.some((service) =>
      ["Payment initiation", "Open banking account access"].includes(service)
    )
  ) {
    stack.add("Open banking API gateway");
  }

  if (profile.services.includes("Strong customer authentication")) {
    stack.add("SCA orchestration");
  }

  if (profile.services.includes("Fraud monitoring")) {
    stack.add("Fraud rules engine");
  }

  return [...stack];
}

function defaultInternalAssetsForProfile(profile: CompanyProfile) {
  const assets: OperatingModel["internalAssets"] = [
    {
      id: "asset-compliance-manual",
      name: "Compliance Manual",
      type: "policy"
    },
    {
      id: "asset-incident-runbook",
      name: "Incident Response Runbook",
      type: "runbook"
    },
    {
      id: "asset-vendor-register",
      name: "Outsourcing and Vendor Register",
      type: "contract"
    }
  ];

  if (isCrossBorderProfile(profile)) {
    assets.push({
      id: "asset-expansion-pack",
      name: `${getTargetCountry(profile)} Expansion Evidence Pack`,
      type: "process"
    });
  }

  if (
    profile.services.some((service) =>
      ["Payment initiation", "Open banking account access"].includes(service)
    )
  ) {
    assets.push({
      id: "asset-api-controls",
      name: "Open Banking API Control Register",
      type: "system"
    });
  }

  return assets;
}
