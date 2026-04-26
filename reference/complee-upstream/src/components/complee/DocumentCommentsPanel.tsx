// Complee — Side panel showing comments / change requests on a document.
// Used inside DocumentViewer so reviewers can leave pinned feedback and owners
// can resolve it.

import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Trash2, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  type DocumentComment,
  addComment,
  deleteComment,
  listComments,
  resolveComment,
} from "@/lib/reviewers";

interface Props {
  documentId: string;
  assessmentId: string;
  authorRole: "owner" | "reviewer";
  authorName: string;
}

export function DocumentCommentsPanel({
  documentId,
  assessmentId,
  authorRole,
  authorName,
}: Props) {
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const refresh = async () => {
    setLoading(true);
    try {
      setComments(await listComments(documentId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const created = await addComment({
        documentId,
        assessmentId,
        page: 1,
        posX: 0.5,
        posY: 0.5,
        body: trimmed,
        authorRole,
        authorName,
      });
      setComments((c) => [...c, created]);
      setBody("");
      toast.success(authorRole === "reviewer" ? "Change request added" : "Comment added");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveComment(id);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(id);
      setComments((c) => c.filter((x) => x.id !== id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const visible = showResolved ? comments : comments.filter((c) => !c.resolved_at);
  const openCount = comments.filter((c) => !c.resolved_at).length;
  const resolvedCount = comments.length - openCount;

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand" />
          <span className="text-[13px] font-semibold text-navy">
            {authorRole === "reviewer" ? "Change requests" : "Comments"}
          </span>
          {openCount > 0 && (
            <Badge className="bg-brand text-brand-foreground h-4 text-[10px] px-1.5">
              {openCount} open
            </Badge>
          )}
        </div>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-[11px] text-muted-foreground hover:text-navy"
          >
            {showResolved ? "Hide resolved" : `Show ${resolvedCount} resolved`}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">
            No {authorRole === "reviewer" ? "change requests" : "comments"} yet.
            {authorRole === "reviewer"
              ? " Add one below to flag changes for the FinTech."
              : " Reviewers will leave their feedback here."}
          </p>
        ) : (
          visible.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border p-2.5 ${
                c.resolved_at
                  ? "border-border bg-surface-muted/40 opacity-70"
                  : c.author_role === "reviewer"
                    ? "border-warning/30 bg-warning-soft/40"
                    : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold text-navy">
                  {c.author_name}
                </span>
                <Badge
                  variant="outline"
                  className="h-4 text-[9px] px-1 capitalize"
                >
                  {c.author_role}
                </Badge>
                {c.resolved_at && (
                  <Badge className="h-4 text-[9px] px-1 bg-success-soft text-success-foreground border-success/20">
                    Resolved
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[12.5px] text-navy whitespace-pre-wrap leading-snug">
                {c.body}
              </p>
              {!c.resolved_at && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => handleResolve(c.id)}
                    className="text-[10.5px] text-success-foreground hover:underline inline-flex items-center gap-1"
                  >
                    <Check className="h-3 w-3" /> Mark resolved
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-[10.5px] text-muted-foreground hover:text-destructive ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-border p-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            authorRole === "reviewer"
              ? "Describe what needs to change…"
              : "Add a comment…"
          }
          rows={2}
          className="text-[12.5px]"
        />
        <Button
          onClick={handleAdd}
          disabled={submitting || !body.trim()}
          size="sm"
          className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1.5" />
          )}
          {authorRole === "reviewer" ? "Add change request" : "Post comment"}
        </Button>
      </div>
    </div>
  );
}
