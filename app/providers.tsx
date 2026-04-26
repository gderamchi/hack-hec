"use client";

import { AssessmentProvider } from "@/components/complee/assessment-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AssessmentProvider>{children}</AssessmentProvider>;
}
