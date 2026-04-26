import { dbInsert, dbSelectOne, dbUpdate, dbSelect } from "@/lib/agent-db";
import type { ComplianceProfile, OperatingModel } from "@/lib/agent-types";

export const dynamic = "force-dynamic";

// GET — load the most recent compliance profile
export async function GET() {
  try {
    const rows = await dbSelect<ComplianceProfile>("compliance_profiles", {}, "*", "created_at.desc", 1);
    return Response.json({ profile: rows[0] ?? null });
  } catch {
    return Response.json({ profile: null });
  }
}

// POST — create or update profile
export async function POST(request: Request) {
  try {
    const body = await request.json() as { operatingModel: OperatingModel; activeRegulations?: string[] };
    const { operatingModel, activeRegulations } = body;

    if (!operatingModel?.companyName?.trim()) {
      return Response.json({ error: "operatingModel.companyName is required" }, { status: 400 });
    }

    // Check if profile already exists for this company
    const existing = await dbSelectOne<ComplianceProfile>(
      "compliance_profiles",
      { "company_name": `eq.${operatingModel.companyName}` }
    );

    const regs = activeRegulations ?? ["DORA", "PSD3/PSR", "EU AI Act", "FCA Consumer Duty"];

    if (existing) {
      await dbUpdate(
        "compliance_profiles",
        { "id": `eq.${existing.id}` },
        { operating_model: operatingModel, active_regulations: regs, updated_at: new Date().toISOString() }
      );
      return Response.json({ profile: { ...existing, operating_model: operatingModel, active_regulations: regs } });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const profile: ComplianceProfile = {
      id,
      company_name: operatingModel.companyName,
      operating_model: operatingModel,
      active_regulations: regs,
      created_at: now,
      updated_at: now
    };
    await dbInsert("compliance_profiles", [profile]);
    return Response.json({ profile });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
