import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ReviewerChrome } from "./ReviewerChrome";
import { Loader2 } from "lucide-react";
import { useAssessment } from "@/store/assessment";
import { useStepProgress } from "@/store/stepProgress";
import { useWorkspaces } from "@/store/workspaces";
import { taskKey } from "@/lib/playbook";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { ReviewerInviteDialog } from "./ReviewerInviteDialog";
import { FileSignature, LogIn, User as UserIcon, UserPlus } from "lucide-react";

const STEPS = [
  { path: "/", label: "Start" },
  { path: "/profile", label: "Profile" },
  { path: "/documents", label: "Documents" },
  { path: "/processing", label: "Analysis" },
  { path: "/results", label: "Results" },
];

export function Chrome({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = useUserRole();
  const { assessmentResults } = useAssessment();
  const { byKey } = useStepProgress();
  const { workspaces, activeId } = useWorkspaces();
  const [inviteOpen, setInviteOpen] = useState(false);
  const activeWorkspace = workspaces.find((w) => w.id === activeId) ?? workspaces[0];

  // Reviewer guard: redirect reviewers away from owner routes to their portal.
  // Allow /auth and /accept-invite (they handle the post-login flow themselves).
  const isReviewerAllowedRoute =
    location.pathname === "/auth" || location.pathname === "/accept-invite";

  useEffect(() => {
    if (role === "reviewer" && !isReviewerAllowedRoute) {
      navigate({ to: "/review" });
    }
  }, [role, isReviewerAllowedRoute, navigate]);

  const isAccountRoute = location.pathname === "/account" || location.pathname === "/auth";

  const idx = isAccountRoute
    ? -1
    : Math.max(
        0,
        STEPS.findIndex((s) => s.path === location.pathname),
      );
  const step = idx + 1;
  const pct = idx >= 0 ? (step / STEPS.length) * 100 : 0;

  // Live roadmap progress (visible whenever there are results)
  const roadmap = useMemo(() => {
    const rows = assessmentResults?.rows ?? [];
    const remediation = rows.filter((r) => r.status !== "covered");
    const done = remediation.filter((r) => byKey[taskKey(r)]?.status === "done").length;
    return { total: remediation.length, done };
  }, [assessmentResults, byKey]);

  const showRoadmapBar = roadmap.total > 0;
  const roadmapPct = roadmap.total === 0 ? 0 : Math.round((roadmap.done / roadmap.total) * 100);
  const roadmapComplete = roadmap.total > 0 && roadmap.done === roadmap.total;

  // Render reviewer shell instead of owner Chrome for reviewers (after all hooks)
  if (role === "reviewer" && !isReviewerAllowedRoute) {
    return (
      <ReviewerChrome>
        <div className="py-20 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        </div>
      </ReviewerChrome>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-[60px] border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="h-full max-w-[1280px] mx-auto px-5 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Logo />
            <span className="font-semibold tracking-tight text-[17px] text-navy">Complee</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[13px] text-muted-foreground hidden md:block">
              AI Compliance Consultant
            </span>
            {user && <WorkspaceSwitcher />}
            {user && activeWorkspace && (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted"
                title="Invite an auditor / reviewer to this workspace"
              >
                <UserPlus className="h-3.5 w-3.5 text-brand" />
                <span className="hidden sm:inline">Invite auditor</span>
              </button>
            )}
            {user && (
              <Link
                to="/library"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted"
              >
                <FileSignature className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Library</span>
              </Link>
            )}
            {user ? (
              <Link
                to="/account"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted"
              >
                <UserIcon className="h-3.5 w-3.5" />
                <span className="max-w-[120px] truncate hidden sm:inline">
                  {(user.user_metadata?.display_name as string | undefined) ??
                    user.email?.split("@")[0]}
                </span>
                <span className="sm:hidden">Account</span>
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy text-navy-foreground px-3 py-1.5 text-[12px] font-medium hover:bg-navy/90"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Step bar — only inside the assessment flow */}
      {idx >= 0 && (
        <div className="border-b border-border bg-card">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-6 py-2.5 flex items-center gap-4">
            <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
              Step {step} of {STEPS.length}
            </span>
            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-brand transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[12px] text-muted-foreground hidden md:block">
              {STEPS[idx]?.label}
            </span>
          </div>
        </div>
      )}

      {/* Live roadmap progress bar — visible on results + account when there are tasks */}
      {showRoadmapBar && (
        <div className="border-b border-border bg-brand-soft/40">
          <div className="max-w-[1280px] mx-auto px-5 sm:px-6 py-2 flex items-center gap-3">
            <Link
              to="/results"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-brand hover:text-brand/80"
            >
              Roadmap
            </Link>
            <span
              key={`${roadmap.done}-${roadmap.total}`}
              className="text-[12px] text-navy tabular-nums font-medium animate-in fade-in zoom-in-95 duration-300"
            >
              {roadmap.done}/{roadmap.total} steps
            </span>
            <div className="flex-1 h-1 bg-card rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  roadmapComplete ? "bg-success" : "bg-brand"
                }`}
                style={{ width: `${roadmapPct}%` }}
              />
            </div>
            <span
              key={`pct-${roadmapPct}`}
              className={`text-[12px] font-semibold tabular-nums hidden sm:inline animate-in fade-in duration-300 ${
                roadmapComplete ? "text-success-foreground" : "text-brand"
              }`}
            >
              {roadmapPct}%
            </span>
            {roadmapComplete && (
              <span className="text-[11px] font-semibold text-success-foreground hidden md:inline">
                ✓ Ready to submit
              </span>
            )}
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="h-10 border-t border-border bg-card">
        <div className="h-full max-w-[1280px] mx-auto px-5 sm:px-6 flex items-center text-[11.5px] sm:text-[12px] text-muted-foreground">
          Complee · AI Compliance Consultant for FinTech Companies · 2026
        </div>
      </footer>

      {activeWorkspace && (
        <ReviewerInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          assessmentId={activeWorkspace.id}
          workspaceName={activeWorkspace.companyName}
        />
      )}
    </div>
  );
}
