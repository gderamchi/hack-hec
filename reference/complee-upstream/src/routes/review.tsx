// Complee — Reviewer portal. Lawyers / compliance experts invited to one or
// more FinTech workspaces land here after sign-in. They see only the workspaces
// they were invited to, and can open any document to comment / approve.

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { ReviewerChrome as Chrome } from "@/components/complee/ReviewerChrome";
import { DocumentViewer } from "@/components/complee/DocumentViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  type ReviewerWorkspace,
  acceptPendingInvitationsForCurrentUser,
  listMyReviewerWorkspaces,
} from "@/lib/reviewers";
import type { SignedDocumentRow } from "@/lib/documentLibrary";

export const Route = createFileRoute("/review")({
  head: () => ({ meta: [{ title: "Reviewer portal — Complee" }] }),
  component: ReviewPortal,
});

function ReviewPortal() {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<ReviewerWorkspace[]>([]);
  const [activeWs, setActiveWs] = useState<ReviewerWorkspace | null>(null);
  const [docs, setDocs] = useState<SignedDocumentRow[]>([]);
  const [loadingWs, setLoadingWs] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeDoc, setActiveDoc] = useState<SignedDocumentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "awaiting" | "approved">("all");

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoadingWs(true);
    try {
      await acceptPendingInvitationsForCurrentUser();
      const list = await listMyReviewerWorkspaces();
      setWorkspaces(list);
      if (list.length > 0 && !activeWs) {
        setActiveWs(list[0]);
        await loadDocs(list[0].assessment_id);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingWs(false);
    }
  };

  const loadDocs = async (assessmentId: string) => {
    setLoadingDocs(true);
    try {
      const { data, error } = await supabase
        .from("signed_documents")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDocs((data ?? []) as unknown as SignedDocumentRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingDocs(false);
    }
  };

  if (authLoading) {
    return (
      <Chrome>
        <div className="py-20 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        </div>
      </Chrome>
    );
  }

  if (!user) {
    return (
      <Chrome>
        <div className="max-w-[640px] mx-auto px-5 py-16 text-center">
          <h1 className="text-[24px] font-semibold text-navy mb-2">
            Sign in to review documents
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            You were invited to review compliance documents on Complee. Sign in with
            your invited email to access the reviewer portal.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-5 py-3 text-[14px] font-medium hover:bg-navy/90"
          >
            Sign in to continue
          </Link>
        </div>
      </Chrome>
    );
  }

  const visibleDocs = docs.filter((d) => {
    const status = (d as unknown as { review_status?: string }).review_status ?? "draft";
    if (filter === "awaiting") return status === "awaiting_review" || status === "changes_requested";
    if (filter === "approved") return status === "approved";
    return true;
  });

  return (
    <Chrome>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2 inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Reviewer portal
            </p>
            <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-navy">
              Documents awaiting your review
            </h1>
            <p className="mt-2 text-[14px] text-muted-foreground max-w-[680px]">
              Each FinTech workspace below is one company you've been invited to
              review. Open any document to comment, request changes, or approve.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loadingWs}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingWs ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loadingWs ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-brand-soft flex items-center justify-center mb-3">
              <Briefcase className="h-6 w-6 text-brand" />
            </div>
            <h2 className="text-[16px] font-semibold text-navy">No workspaces yet</h2>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[480px] mx-auto">
              You haven't been invited to review any FinTech workspaces yet. When a
              company invites your email address, the workspace will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
            {/* Workspace sidebar */}
            <aside className="rounded-2xl border border-border bg-card p-2 h-fit">
              {workspaces.map((ws) => {
                const isActive = activeWs?.assessment_id === ws.assessment_id;
                return (
                  <button
                    key={ws.assessment_id}
                    onClick={async () => {
                      setActiveWs(ws);
                      await loadDocs(ws.assessment_id);
                    }}
                    className={`w-full text-left rounded-lg p-3 transition-colors ${
                      isActive ? "bg-brand-soft" : "hover:bg-surface-muted"
                    }`}
                  >
                    <div className="text-[13px] font-semibold text-navy truncate">
                      {ws.company_name}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {ws.institution_type} · {ws.home_country} → {ws.target_country}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {ws.awaiting_review > 0 && (
                        <Badge className="bg-warning-soft text-warning-foreground border-warning/30 h-4 text-[10px] px-1.5">
                          <Clock className="h-2.5 w-2.5 mr-0.5" />
                          {ws.awaiting_review} pending
                        </Badge>
                      )}
                      {ws.approved > 0 && (
                        <Badge className="bg-success-soft text-success-foreground border-success/20 h-4 text-[10px] px-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                          {ws.approved}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {ws.total_documents} docs
                      </span>
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Documents list */}
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              {activeWs && (
                <div className="px-4 sm:px-5 py-3 border-b border-border flex items-center gap-2 flex-wrap">
                  <h2 className="text-[14px] font-semibold text-navy">
                    {activeWs.company_name}
                  </h2>
                  <span className="text-[11px] text-muted-foreground">
                    · {activeWs.permission} access
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    {(["all", "awaiting", "approved"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`text-[11px] px-2 py-1 rounded-md ${
                          filter === f
                            ? "bg-navy text-navy-foreground"
                            : "text-muted-foreground hover:bg-surface-muted"
                        }`}
                      >
                        {f === "all" ? "All" : f === "awaiting" ? "Needs review" : "Approved"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loadingDocs ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
                </div>
              ) : visibleDocs.length === 0 ? (
                <div className="p-12 text-center text-[13px] text-muted-foreground">
                  No documents in this view yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {visibleDocs.map((d) => {
                    const status =
                      (d as unknown as { review_status?: string }).review_status ?? "draft";
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-surface-muted/60"
                      >
                        <div className="h-9 w-9 rounded-md bg-brand-soft flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-medium text-navy truncate">
                            {d.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <ReviewStatusBadge status={status} />
                            {d.status === "signed" && (
                              <span>· signed by {d.signer_name}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setActiveDoc(d);
                            setOpen(true);
                          }}
                        >
                          Open & review
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <DocumentViewer
        document={activeDoc}
        open={open}
        onOpenChange={setOpen}
        reviewerMode={{
          authorName:
            (user.user_metadata?.display_name as string | undefined) ??
            user.email?.split("@")[0] ??
            "Reviewer",
        }}
        onSigned={() => {
          if (activeWs) void loadDocs(activeWs.assessment_id);
        }}
      />
    </Chrome>
  );
}

function ReviewStatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <Badge className="bg-success-soft text-success-foreground border-success/20 h-4 text-[10px] px-1.5">
        Approved
      </Badge>
    );
  if (status === "awaiting_review")
    return (
      <Badge className="bg-warning-soft text-warning-foreground border-warning/30 h-4 text-[10px] px-1.5">
        Awaiting review
      </Badge>
    );
  if (status === "changes_requested")
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/30 h-4 text-[10px] px-1.5">
        Changes requested
      </Badge>
    );
  return (
    <Badge variant="outline" className="h-4 text-[10px] px-1.5">
      Draft
    </Badge>
  );
}
