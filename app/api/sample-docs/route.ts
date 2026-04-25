import { readFile } from "node:fs/promises";
import path from "node:path";

const SAMPLE_DOCS = [
  "payment_flow.md",
  "fraud_policy.md",
  "sca_policy.md",
  "open_banking_api.md",
  "customer_support_refund_sop.md"
];

export async function GET() {
  const documents = await Promise.all(
    SAMPLE_DOCS.map(async (name) => {
      const content = await readFile(
        path.join(process.cwd(), "data", "sample-docs", name),
        "utf8"
      );

      return {
        name,
        type: "text/markdown",
        content
      };
    })
  );

  return Response.json({ documents });
}
