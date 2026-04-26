// Complee — Reviewer collaboration helpers (invitations, portal queries, comments).
// All access is RLS-enforced server-side; this layer just shapes the data.

import { supabase } from "@/integrations/supabase/client";

export type ReviewerStatus = "pending" | "active" | "revoked";
export type ReviewerPermission = "read" | "comment" | "approve";
export type DocumentReviewStatus =
  | "draft"
  | "awaiting_review"
  | "changes_requested"
  | "approved";

export interface WorkspaceReviewer {
  id: string;
  assessment_id: string;
  invited_email: string;
  reviewer_user_id: string | null;
  invited_by: string;
  permission: ReviewerPermission;
  status: ReviewerStatus;
  invite_token: string;
  message: string | null;
  invited_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface DocumentComment {
  id: string;
  signed_document_id: string;
  assessment_id: string;
  author_user_id: string;
  author_name: string;
  author_role: "owner" | "reviewer";
  page: number;
  pos_x: number;
  pos_y: number;
  body: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Reviewers ----------

export async function listReviewers(assessmentId: string): Promise<WorkspaceReviewer[]> {
  const { data, error } = await supabase
    .from("workspace_reviewers")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("invited_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as WorkspaceReviewer[];
}

export async function inviteReviewer(input: {
  assessmentId: string;
  email: string;
  permission: ReviewerPermission;
  message?: string;
}): Promise<WorkspaceReviewer> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("workspace_reviewers")
    .insert({
      assessment_id: input.assessmentId,
      invited_email: input.email.trim().toLowerCase(),
      invited_by: userData.user.id,
      permission: input.permission,
      message: input.message ?? null,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as WorkspaceReviewer;
}

export async function revokeReviewer(reviewerRowId: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_reviewers")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", reviewerRowId);
  if (error) throw error;
}

export async function deleteReviewerRow(reviewerRowId: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_reviewers")
    .delete()
    .eq("id", reviewerRowId);
  if (error) throw error;
}

/**
 * Called once after the invited reviewer logs in. Marks any pending invitations
 * matching their email as accepted and stamps the user_id, then ensures they have
 * the `reviewer` role.
 */
export async function acceptPendingInvitationsForCurrentUser(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email?.toLowerCase();
  const userId = userData.user?.id;
  if (!email || !userId) return 0;

  const { data: pending } = await supabase
    .from("workspace_reviewers")
    .select("id")
    .eq("invited_email", email)
    .eq("status", "pending");

  const count = pending?.length ?? 0;
  if (count > 0) {
    await supabase
      .from("workspace_reviewers")
      .update({
        status: "active",
        reviewer_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq("invited_email", email)
      .eq("status", "pending");

    // Ensure they have the reviewer role (ignore duplicate-key errors)
    await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: "reviewer" });
  }
  return count;
}

/**
 * Accept a reviewer invitation by its token (shared from a copy-link flow).
 * Works regardless of which email the reviewer signed up with — the token is
 * the bearer credential. Returns the assessment_id of the workspace they
 * just joined, or null if the token was invalid / already used / revoked.
 */
export async function acceptInvitationByToken(token: string): Promise<{
  assessmentId: string;
  companyName: string;
} | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sign in to accept this invitation");

  // Look up the invitation by token
  const { data: invite, error: invErr } = await supabase
    .from("workspace_reviewers")
    .select("id, assessment_id, status")
    .eq("invite_token", token)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!invite) return null;
  if (invite.status === "revoked") throw new Error("This invitation has been revoked");

  // If already active and assigned to this user, nothing to do
  if (invite.status === "active") {
    const { data: a } = await supabase
      .from("assessments")
      .select("company_name")
      .eq("id", invite.assessment_id)
      .maybeSingle();
    return { assessmentId: invite.assessment_id, companyName: a?.company_name ?? "Workspace" };
  }

  // Flip pending → active and stamp the current user
  const { error: updErr } = await supabase
    .from("workspace_reviewers")
    .update({
      status: "active",
      reviewer_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("invite_token", token)
    .eq("status", "pending");
  if (updErr) throw updErr;

  // Self-assign reviewer role (idempotent)
  await supabase.from("user_roles").insert({ user_id: userId, role: "reviewer" });

  const { data: a } = await supabase
    .from("assessments")
    .select("company_name")
    .eq("id", invite.assessment_id)
    .maybeSingle();
  return { assessmentId: invite.assessment_id, companyName: a?.company_name ?? "Workspace" };
}

// ---------- Reviewer portal queries ----------

export interface ReviewerWorkspace {
  assessment_id: string;
  company_name: string;
  home_country: string;
  target_country: string;
  institution_type: string;
  permission: ReviewerPermission;
  total_documents: number;
  awaiting_review: number;
  approved: number;
}

export async function listMyReviewerWorkspaces(): Promise<ReviewerWorkspace[]> {
  // Workspaces I've been invited to as an active reviewer
  const { data: invites, error: invErr } = await supabase
    .from("workspace_reviewers")
    .select("assessment_id, permission, status")
    .eq("status", "active");
  if (invErr) throw invErr;
  if (!invites || invites.length === 0) return [];

  const assessmentIds = invites.map((i) => i.assessment_id);
  const { data: assessments, error: aErr } = await supabase
    .from("assessments")
    .select("id, company_name, home_country, target_country, institution_type")
    .in("id", assessmentIds);
  if (aErr) throw aErr;

  const { data: docs } = await supabase
    .from("signed_documents")
    .select("assessment_id, review_status")
    .in("assessment_id", assessmentIds);

  const counts = new Map<
    string,
    { total: number; awaiting: number; approved: number }
  >();
  (docs ?? []).forEach((d) => {
    if (!d.assessment_id) return;
    const c = counts.get(d.assessment_id) ?? { total: 0, awaiting: 0, approved: 0 };
    c.total += 1;
    if (d.review_status === "awaiting_review") c.awaiting += 1;
    if (d.review_status === "approved") c.approved += 1;
    counts.set(d.assessment_id, c);
  });

  return (assessments ?? []).map((a) => {
    const inv = invites.find((i) => i.assessment_id === a.id)!;
    const c = counts.get(a.id) ?? { total: 0, awaiting: 0, approved: 0 };
    return {
      assessment_id: a.id,
      company_name: a.company_name,
      home_country: a.home_country,
      target_country: a.target_country,
      institution_type: a.institution_type,
      permission: inv.permission as ReviewerPermission,
      total_documents: c.total,
      awaiting_review: c.awaiting,
      approved: c.approved,
    };
  });
}

// ---------- Document review status ----------

export async function setDocumentReviewStatus(
  documentId: string,
  status: DocumentReviewStatus,
  notes?: string,
): Promise<void> {
  const patch =
    notes !== undefined
      ? { review_status: status, review_notes: notes }
      : { review_status: status };
  const { error } = await supabase
    .from("signed_documents")
    .update(patch)
    .eq("id", documentId);
  if (error) throw error;

  // Audit event (best-effort)
  try {
    const { data: doc } = await supabase
      .from("signed_documents")
      .select("assessment_id, name")
      .eq("id", documentId)
      .single();
    const { data: u } = await supabase.auth.getUser();
    if (doc?.assessment_id) {
      const action =
        status === "approved"
          ? "document_approved"
          : status === "changes_requested"
            ? "document_changes_requested"
            : status === "awaiting_review"
              ? "document_sent_to_reviewer"
              : null;
      if (action) {
        const { recordAuditEvent } = await import("./auditTrail");
        await recordAuditEvent({
          assessmentId: doc.assessment_id,
          documentId,
          action,
          actorName: u.user?.email ?? "Member",
          actorRole: "owner",
          metadata: { document_name: doc.name, notes },
        });
      }
    }
  } catch (e) {
    console.warn("Audit event (review status) failed:", e);
  }
}

/**
 * Reviewer approves a document and stamps their signature alongside it.
 * Stores reviewer name + typed/drawn signature data + timestamp on the document
 * row so the owner can see who approved and when (dual-signature audit trail).
 */
export async function approveDocumentAsReviewer(input: {
  documentId: string;
  reviewerName: string;
  signatureData: string; // typed name OR drawn PNG data URL
  notes?: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  // Stamp the auditor signature into the inline "Auditor signature:" field of
  // the signed PDF (best-effort — DB row still records the approval if the
  // PDF cannot be re-uploaded). Reviewers cannot write to the owner's storage
  // folder directly via RLS, so we delegate the upload to an edge function
  // that runs with the service role after re-verifying the reviewer.
  let approvedPath: string | null = null;
  try {
    const { data: docRow } = await supabase
      .from("signed_documents")
      .select("signed_storage_path, name")
      .eq("id", input.documentId)
      .single();
    if (docRow?.signed_storage_path) {
      const [{ downloadDocumentBlob, stampAuditorSignatureOnBlob }] =
        await Promise.all([import("./documentLibrary")]);
      const original = await downloadDocumentBlob(docRow.signed_storage_path);
      const stamped = await stampAuditorSignatureOnBlob(original, {
        reviewerName: input.reviewerName,
        signatureData: input.signatureData,
        notes: input.notes ?? null,
      });
      const buf = await stamped.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      const pdfBase64 = btoa(binary);
      const { data: upRes, error: upErr } = await supabase.functions.invoke(
        "upload-approved-pdf",
        {
          body: {
            documentId: input.documentId,
            pdfBase64,
            fileName: docRow.name,
          },
        },
      );
      if (upErr) throw upErr;
      approvedPath = (upRes as { path?: string } | null)?.path ?? null;
    }
  } catch (e) {
    console.warn("Auditor PDF stamping failed:", e);
  }

  const { error } = await supabase
    .from("signed_documents")
    .update({
      review_status: "approved",
      reviewer_user_id: userData.user.id,
      reviewer_name: input.reviewerName,
      reviewer_signature_data: input.signatureData,
      reviewer_signed_at: new Date().toISOString(),
      review_notes: input.notes ?? null,
      ...(approvedPath ? { signed_storage_path: approvedPath } : {}),
    })
    .eq("id", input.documentId);
  if (error) throw error;

  // Audit event (best-effort)
  try {
    const { data: doc } = await supabase
      .from("signed_documents")
      .select("assessment_id, name")
      .eq("id", input.documentId)
      .single();
    if (doc?.assessment_id) {
      const { recordAuditEvent } = await import("./auditTrail");
      await recordAuditEvent({
        assessmentId: doc.assessment_id,
        documentId: input.documentId,
        action: "document_approved",
        actorName: input.reviewerName,
        actorRole: "reviewer",
        metadata: {
          document_name: doc.name,
          notes: input.notes,
          signed_at: new Date().toISOString(),
        },
      });
    }
  } catch (e) {
    console.warn("Audit event (reviewer approval) failed:", e);
  }
}

// ---------- Comments ----------

export async function listComments(documentId: string): Promise<DocumentComment[]> {
  const { data, error } = await supabase
    .from("document_comments")
    .select("*")
    .eq("signed_document_id", documentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DocumentComment[];
}

export async function addComment(input: {
  documentId: string;
  assessmentId: string;
  page: number;
  posX: number;
  posY: number;
  body: string;
  authorRole: "owner" | "reviewer";
  authorName: string;
}): Promise<DocumentComment> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("document_comments")
    .insert({
      signed_document_id: input.documentId,
      assessment_id: input.assessmentId,
      author_user_id: userData.user.id,
      author_name: input.authorName,
      author_role: input.authorRole,
      page: input.page,
      pos_x: input.posX,
      pos_y: input.posY,
      body: input.body,
    })
    .select()
    .single();
  if (error) throw error;
  const created = data as DocumentComment;

  try {
    const { recordAuditEvent } = await import("./auditTrail");
    await recordAuditEvent({
      assessmentId: input.assessmentId,
      documentId: input.documentId,
      action: "comment_added",
      actorName: input.authorName,
      actorRole: input.authorRole,
      metadata: { excerpt: input.body.slice(0, 120) },
    });
  } catch (e) {
    console.warn("Audit event (comment_added) failed:", e);
  }
  return created;
}

export async function resolveComment(commentId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("document_comments")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: userData.user?.id ?? null,
    })
    .eq("id", commentId);
  if (error) throw error;

  try {
    const { data: c } = await supabase
      .from("document_comments")
      .select("assessment_id, signed_document_id, author_name")
      .eq("id", commentId)
      .single();
    if (c?.assessment_id) {
      const { recordAuditEvent } = await import("./auditTrail");
      await recordAuditEvent({
        assessmentId: c.assessment_id,
        documentId: c.signed_document_id,
        action: "comment_resolved",
        actorName: userData.user?.email ?? "Member",
        actorRole: "owner",
        metadata: { original_author: c.author_name },
      });
    }
  } catch (e) {
    console.warn("Audit event (comment_resolved) failed:", e);
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from("document_comments")
    .delete()
    .eq("id", commentId);
  if (error) throw error;
}
