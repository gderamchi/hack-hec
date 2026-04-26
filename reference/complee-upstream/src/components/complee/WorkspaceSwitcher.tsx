// Complee — Header dropdown to switch between Authorisation Packages
// (= one workspace per target country) and create new ones by duplicating.

import { useState } from "react";
import { ChevronDown, Plus, Check, Trash2, FolderKanban } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaces } from "@/store/workspaces";
import {
  switchWorkspace,
  duplicateActiveWorkspace,
  deleteWorkspace,
} from "@/hooks/useCloudSync";
import { getRegulatorByCountry } from "@/data/requirements";
import type { CountryCode } from "@/data/requirements";

const COUNTRY_OPTIONS: CountryCode[] = ["FR", "DE", "NL", "ES", "GB"];

export function WorkspaceSwitcher() {
  const navigate = useNavigate();
  const { workspaces, activeId } = useWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState<CountryCode>("DE");
  const [busy, setBusy] = useState(false);

  if (workspaces.length === 0) return null;

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0];
  const activeReg = getRegulatorByCountry(active.targetCountry);

  const handleSwitch = async (id: string) => {
    if (id === activeId) return;
    try {
      await switchWorkspace(id);
      const target = workspaces.find((w) => w.id === id);
      toast.success(
        `Switched to ${target?.companyName ?? "package"} · ${target?.targetCountry}`,
      );
      // Send user to results so they immediately see the right roadmap
      navigate({ to: "/results" });
    } catch {
      toast.error("Could not switch package");
    }
  };

  const handleCreate = async () => {
    setBusy(true);
    try {
      const created = await duplicateActiveWorkspace({
        newCompanyName: name.trim() || undefined,
        newTargetCountry: target,
      });
      if (created) {
        toast.success("New package created — re-run the analysis");
        setCreateOpen(false);
        setName("");
        navigate({ to: "/profile" });
      } else {
        toast.error("Could not create package");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (workspaces.length <= 1) {
      toast.error("You need at least one package");
      return;
    }
    if (!confirm("Delete this package? Step progress will be lost.")) return;
    try {
      await deleteWorkspace(id);
      toast.success("Package deleted");
      // If we deleted the active one, switch to the first remaining
      if (id === activeId) {
        const remaining = useWorkspaces.getState().workspaces.filter((w) => w.id !== id);
        if (remaining[0]) await switchWorkspace(remaining[0].id);
      }
    } catch {
      toast.error("Could not delete package");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted max-w-[220px]"
        >
          <FolderKanban className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="truncate">
            <span className="hidden sm:inline">{active.companyName} · </span>
            {activeReg?.flag} {active.targetCountry}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Authorisation packages
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {workspaces.map((w) => {
            const reg = getRegulatorByCountry(w.targetCountry);
            const isActive = w.id === activeId;
            return (
              <DropdownMenuItem
                key={w.id}
                onSelect={(e) => {
                  e.preventDefault();
                  void handleSwitch(w.id);
                }}
                className="flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{reg?.flag ?? "🌍"}</span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-navy truncate">
                      {w.companyName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {w.institutionType} · {reg?.country ?? w.targetCountry} ·{" "}
                      {reg?.authority ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isActive && <Check className="h-3.5 w-3.5 text-brand" />}
                  {workspaces.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDelete(w.id);
                      }}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      title="Delete package"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setName(active.companyName);
              setTarget(
                COUNTRY_OPTIONS.find((c) => c !== active.targetCountry) ?? "DE",
              );
              setCreateOpen(true);
            }}
            className="cursor-pointer text-brand font-medium"
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            New package (duplicate current)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>



      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New authorisation package</DialogTitle>
            <DialogDescription>
              Duplicates your current company profile, services and uploaded
              documents into a new workspace. Pick a different target country to
              start a parallel application.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ws-name" className="text-[12px]">
                Company / package name
              </Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={active.companyName}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Target country</Label>
              <Select
                value={target}
                onValueChange={(v) => setTarget(v as CountryCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((c) => {
                    const reg = getRegulatorByCountry(c);
                    return (
                      <SelectItem key={c} value={c}>
                        {reg?.flag} {reg?.country ?? c} · {reg?.authority ?? ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setCreateOpen(false)}
              className="px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:text-navy"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2 text-[12.5px] font-medium hover:bg-brand/90 disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              {busy ? "Creating…" : "Create package"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
