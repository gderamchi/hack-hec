const REGULATORS = [
  ["FCA", "United Kingdom", "CASS 15 + Consumer Duty"],
  ["ACPR", "France", "Licence perimeter"],
  ["BaFin", "Germany", "ZAG + MaRisk"],
  ["DNB", "Netherlands", "Integrity screening"],
  ["Banco de Espana", "Spain", "Payment services registration"],
  ["EBA", "EU", "PSD3/PSR + fraud controls"]
] as const;

export function RegulatoryRibbon() {
  return (
    <div className="overflow-hidden rounded-xl border border-navy-foreground/15 bg-navy-foreground/5">
      <div className="flex min-w-max animate-marquee items-center gap-3 py-3 pr-3">
        {[...REGULATORS, ...REGULATORS].map(([authority, country, scope], index) => (
          <div
            key={`${authority}-${index}`}
            className="flex items-center gap-3 rounded-lg border border-navy-foreground/10 bg-navy-foreground/[0.06] px-4 py-2 text-[12px] text-navy-foreground/80"
          >
            <span className="font-semibold text-navy-foreground">{authority}</span>
            <span className="h-1 w-1 rounded-full bg-brand" aria-hidden="true" />
            <span>{country}</span>
            <span className="hidden text-navy-foreground/55 sm:inline">{scope}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
