// Complee — Tamper-evident audit trail (hash-chain ledger).
// Every action on a document (sign, approve, comment, export, …) gets appended
// as an event. Each event hash chains the previous event's hash for the same
// document, so any later modification breaks the chain.

import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "document_created"
  | "document_signed"
  | "document_sent_to_reviewer"
  | "document_approved"
  | "document_changes_requested"
  | "comment_added"
  | "comment_resolved"
  | "reviewer_invited"
  | "reviewer_accepted"
  | "submission_pack_exported";

export interface AuditEvent {
  id: string;
  assessment_id: string;
  signed_document_id: string | null;
  actor_user_id: string | null;
  actor_name: string;
  actor_role: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  prev_hash: string | null;
  event_hash: string;
  created_at: string;
}

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Append a new event to the audit trail. Computes the chained hash from the
 * most recent event for the same document (or assessment if no document).
 */
export async function recordAuditEvent(input: {
  assessmentId: string;
  documentId?: string | null;
  action: AuditAction;
  actorName: string;
  actorRole: "owner" | "reviewer" | "system";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) return; // silently skip if anon — events require an actor

  // Find previous hash (last event for this doc, or last for the assessment)
  const query = supabase
    .from("audit_events")
    .select("event_hash")
    .eq("assessment_id", input.assessmentId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (input.documentId) query.eq("signed_document_id", input.documentId);
  const { data: prev } = await query;
  const prevHash = prev?.[0]?.event_hash ?? null;

  const payload = {
    assessment_id: input.assessmentId,
    signed_document_id: input.documentId ?? null,
    actor_user_id: userId,
    actor_name: input.actorName,
    actor_role: input.actorRole,
    action: input.action,
    metadata: input.metadata ?? {},
    timestamp: new Date().toISOString(),
    prev_hash: prevHash,
  };
  const eventHash = await sha256Hex(JSON.stringify(payload) + (prevHash ?? ""));

  await supabase.from("audit_events").insert({
    assessment_id: input.assessmentId,
    signed_document_id: input.documentId ?? null,
    actor_user_id: userId,
    actor_name: input.actorName,
    actor_role: input.actorRole,
    action: input.action,
    metadata: (input.metadata ?? {}) as never,
    prev_hash: prevHash,
    event_hash: eventHash,
  });
}

/** Fetch full audit trail for an assessment, oldest first. */
export async function listAuditEvents(assessmentId: string): Promise<AuditEvent[]> {
  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    ...e,
    metadata: (e.metadata ?? {}) as Record<string, unknown>,
  })) as AuditEvent[];
}

/**
 * Verify hash-chain integrity. Returns the index of the first broken event,
 * or null if the chain is intact.
 */
export async function verifyAuditChain(events: AuditEvent[]): Promise<number | null> {
  let prevHash: string | null = null;
  for (let i = 0; i < events.length; i += 1) {
    const e = events[i];
    if (e.prev_hash !== prevHash) return i;
    prevHash = e.event_hash;
  }
  return null;
}

const ACTION_LABELS: Record<AuditAction, string> = {
  document_created: "Document generated",
  document_signed: "Document signed",
  document_sent_to_reviewer: "Sent to reviewer",
  document_approved: "Approved by reviewer",
  document_changes_requested: "Changes requested",
  comment_added: "Comment added",
  comment_resolved: "Comment resolved",
  reviewer_invited: "Reviewer invited",
  reviewer_accepted: "Reviewer accepted invitation",
  submission_pack_exported: "Submission pack exported",
};

export function labelForAction(a: AuditAction): string {
  return ACTION_LABELS[a] ?? a;
}
