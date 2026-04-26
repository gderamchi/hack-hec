import Image from "next/image";
import { ArrowRight, CheckCircle2, FileSearch, MapPinned } from "lucide-react";

const STEPS = [
  {
    title: "Assess your expansion scope",
    body: "Answer a focused profile questionnaire so the requirement base matches the company, services, home regulator and target market.",
    image: "/complee/how-step-1-assess.png",
    icon: FileSearch
  },
  {
    title: "Find gaps from real evidence",
    body: "Upload policies and governance packs. The backend extracts readable text, checks required document coverage and gates the matrix against evidence.",
    image: "/complee/how-step-2-gaps.png",
    icon: CheckCircle2
  },
  {
    title: "Turn gaps into an execution roadmap",
    body: "Results become owned tasks, deadlines, missing evidence and an exportable submission pack for review.",
    image: "/complee/how-step-3-roadmap.png",
    icon: MapPinned
  }
] as const;

export function HowItWorksScroller() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-heading"
      className="border-t border-border bg-background scroll-mt-20"
    >
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            How it works
          </p>
          <h2 id="how-heading" className="fluid-h2 mt-2 font-semibold text-navy">
            From market entry question to evidence-backed roadmap
          </h2>
          <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-muted-foreground">
            The forked Complee flow now runs through the existing Next backend, so the
            interface keeps the premium assessment journey while using real extraction,
            analysis and Live Agent endpoints.
          </p>
          <a
            href="/profile"
            className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-[14px] font-medium text-brand-foreground shadow-sm transition hover:bg-brand/90"
          >
            Start assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="space-y-5">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="relative aspect-[16/9] bg-surface-muted">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="flex gap-4 p-5 sm:p-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 text-[17px] font-semibold text-navy">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
