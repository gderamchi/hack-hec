import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";

export const Route = createFileRoute("/error")({
  head: () => ({ meta: [{ title: "Something went wrong — Complee" }] }),
  component: ErrorPage,
});

function ErrorPage() {
  const navigate = useNavigate();
  return (
    <Chrome>
      <div className="max-w-[640px] mx-auto px-5 sm:px-6 py-16 sm:py-24 text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-warn-soft">
          <AlertTriangle className="h-7 w-7 text-warn-foreground" />
        </div>
        <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-navy">
          Something went wrong during the assessment
        </h1>
        <p className="mt-3 text-[14px] sm:text-[15px] text-muted-foreground">
          Your data is still safe. Please try running the assessment again.
        </p>
        <div className="mt-8">
          <button
            onClick={() => navigate({ to: "/documents" })}
            className="inline-flex items-center rounded-lg bg-navy text-navy-foreground px-5 py-3 text-[14px] font-medium hover:bg-navy/90 transition-colors shadow-sm"
          >
            Try again
          </button>
        </div>
      </div>
    </Chrome>
  );
}
