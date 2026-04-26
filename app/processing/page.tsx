"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { StepShell } from "@/components/complee/StepShell";
import { useAssessment } from "@/components/complee/assessment-context";
import { countryAuthority } from "@/lib/complee-frontend";

export default function ProcessingPage() {
  const router = useRouter();
  const { profile, uploadedDocuments, runAnalysis, setAnalysisError } = useAssessment();
  const [completed, setCompleted] = useState(0);
  const [progress, setProgress] = useState(8);
  const [currentLabel, setCurrentLabel] = useState("Starting assessment...");
  const authority = countryAuthority(profile.targetCountry);
  const documentCount = uploadedDocuments.length;

  const steps = useMemo(
    () => [
      {
        label: "Reading uploaded compliance documents",
        detail: `Loaded ${documentCount} extracted document${documentCount === 1 ? "" : "s"}`
      },
      {
        label: "Validating required evidence categories",
        detail: "Checking selected services against required-document rules"
      },
      {
        label: `Mapping ${profile.companyName || "company"} setup against ${authority} requirements`,
        detail: "Calling the existing /api/analyze endpoint"
      },
      {
        label: "Scoring covered, partial and missing obligations",
        detail: "Applying deterministic evidence gates after analysis"
      },
      {
        label: "Generating execution roadmap",
        detail: "Owners, deadlines, evidence needs and diagnostics"
      }
    ],
    [authority, documentCount, profile.companyName]
  );

  useEffect(() => {
    let active = true;
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(94, value + (94 - value) * 0.09));
    }, 120);

    const stepTimers = steps.map((step, index) =>
      window.setTimeout(() => {
        if (!active) return;
        setCompleted(index);
        setCurrentLabel(step.label);
      }, 450 + index * 650)
    );

    (async () => {
      try {
        setCurrentLabel("Calling analysis backend...");
        await runAnalysis();
        if (!active) return;
        setCompleted(steps.length);
        setProgress(100);
        window.setTimeout(() => {
          if (active) router.push("/results");
        }, 500);
      } catch (error) {
        if (!active) return;
        setAnalysisError(
          error instanceof Error ? error.message : "Analysis failed. Check server logs."
        );
        router.push("/documents");
      } finally {
        window.clearInterval(timer);
      }
    })();

    return () => {
      active = false;
      window.clearInterval(timer);
      stepTimers.forEach(window.clearTimeout);
    };
  }, [router, runAnalysis, setAnalysisError, steps]);

  return (
    <Chrome>
      <StepShell
        eyebrow="Step 3 of 4 - Agent processing"
        title="Complee is reviewing your documents"
        description={
          <>
            Mapping {profile.companyName || "your company"} setup against {authority}
            {" "}requirements.
            <br />
            {currentLabel}
          </>
        }
      >
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:mb-8 sm:p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-medium text-navy">
              {Math.round(progress)}% complete
            </span>
            <span className="text-[12px] text-muted-foreground">Live backend call</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <ol className="relative">
            {steps.map((step, index) => {
              const done = completed > index;
              const active = completed === index;
              const pending = completed < index;
              return (
                <li key={step.label} className="relative pb-5 pl-10 last:pb-0">
                  {index < steps.length - 1 ? (
                    <span
                      className={`absolute bottom-0 left-[14px] top-7 w-px ${
                        done ? "bg-success" : "bg-border"
                      }`}
                    />
                  ) : null}
                  <div className="absolute left-0 top-0.5">
                    {done ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success">
                        <Check className="h-4 w-4 text-white" strokeWidth={3} />
                      </div>
                    ) : active ? (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand bg-brand-soft">
                        <Loader2 className="h-4 w-4 animate-spin text-brand" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full border border-border bg-muted" />
                    )}
                  </div>
                  <div className={pending ? "opacity-50" : ""}>
                    <div className="text-[13px] font-medium text-navy sm:text-[14px]">
                      {step.label}
                    </div>
                    <div className="mt-0.5 text-[12px] text-muted-foreground">
                      {step.detail}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </StepShell>
    </Chrome>
  );
}
