export function Logo({ size = 24 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-md bg-navy text-navy-foreground font-bold"
      style={{ width: size, height: size, fontSize: size * 0.6, lineHeight: 1 }}
      aria-hidden
    >
      C
    </div>
  );
}
