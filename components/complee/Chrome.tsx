"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileText, PlayCircle, ShieldCheck, Zap } from "lucide-react";
import { PRODUCT_CONFIG } from "@/lib/app-config";
import { readinessScore } from "@/lib/complee-frontend";
import { Logo } from "@/components/complee/Logo";
import { useAssessment } from "@/components/complee/assessment-context";

const SECTION_NAV = [
  { id: "why-complee", label: "Why Complee" },
  { id: "how-it-works", label: "How It Works" },
  { id: "coverage", label: "Impact" },
  { id: "demo-results", label: "Demo Results" }
] as const;

const FLOW_STEPS = [
  { href: "/profile", label: "Company Scope", icon: ShieldCheck },
  { href: "/documents", label: "Evidence Documents", icon: FileText },
  { href: "/processing", label: "Agent Processing", icon: PlayCircle },
  { href: "/results", label: "Results Dashboard", icon: BarChart3 }
] as const;

export function Chrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { result } = useAssessment();
  const isHome = pathname === "/";
  const currentStep = FLOW_STEPS.findIndex((step) => step.href === pathname);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    if (!isHome) {
      setActiveSection("");
      return;
    }

    const elements = SECTION_NAV.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => element !== null
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [isHome]);

  const score = useMemo(() => readinessScore(result), [result]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex min-h-[60px] max-w-[1440px] items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8 2xl:max-w-[1680px]">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            aria-label={`${PRODUCT_CONFIG.name} home`}
          >
            <Logo />
            <span className="truncate text-[17px] font-semibold tracking-tight text-navy">
              {PRODUCT_CONFIG.name}
            </span>
          </Link>

          {isHome ? (
            <nav aria-label="Page sections" className="hidden items-center gap-1 md:flex">
              {SECTION_NAV.map((item) => {
                const active = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`inline-flex min-h-[40px] items-center rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-brand-soft text-brand"
                        : "text-muted-foreground hover:bg-surface-muted hover:text-navy"
                    }`}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
          ) : (
            <nav aria-label="Assessment steps" className="hidden items-center gap-1 lg:flex">
              {FLOW_STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = pathname === step.href;
                const complete = currentStep > index;
                return (
                  <Link
                    key={step.href}
                    href={step.href}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium transition-colors ${
                      active
                        ? "bg-brand-soft text-brand"
                        : complete
                          ? "text-navy hover:bg-surface-muted"
                          : "text-muted-foreground hover:bg-surface-muted hover:text-navy"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {step.label}
                  </Link>
                );
              })}
            </nav>
          )}

          <div className="flex items-center gap-2">
            {result ? (
              <Link
                href="/results"
                className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-medium text-navy transition hover:bg-surface-muted sm:inline-flex"
              >
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                {score}% ready
              </Link>
            ) : null}
            <Link
              href="/agent"
              className="hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12px] font-medium text-navy transition hover:bg-surface-muted sm:inline-flex"
            >
              <Zap className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              Live Agent
            </Link>
            <Link
              href="/profile"
              className="inline-flex min-h-[40px] items-center rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground shadow-sm transition hover:bg-brand/90"
            >
              Start
            </Link>
          </div>
        </div>
      </header>

      {isHome ? (
        <nav
          aria-label="Page sections mobile"
          className="sticky top-[60px] z-30 border-b border-border bg-card/85 backdrop-blur md:hidden"
        >
          <div className="mx-auto max-w-[1440px] overflow-x-auto px-4 py-2">
            <ul className="flex min-w-max items-center gap-2">
              {SECTION_NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="inline-flex rounded-full bg-surface-muted px-3 py-1.5 text-[12px] font-medium text-muted-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      ) : null}

      <main>{children}</main>
    </div>
  );
}
