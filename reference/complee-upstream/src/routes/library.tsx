import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Loader2,
  Package,
  RefreshCw,
  ShieldCheck,
  Clock,
  AlertCircle,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { DocumentViewer } from "@/components/complee/DocumentViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  type SignedDocumentRow,
  deleteDocument,
  listDocuments,
  registerDocument,
  uploadDocumentBlob,
} from "@/lib/documentLibrary";
import { exportSubmissionPack } from "@/lib/submissionPack";
import { useAssessment } from "@/store/assessment";
import { useWorkspaces } from "@/store/workspaces";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Document library — Complee" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const [docs, setDocs] = useState<SignedDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SignedDocumentRow | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const profile = useAssessment((s) => s.profile);
  const activeWorkspaceId = useWorkspaces((s) => s.activeId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      setDocs(await listDocuments());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) refresh();
    else if (authed === false) setLoading(false);
  }, [authed]);

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = await uploadDocumentBlob({
          blob: file,
          filename: file.name,
          folder: "uploads",
        });
        await registerDocument({
          name: file.name,
          storage_path: path,
          doc_type: "upload",
          assessment_id: useWorkspaces.getState().activeId,
        });
      }
      toast.success("Documents uploaded.");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (row: SignedDocumentRow) => {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    try {
      await deleteDocument(row);
      setDocs((d) => d.filter((x) => x.id !== row.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openDoc = (d: SignedDocumentRow) => {
    setActive(d);
    setOpen(true);
  };

  const handleExportPack = async () => {
    if (!activeWorkspaceId) {
      toast.error("Open a workspace first to build a submission pack.");
      return;
    }
    setExporting(true);
    try {
      const res = await exportSubmissionPack(activeWorkspaceId);
      toast.success(`Submission pack ready · ${res.documentCount} document(s)`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  if (authed === false) {
    return (
      <Chrome>
        <div className="max-w-[720px] mx-auto px-5 sm:px-6 py-16 text-center">
          <h1 className="text-[24px] font-semibold text-navy mb-2">Sign in required</h1>
          <p className="text-[14px] text-muted-foreground">
            The document library stores your generated and signed PDFs in your private
            Cloud workspace. Please sign in to continue.
          </p>
        </div>
      </Chrome>
    );
  }

  return (
    <Chrome>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-6 py-8 sm:py-12">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2">
              Document library
            </p>
            <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-navy">
              View and sign your compliance documents
            </h1>
            <p className="mt-2 text-[14px] sm:text-[15px] text-muted-foreground max-w-[680px]">
              All generated PDFs and uploads are stored privately in your workspace. Open
              any document to preview, then add a typed or drawn e-signature with full
              audit trail.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-navy px-3 py-2 text-[13px] font-medium hover:bg-surface-muted cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              Upload PDF
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => onUpload(e.target.files)}
              />
            </label>
            <Button
              size="sm"
              onClick={handleExportPack}
              disabled={exporting || !activeWorkspaceId || docs.length === 0}
              className="bg-navy text-navy-foreground hover:bg-navy/90"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Export submission pack
              <Download className="h-3.5 w-3.5 ml-2 opacity-70" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-brand-soft flex items-center justify-center mb-3">
              <FileText className="h-6 w-6 text-brand" />
            </div>
            <h2 className="text-[16px] font-semibold text-navy">No documents yet</h2>
            <p className="text-[13px] text-muted-foreground mt-1 max-w-[420px] mx-auto">
              Generate a step document from the Roadmap or upload a PDF here. It will
              appear in this library, ready for review and signature.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-surface-muted/60 transition-colors"
              >
                <div className="h-9 w-9 rounded-md bg-brand-soft flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-brand" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-navy truncate">
                      {d.name}
                    </span>
                    {d.status === "signed" ? (
                      <Badge className="bg-success-soft text-success-foreground border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline">Unsigned</Badge>
                    )}
                    <Badge variant="secondary" className="capitalize">
                      {d.doc_type}
                    </Badge>
                    {d.review_status === "approved" && (
                      <Badge className="bg-success-soft text-success-foreground border-success/30">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Approved by reviewer
                      </Badge>
                    )}
                    {d.review_status === "awaiting_review" && (
                      <Badge className="bg-warning-soft text-warning-foreground border-warning/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting reviewer
                      </Badge>
                    )}
                    {d.review_status === "changes_requested" && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/30">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Changes requested
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {d.status === "signed"
                      ? `Signed by ${d.signer_name} · ${d.signed_at?.slice(0, 10)}`
                      : `Added ${d.created_at.slice(0, 10)}`}
                    {d.review_status === "approved" && d.reviewer_name && (
                      <>
                        {" · "}Approved by {d.reviewer_name}
                        {d.reviewer_signed_at && ` · ${d.reviewer_signed_at.slice(0, 10)}`}
                      </>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDoc(d)}>
                  {d.status === "signed" ? (
                    "View"
                  ) : (
                    <>
                      <FileSignature className="h-3.5 w-3.5 mr-1.5" /> Open & sign
                    </>
                  )}
                </Button>
                <button
                  onClick={() => onDelete(d)}
                  className="h-8 w-8 rounded-md hover:bg-card border border-transparent hover:border-border flex items-center justify-center text-muted-foreground"
                  aria-label={`Delete ${d.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentViewer
        document={active}
        open={open}
        onOpenChange={setOpen}
        onSigned={(updated) =>
          setDocs((list) => list.map((d) => (d.id === updated.id ? updated : d)))
        }
        defaultSignerName={profile.companyName}
      />
    </Chrome>
  );
}
