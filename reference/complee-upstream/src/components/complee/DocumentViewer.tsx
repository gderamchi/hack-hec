import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileSignature, Loader2, ShieldCheck, MessageSquare, ThumbsUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import {
  type SignedDocumentRow,
  getDocumentUrl,
  signStoredDocument,
} from "@/lib/documentLibrary";
import { setDocumentReviewStatus, approveDocumentAsReviewer } from "@/lib/reviewers";
import { SignaturePad } from "./SignaturePad";
import { DocumentCommentsPanel } from "./DocumentCommentsPanel";

interface Props {
  document: SignedDocumentRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSigned?: (updated: SignedDocumentRow) => void;
  defaultSignerName?: string;
  /** When set, switches the right-hand panel into reviewer mode. */
  reviewerMode?: { authorName: string };
  /** Owner mode (default): author shown as "owner" on comments. */
  ownerName?: string;
}

/**
 * Combined viewer + e-signature dialog. Loads the document from a short-lived
 * signed URL, renders PDFs page-by-page in-app, and lets the user sign by
 * typing or drawing. PDFs are signed in-browser via pdf-lib.
 */
export function DocumentViewer({
  document: doc,
  open,
  onOpenChange,
  onSigned,
  defaultSignerName,
  reviewerMode,
  ownerName,
}: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pdfPageImages, setPdfPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName ?? "");
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [drawnPng, setDrawnPng] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [rightTab, setRightTab] = useState<"sign" | "comments">(
    reviewerMode ? "comments" : "sign",
  );
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewerSigName, setReviewerSigName] = useState(reviewerMode?.authorName ?? "");
  const [reviewerSigMethod, setReviewerSigMethod] = useState<"typed" | "drawn">("typed");
  const [reviewerDrawnPng, setReviewerDrawnPng] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState("");
  const reviewerApproved = doc?.review_status === "approved";
  const isPdf = doc?.name.toLowerCase().endsWith(".pdf") ?? false;
  const alreadySigned = doc?.status === "signed";

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    if (!open || !doc) {
      setPreviewUrl(null);
      setPdfPageImages([]);
      return;
    }

    setLoading(true);
    setPdfPageImages([]);

    const path = doc.signed_storage_path ?? doc.storage_path;
    (async () => {
      try {
        const url = await getDocumentUrl(path);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);

        const sourceBlob = await res.blob();
        const normalizedBlob = isPdf
          ? new Blob([sourceBlob], { type: "application/pdf" })
          : sourceBlob;

        blobUrl = URL.createObjectURL(normalizedBlob);
        if (!cancelled) setPreviewUrl(blobUrl);

        if (isPdf) {
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

          const bytes = new Uint8Array(await normalizedBlob.arrayBuffer());
          const pdf = await pdfjs.getDocument({ data: bytes }).promise;
          const pages: string[] = [];

          for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            const page = await pdf.getPage(pageNumber);
            const viewport = page.getViewport({ scale: 1.35 });
            const canvas = window.document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) throw new Error("Failed to create PDF preview canvas.");

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await page.render({
              canvas,
              canvasContext: context,
              viewport,
            }).promise;

            pages.push(canvas.toDataURL("image/png"));
          }

          if (!cancelled) setPdfPageImages(pages);
        }
      } catch (e) {
        if (!cancelled) {
          toast.error((e as Error).message ?? "Failed to load document");
          setPreviewUrl(null);
          setPdfPageImages([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [open, doc, isPdf]);

  // Reset signature inputs when switching documents.
  useEffect(() => {
    setSignerName(defaultSignerName ?? "");
    setMethod("typed");
    setDrawnPng("");
  }, [doc?.id, defaultSignerName]);

  const handleSign = async () => {
    if (!doc) return;
    if (!signerName.trim()) {
      toast.error("Please enter your full legal name.");
      return;
    }
    if (method === "drawn" && !drawnPng) {
      toast.error("Please draw your signature before applying it.");
      return;
    }
    if (!isPdf) {
      toast.error("Only PDF documents can be signed in-app for now.");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await signStoredDocument(doc, {
        signerName: signerName.trim(),
        method,
        drawnPngDataUrl: method === "drawn" ? drawnPng : undefined,
      });
      toast.success("Document signed", {
        description: "Sent to your invited reviewers for approval.",
      });
      onSigned?.(updated);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message ?? "Signing failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-navy">{doc?.name ?? "Document"}</DialogTitle>
            {alreadySigned ? (
              <Badge className="bg-success-soft text-success-foreground border-success/20">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Signed
              </Badge>
            ) : (
              <Badge variant="outline">Unsigned</Badge>
            )}
          </div>
          <DialogDescription>
            {alreadySigned
              ? `Signed by ${doc?.signer_name} on ${doc?.signed_at?.slice(0, 10)} · audit hash sha256:${doc?.signature_hash?.slice(0, 12)}…`
              : "Review the document, then add a signature using your typed name or a drawn mark."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 min-h-0">
          <div className="rounded-lg border border-border bg-surface-muted overflow-hidden min-h-[360px] flex items-center justify-center">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isPdf ? (
              pdfPageImages.length > 0 ? (
                <div className="w-full h-full overflow-y-auto p-4 space-y-4">
                  {pdfPageImages.map((pageSrc, index) => (
                    <img
                      key={`${doc?.id ?? "document"}-page-${index + 1}`}
                      src={pageSrc}
                      alt={`${doc?.name ?? "Document"} page ${index + 1}`}
                      className="w-full h-auto rounded-md border border-border bg-background shadow-sm"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : previewUrl ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="h-full w-full"
                  aria-label={`${doc?.name ?? "Document"} PDF preview`}
                >
                  <iframe
                    src={previewUrl}
                    title={`${doc?.name ?? "Document"} PDF preview`}
                    className="h-full w-full border-0"
                  />
                </object>
              ) : (
                <div className="text-center p-6 text-[13px] text-muted-foreground">
                  PDF preview could not be rendered inline.
                </div>
              )
            ) : previewUrl ? (
              <div className="text-center p-6 text-[13px] text-muted-foreground">
                Preview not available for this file type.
                <div className="mt-3">
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                  >
                    Open in new tab
                  </a>
                </div>
              </div>
            ) : (
              <span className="text-[13px] text-muted-foreground">No preview.</span>
            )}
          </div>

          {/* Right-hand panel: Sign / Comments / (reviewer) Approval */}
          <div className="rounded-lg border border-border bg-card p-4 flex flex-col min-h-[360px]">
            {doc && (
              <Tabs value={rightTab} onValueChange={(v) => setRightTab(v as "sign" | "comments")} className="flex flex-col flex-1 min-h-0">
                <TabsList className="grid grid-cols-2 w-full mb-3">
                  <TabsTrigger value="sign">
                    {reviewerMode ? "Review" : "Sign"}
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-3.5 w-3.5 mr-1" />
                    Comments
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="comments" className="flex-1 min-h-0 mt-0">
                  {doc.assessment_id ? (
                    <DocumentCommentsPanel
                      documentId={doc.id}
                      assessmentId={doc.assessment_id}
                      authorRole={reviewerMode ? "reviewer" : "owner"}
                      authorName={reviewerMode?.authorName ?? ownerName ?? "Owner"}
                    />
                  ) : (
                    <p className="text-[12px] text-muted-foreground p-3">
                      Comments are available on documents linked to a workspace.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="sign" className="flex-1 min-h-0 mt-0 overflow-y-auto">
                  {reviewerMode ? (
                    reviewerApproved ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
                        <div className="h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
                          <ShieldCheck className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-[15px] font-semibold text-navy">
                          Approved by {doc?.reviewer_name}
                        </div>
                        <div className="text-[12px] text-muted-foreground">
                          {doc?.reviewer_signed_at?.replace("T", " ").slice(0, 16)} UTC
                        </div>
                        {doc?.reviewer_signature_data && (
                          doc.reviewer_signature_data.startsWith("data:image") ? (
                            <img
                              src={doc.reviewer_signature_data}
                              alt="Reviewer signature"
                              className="h-16 object-contain"
                            />
                          ) : (
                            <span
                              className="text-navy"
                              style={{
                                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                                fontSize: 28,
                              }}
                            >
                              {doc.reviewer_signature_data}
                            </span>
                          )
                        )}
                      </div>
                    ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-border bg-surface-muted p-3 text-[12.5px] text-navy">
                        <div className="font-semibold mb-1">Reviewer approval</div>
                        <p className="text-muted-foreground">
                          Sign with your name to approve this document, or request
                          changes to send it back.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reviewer-sig-name" className="text-[12px]">
                          Your full name
                        </Label>
                        <Input
                          id="reviewer-sig-name"
                          value={reviewerSigName}
                          onChange={(e) => setReviewerSigName(e.target.value)}
                          placeholder="e.g. Sarah Compliance"
                        />
                      </div>

                      <Tabs value={reviewerSigMethod} onValueChange={(v) => setReviewerSigMethod(v as "typed" | "drawn")}>
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="typed">Type</TabsTrigger>
                          <TabsTrigger value="drawn">Draw</TabsTrigger>
                        </TabsList>
                        <TabsContent value="typed" className="mt-2">
                          <div className="rounded-lg border border-border bg-surface-muted p-3 min-h-[72px] flex items-center justify-center">
                            <span
                              className="text-navy"
                              style={{
                                fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                                fontSize: 28,
                              }}
                            >
                              {reviewerSigName || "Your signature"}
                            </span>
                          </div>
                        </TabsContent>
                        <TabsContent value="drawn" className="mt-2">
                          <SignaturePad onChange={setReviewerDrawnPng} />
                        </TabsContent>
                      </Tabs>

                      <Button
                        onClick={async () => {
                          if (!doc) return;
                          if (!reviewerSigName.trim()) {
                            toast.error("Enter your name to approve.");
                            return;
                          }
                          if (reviewerSigMethod === "drawn" && !reviewerDrawnPng) {
                            toast.error("Draw your signature first.");
                            return;
                          }
                          setReviewBusy(true);
                          try {
                            await approveDocumentAsReviewer({
                              documentId: doc.id,
                              reviewerName: reviewerSigName.trim(),
                              signatureData:
                                reviewerSigMethod === "drawn"
                                  ? reviewerDrawnPng
                                  : reviewerSigName.trim(),
                              notes: reviewNotes.trim() || undefined,
                            });
                            toast.success("Document approved");
                            onOpenChange(false);
                          } catch (e) {
                            toast.error((e as Error).message);
                          } finally {
                            setReviewBusy(false);
                          }
                        }}
                        disabled={reviewBusy}
                        className="w-full bg-success text-success-foreground hover:bg-success/90"
                      >
                        {reviewBusy ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <ThumbsUp className="h-4 w-4 mr-2" />
                        )}
                        Approve & sign
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!doc) return;
                          setReviewBusy(true);
                          try {
                            await setDocumentReviewStatus(doc.id, "changes_requested");
                            toast.success("Marked as changes requested");
                            setRightTab("comments");
                          } catch (e) {
                            toast.error((e as Error).message);
                          } finally {
                            setReviewBusy(false);
                          }
                        }}
                        disabled={reviewBusy}
                        variant="outline"
                        className="w-full"
                      >
                        <AlertCircle className="h-4 w-4 mr-2" /> Request changes
                      </Button>
                    </div>
                    )
                  ) : alreadySigned ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
                      <div className="h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-success" />
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-navy">
                          This document has been signed
                        </div>
                        <div className="text-[12px] text-muted-foreground mt-1">
                          {doc?.signer_name} · {doc?.signature_method === "drawn" ? "drawn" : "typed"} ·{" "}
                          {doc?.signed_at?.replace("T", " ").slice(0, 16)} UTC
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono break-all px-3">
                        sha256:{doc?.signature_hash}
                      </div>
                      {doc?.review_status === "approved" && (
                        <div className="w-full mt-2 rounded-lg border border-success/30 bg-success-soft/40 p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-success-foreground">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Approved by reviewer
                          </div>
                          <div className="text-[12px] text-navy mt-1">
                            {doc?.reviewer_name}
                            {doc?.reviewer_signed_at && (
                              <>
                                {" · "}
                                {doc.reviewer_signed_at.replace("T", " ").slice(0, 16)} UTC
                              </>
                            )}
                          </div>
                          {doc?.reviewer_signature_data && (
                            <div className="mt-2 flex items-center justify-center">
                              {doc.reviewer_signature_data.startsWith("data:image") ? (
                                <img
                                  src={doc.reviewer_signature_data}
                                  alt="Reviewer signature"
                                  className="h-14 object-contain"
                                />
                              ) : (
                                <span
                                  className="text-navy"
                                  style={{
                                    fontFamily:
                                      "'Brush Script MT', 'Lucida Handwriting', cursive",
                                    fontSize: 26,
                                  }}
                                >
                                  {doc.reviewer_signature_data}
                                </span>
                              )}
                            </div>
                          )}
                          {doc?.review_notes && (
                            <div className="mt-2 text-[11.5px] text-muted-foreground italic">
                              "{doc.review_notes}"
                            </div>
                          )}
                        </div>
                      )}
                      {doc?.review_status === "changes_requested" && (
                        <div className="w-full mt-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-[12.5px] font-semibold text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Reviewer requested changes
                          </div>
                          {doc?.review_notes && (
                            <div className="mt-1 text-[11.5px] text-navy italic">
                              "{doc.review_notes}"
                            </div>
                          )}
                        </div>
                      )}
                      {previewUrl && (
                        <a
                          href={previewUrl}
                          download={doc?.name}
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-4 py-2 text-[13px] font-medium hover:bg-navy/90"
                        >
                          Download signed copy
                        </a>
                      )}
                      {doc.assessment_id && (
                        <Button
                          onClick={async () => {
                            await setDocumentReviewStatus(doc.id, "awaiting_review");
                            toast.success("Sent to reviewer");
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-1"
                        >
                          Send to reviewer for approval
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <FileSignature className="h-4 w-4 text-brand" />
                        <div className="text-[14px] font-semibold text-navy">
                          Add your signature
                        </div>
                      </div>

                      <div className="space-y-2 mb-3">
                        <Label htmlFor="signer-name" className="text-[12px]">
                          Full legal name
                        </Label>
                        <Input
                          id="signer-name"
                          value={signerName}
                          onChange={(e) => setSignerName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                        />
                      </div>

                      <Tabs value={method} onValueChange={(v) => setMethod(v as "typed" | "drawn")}>
                        <TabsList className="grid grid-cols-2 w-full">
                          <TabsTrigger value="typed">Type</TabsTrigger>
                          <TabsTrigger value="drawn">Draw</TabsTrigger>
                        </TabsList>
                        <TabsContent value="typed" className="mt-3">
                          <div className="rounded-lg border border-border bg-surface-muted p-4 min-h-[120px] flex items-center justify-center">
                            <span
                              className="text-navy"
                              style={{
                                fontFamily:
                                  "'Brush Script MT', 'Lucida Handwriting', cursive",
                                fontSize: 36,
                              }}
                            >
                              {signerName || "Your signature"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Your typed name will be embedded as the signature mark.
                          </p>
                        </TabsContent>
                        <TabsContent value="drawn" className="mt-3">
                          <SignaturePad onChange={setDrawnPng} />
                        </TabsContent>
                      </Tabs>

                      <div className="mt-auto pt-4 text-[11px] text-muted-foreground">
                        By clicking <span className="font-medium">Sign document</span>, you agree
                        this constitutes your electronic signature on this document. A timestamp,
                        hash, and your browser fingerprint will be recorded for audit.
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!alreadySigned && (
            <Button onClick={handleSign} disabled={submitting || !isPdf}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing…
                </>
              ) : (
                <>
                  <FileSignature className="h-4 w-4 mr-2" /> Sign document
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
