import type { ReactNode } from "react";

export function StepShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  width = "narrow",
  headerAside
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "narrow" | "wide";
  headerAside?: ReactNode;
}) {
  const containerWidth = width === "wide" ? "max-w-[1200px]" : "max-w-[880px]";

  return (
    <div
      className={`${containerWidth} mx-auto px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pt-24`}
    >
      <div className="mb-16 flex flex-col gap-6 sm:mb-20 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-brand">
            {eyebrow}
          </p>
          <h1 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-navy sm:text-[42px]">
            {title}
          </h1>
          {description ? (
            <div className="mt-7 max-w-[650px] text-[16px] leading-relaxed text-muted-foreground sm:mt-8 sm:text-[17px]">
              {description}
            </div>
          ) : null}
        </div>
        {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
      </div>

      <div className="space-y-12 sm:space-y-14">{children}</div>

      {footer ? <div className="mt-12 sm:mt-14">{footer}</div> : null}
    </div>
  );
}
