import type { Priority, Status } from "@/data/results";

export function StatusPill({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    Covered: "bg-success-soft text-success-foreground border-success/30",
    Partial: "bg-warn-soft text-warn-foreground border-warn/30",
    Missing: "bg-danger-soft text-danger border-danger/30",
  };
  const dot: Record<Status, string> = {
    Covered: "bg-success",
    Partial: "bg-warn",
    Missing: "bg-danger",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${styles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot[status]}`} />
      {status}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const styles: Record<Priority, string> = {
    Critical: "bg-danger-soft text-danger",
    High: "bg-warn-soft text-warn-foreground",
    Medium: "bg-brand-soft text-brand",
    Low: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}
