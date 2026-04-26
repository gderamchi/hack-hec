// Complee — Workspace owner invites external reviewers (lawyers/compliance) to
// their current Authorisation Package. Reviewers get an email magic-link sign-in
// and land directly in the /review portal.

import { useEffect, useState } from "react";
import { Mail, Loader2, Trash2, CheckCircle2, Clock, Ban, Copy } from "lucide-react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ReviewerPermission,
  type WorkspaceReviewer,
  inviteReviewer,
  listReviewers,
  revokeReviewer,
  deleteReviewerRow,
} from "@/lib/reviewers";


interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  workspaceName: string;
}

export function ReviewerInviteDialog({
  open,
  onOpenChange,
  assessmentId,
  workspaceName,
}: Props) {
  const [reviewers, setReviewers] = useState<WorkspaceReviewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<ReviewerPermission>("approve");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, assessmentId]);

  const refresh = async () => {
    setLoading(true);
    try {
      setReviewers(await listReviewers(assessmentId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSubmitting(true);
    try {
      const row = await inviteReviewer({
        assessmentId,
        email: clean,
        permission,
        message: message.trim() || undefined,
      });

      toast.success(`Invitation created for ${clean}`, {
        description: "Copy the invite link below and share it with them.",
      });
      setReviewers((r) => [row, ...r]);
      setEmail("");
      setMessage("");
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("duplicate")) {
        toast.error("This reviewer has already been invited to this workspace");
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeReviewer(id);
      toast.success("Access revoked");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this reviewer entirely?")) return;
    try {
      await deleteReviewerRow(id);
      setReviewers((r) => r.filter((x) => x.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copyInviteLink = (token: string, email: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success(`Invite link for ${email} copied`, {
      description: "Send it to them via email, Slack, or any channel.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite a reviewer</DialogTitle>
          <DialogDescription>
            Invite an external lawyer or compliance expert to review {workspaceName}.
            We'll generate a personal invite link you can share — they sign up
            with any email and only see this workspace's documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rev-email" className="text-[12px]">
              Reviewer email
            </Label>
            <Input
              id="rev-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lawyer@firm.com"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Access level</Label>
            <Select
              value={permission}
              onValueChange={(v) => setPermission(v as ReviewerPermission)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read-only — view documents</SelectItem>
                <SelectItem value="comment">Comment — add change requests</SelectItem>
                <SelectItem value="approve">
                  Approve — comment + final sign-off
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rev-msg" className="text-[12px]">
              Personal message (optional)
            </Label>
            <Textarea
              id="rev-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, please review the SCA policy and AML manual before Friday."
              rows={2}
            />
          </div>

          <Button
            onClick={handleInvite}
            disabled={submitting}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            Send invitation
          </Button>

          <p className="text-[11px] text-muted-foreground">
            After inviting, copy the personal invite link from the list below
            and send it to your auditor — they can sign up with any email and
            will be added to this workspace automatically.
          </p>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reviewers ({reviewers.length})
            </h3>
          </div>

          {loading ? (
            <div className="py-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
            </div>
          ) : reviewers.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-4 text-center">
              No reviewers yet. Add one above to start collaborating.
            </p>
          ) : (
            <div className="divide-y divide-border max-h-[220px] overflow-y-auto">
              {reviewers.map((r) => (
                <div key={r.id} className="py-2.5 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-navy truncate">
                      {r.invited_email}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <StatusBadge status={r.status} />
                      <span className="capitalize">· {r.permission}</span>
                    </div>
                  </div>
                  {r.status !== "revoked" && (
                    <button
                      onClick={() => copyInviteLink(r.invite_token, r.invited_email)}
                      className="text-[11px] text-brand hover:text-brand/80 inline-flex items-center gap-1 px-2 py-1"
                      title="Copy invitation link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Copy link</span>
                    </button>
                  )}
                  {r.status === "active" && (
                    <button
                      onClick={() => handleRevoke(r.id)}
                      className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1"
                      title="Revoke access"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: WorkspaceReviewer["status"] }) {
  if (status === "active")
    return (
      <Badge className="bg-success-soft text-success-foreground border-success/20 h-4 text-[10px] px-1.5">
        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> Active
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="outline" className="h-4 text-[10px] px-1.5">
        <Clock className="h-2.5 w-2.5 mr-0.5" /> Pending
      </Badge>
    );
  return (
    <Badge variant="outline" className="h-4 text-[10px] px-1.5 text-muted-foreground">
      <Ban className="h-2.5 w-2.5 mr-0.5" /> Revoked
    </Badge>
  );
}
