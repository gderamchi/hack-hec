import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { useAssessment } from "@/store/assessment";
import { getRegulatorByCountry, getRequirements } from "@/data/requirements";

export const Route = createFileRoute("/processing")({
  head: () => ({ meta: [{ title: "Analysing — Complee" }] }),
  component: Processing,
});

const TOTAL_MS = 6000;

function Processing() {
  const navigate = useNavigate();
  const { profile } = useAssessment();
  const target = getRegulatorByCountry(profile.targetCountry);
  const authority = target?.authority ?? profile.targetCountry;
  const requirementsForTarget = getRequirements().filter(
    (r) => r.country === profile.targetCountry,
  );
  const n = requirementsForTarget.length;

  const steps = [
    { label: "Reading uploaded compliance documents", detail: "Parsing supplied PDFs" },
    {
      label: "Classifying existing controls",
      detail: "Tagging policies by category and jurisdiction",
    },
    {
      label: `Mapping ${profile.companyName} setup against ${authority} requirements`,
      detail: `Loaded ${n} ${authority} requirements from the regulatory data layer`,
    },
    {
      label: "Scoring covered, partial, and missing obligations",
      detail: "Cross-referencing services against rulebook",
    },
    { label: "Generating execution roadmap", detail: "Owners, effort, and cost estimates" },
  ];

  const [completed, setCompleted] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    try {
      const stepCount = steps.length;
      const interval = TOTAL_MS / stepCount;
      const timers = steps.map((_, i) =>
        setTimeout(() => setCompleted(i + 1), Math.round(interval * (i + 1))),
      );
      const transition = setTimeout(() => navigate({ to: "/results" }), TOTAL_MS);
      const tick = setInterval(() => {
        setProgress((p) => (p < 96 ? p + (96 - p) * 0.06 : p));
      }, 100);
      return () => {
        timers.forEach(clearTimeout);
        clearTimeout(transition);
        clearInterval(tick);
      };
    } catch {
      navigate({ to: "/error" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Chrome>
      <div className="max-w-[760px] mx-auto px-5 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-navy">
            Complee is reviewing your documents…
          </h1>
          <p className="mt-2 text-[13px] sm:text-[15px] text-muted-foreground">
            Mapping {profile.companyName} setup against {authority} requirements
          </p>
          <p className="mt-1 text-[12px] sm:text-[13px] text-muted-foreground">
            Loaded {n} {authority} requirements from the regulatory data layer
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-medium text-navy">
              {Math.round(progress)}% complete
            </span>
            <span className="text-[12px] text-muted-foreground">~6 seconds</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-100 ease-out rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm">
          <ol className="relative">
            {steps.map((s, i) => {
              const done = completed > i;
              const active = completed === i;
              const pending = completed < i;
              return (
                <li key={s.label} className="relative pl-10 pb-5 last:pb-0">
                  {i < steps.length - 1 && (
                    <span
                      className={`absolute left-[14px] top-7 bottom-0 w-px ${
                        done ? "bg-success" : "bg-border"
                      }`}
                    />
                  )}
                  <div className="absolute left-0 top-0.5">
                    {done ? (
                      <div className="h-7 w-7 rounded-full bg-success flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    ) : active ? (
                      <div className="h-7 w-7 rounded-full bg-brand-soft border-2 border-brand flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-brand animate-spin" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-muted border border-border" />
                    )}
                  </div>
                  <div className={pending ? "opacity-50" : ""}>
                    <div className="text-[13px] sm:text-[14px] font-medium text-navy">
                      {s.label}
                    </div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{s.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Chrome>
  );
}
