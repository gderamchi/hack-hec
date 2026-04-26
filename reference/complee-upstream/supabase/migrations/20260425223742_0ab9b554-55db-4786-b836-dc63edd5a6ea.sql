-- Audit event types
CREATE TYPE public.audit_action AS ENUM (
  'document_created',
  'document_signed',
  'document_sent_to_reviewer',
  'document_approved',
  'document_changes_requested',
  'comment_added',
  'comment_resolved',
  'reviewer_invited',
  'reviewer_accepted',
  'submission_pack_exported'
);

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL,
  signed_document_id UUID,
  actor_user_id UUID,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action public.audit_action NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  prev_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_events_assessment ON public.audit_events(assessment_id, created_at);
CREATE INDEX idx_audit_events_document ON public.audit_events(signed_document_id, created_at);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Workspace owner can read all audit events for their assessments
CREATE POLICY "Owner views workspace audit events"
ON public.audit_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = audit_events.assessment_id AND a.user_id = auth.uid()
));

-- Active reviewers can read audit events for their invited workspaces
CREATE POLICY "Reviewer views workspace audit events"
ON public.audit_events
FOR SELECT
USING (public.is_workspace_reviewer(assessment_id, auth.uid()));

-- Anyone with workspace access (owner or reviewer) can append events
CREATE POLICY "Members append audit events"
ON public.audit_events
FOR INSERT
WITH CHECK (
  (actor_user_id = auth.uid())
  AND (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = audit_events.assessment_id AND a.user_id = auth.uid()
    )
    OR public.is_workspace_reviewer(assessment_id, auth.uid())
  )
);

-- No update/delete policies → events are append-only (tamper-evident)