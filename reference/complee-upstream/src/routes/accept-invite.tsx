// Complee — Token-based reviewer invitation acceptance.
// Owner shares /accept-invite?token=XXX. Auditor signs up (or in) with any email,
// gets routed back here, and is auto-assigned to the inviting workspace.

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { acceptInvitationByToken } from "@/lib/reviewers";
import { toast } from "sonner";

export const Route = createFileRoute("/accept-invite")({
  head: () => ({ meta: [{ title: "Accept reviewer invitation — Complee" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    token: typeof s.token === "string" ? s.token : "",
  }),
  component: AcceptInvitePage,
});

function AcceptInvitePage() {
  const { token } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState<{ companyName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || !token || accepted || accepting) return;
    void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, token]);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await acceptInvitationByToken(token);
      if (!res) {
        setError("This invitation link is invalid or has expired.");
      } else {
        setAccepted({ companyName: res.companyName });
        toast.success(`You now have access to ${res.companyName}`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAccepting(false);
    }
  };

  if (!token) {
    return (
      <Chrome>
        <div className="max-w-[560px] mx-auto px-5 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h1 className="text-[22px] font-semibold text-navy mb-2">
            Missing invitation token
          </h1>
          <p className="text-[14px] text-muted-foreground">
            This link doesn't include a valid invitation token. Please ask the
            person who invited you to send the full link.
          </p>
        </div>
      </Chrome>
    );
  }

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
        <div className="max-w-[560px] mx-auto px-5 py-16 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-brand-soft flex items-center justify-center mb-3">
            <ShieldCheck className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-[24px] font-semibold text-navy mb-2">
            You've been invited as a reviewer
          </h1>
          <p className="text-[14px] text-muted-foreground mb-6">
            Sign up or sign in to accept this invitation. You'll automatically
            get access to the workspace afterwards.
          </p>
          <Button asChild className="bg-navy text-navy-foreground hover:bg-navy/90">
            <a
              href={`/auth?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
            >
              Sign up / Sign in to continue
            </a>
          </Button>
        </div>
      </Chrome>
    );
  }

  return (
    <Chrome>
      <div className="max-w-[560px] mx-auto px-5 py-16 text-center">
        {accepting && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto mb-3" />
            <p className="text-[14px] text-muted-foreground">
              Accepting your invitation…
            </p>
          </>
        )}

        {error && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h1 className="text-[20px] font-semibold text-navy mb-2">
              Couldn't accept invitation
            </h1>
            <p className="text-[14px] text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={accept}>
              Try again
            </Button>
          </>
        )}

        {accepted && (
          <>
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h1 className="text-[24px] font-semibold text-navy mb-2">
              You're in!
            </h1>
            <p className="text-[14px] text-muted-foreground mb-6">
              You now have reviewer access to{" "}
              <span className="font-semibold text-navy">{accepted.companyName}</span>.
            </p>
            <Button
              onClick={() => navigate({ to: "/review" })}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Open reviewer portal
            </Button>
          </>
        )}
      </div>
    </Chrome>
  );
}
