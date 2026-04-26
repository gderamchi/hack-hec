import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Database, GitCompareArrows, Map, ShieldCheck, Sparkles } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { REGULATORS, getRequirements } from "@/data/requirements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Complee — AI Compliance Consultant for FinTech" },
      {
        name: "description",
        content:
          "Expand across European borders with a real-data compliance readiness assessment.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const requirements = getRequirements();
  const total = requirements.length;
  const authorityCount = new Set(
    requirements.length > 0
      ? requirements.map((r) => r.authority)
      : REGULATORS.map((r) => r.authority),
  ).size;

  return (
    <Chrome>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 complee-grid-bg opacity-60 pointer-events-none" />
        <div className="relative max-w-[1080px] mx-auto px-5 sm:px-6 pt-14 sm:pt-20 md:pt-28 pb-12 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] sm:text-[12px] text-muted-foreground mb-6 sm:mb-8">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            For Heads of Compliance, Expansion, and COOs
          </div>

          <h1 className="text-[32px] sm:text-[44px] md:text-[60px] leading-[1.05] font-semibold tracking-tight text-navy">
            AI Compliance Consultant
            <br />
            <span className="text-brand">for FinTech Companies</span>
          </h1>

          <p className="mt-5 sm:mt-6 text-[15px] sm:text-[17px] md:text-[19px] leading-relaxed text-muted-foreground max-w-[640px] mx-auto">
            Expand across European borders with a real-data compliance readiness assessment.
          </p>

          <div className="mt-8 sm:mt-10 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-5 sm:px-6 py-3 sm:py-3.5 text-[14px] sm:text-[15px] font-medium hover:bg-navy/90 transition-colors shadow-sm"
            >
              Start assessment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success-soft px-3 py-1.5 text-[12px] text-success-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live data · Currently tracking {total} requirements across {authorityCount} European
            regulators
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-[900px] mx-auto text-left">
            <ValueCard
              icon={<Database className="h-4 w-4" />}
              title="Real regulatory data"
              body="Sourced from FCA, BaFin, ACPR, DNB and Banco de España — not generic AI guesses."
            />
            <ValueCard
              icon={<GitCompareArrows className="h-4 w-4" />}
              title="Cross-border gap analysis"
              body="See exactly which controls you have, which are partial, and which are missing."
            />
            <ValueCard
              icon={<Map className="h-4 w-4" />}
              title="Execution-ready roadmap"
              body="Owners, effort and cost estimates so your team can act on day one."
            />
          </div>

          <p className="mt-12 text-[12px] text-muted-foreground">
            <ShieldCheck className="inline h-3.5 w-3.5 text-success mr-1 -mt-0.5" />
            Powered by real regulator data from ACPR, BaFin, DNB, Banco de España, and the FCA.
          </p>
        </div>
      </section>
    </Chrome>
  );
}

function ValueCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm">
      <div className="h-8 w-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-[14px] font-semibold text-navy">{title}</div>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
