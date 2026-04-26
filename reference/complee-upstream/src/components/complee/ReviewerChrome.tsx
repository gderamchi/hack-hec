// Complee — Layout shell for invited reviewers (auditors / lawyers).
// Strict subset of the owner Chrome: no assessment step bar, no roadmap bar,
// no "Invite auditor", no Library link. Reviewers only see the review portal
// and their account button.

import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, LogOut, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReviewerChrome({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Reviewer";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="h-[60px] border-b border-border bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="h-full max-w-[1280px] mx-auto px-5 sm:px-6 flex items-center justify-between gap-4">
          <Link to="/review" className="flex items-center gap-2.5 min-w-0">
            <Logo />
            <span className="font-semibold tracking-tight text-[17px] text-navy">
              Complee
            </span>
            <span className="ml-2 hidden sm:inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand text-[10.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5">
              <ShieldCheck className="h-3 w-3" />
              Reviewer
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/review"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 sm:px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted"
            >
              <Inbox className="h-3.5 w-3.5 text-brand" />
              <span className="hidden sm:inline">Review inbox</span>
            </Link>

            <span className="hidden md:inline text-[12px] text-muted-foreground max-w-[160px] truncate">
              {displayName}
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => void signOut()}
              className="h-8 text-[12px]"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="h-10 border-t border-border bg-card">
        <div className="h-full max-w-[1280px] mx-auto px-5 sm:px-6 flex items-center text-[11.5px] sm:text-[12px] text-muted-foreground">
          Complee Reviewer Portal · Limited access — only invited workspaces are visible · 2026
        </div>
      </footer>
    </div>
  );
}
