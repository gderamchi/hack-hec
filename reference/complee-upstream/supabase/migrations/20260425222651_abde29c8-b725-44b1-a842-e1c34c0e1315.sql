-- ============ ROLES (separate table to prevent privilege escalation) ============
CREATE TYPE public.app_role AS ENUM ('fintech_owner', 'reviewer', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Security-definer helper to check roles without recursive RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Auto-assign fintech_owner role on signup (extends existing handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'company_name'
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Default everyone to fintech_owner; reviewers get role added when they accept an invite
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'fintech_owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============ WORKSPACE REVIEWERS ============
CREATE TYPE public.reviewer_status AS ENUM ('pending', 'active', 'revoked');
CREATE TYPE public.reviewer_permission AS ENUM ('read', 'comment', 'approve');

CREATE TABLE public.workspace_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  reviewer_user_id UUID,            -- filled in once they accept and sign in
  invited_by UUID NOT NULL,          -- the workspace owner
  permission reviewer_permission NOT NULL DEFAULT 'approve',
  status reviewer_status NOT NULL DEFAULT 'pending',
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  message TEXT,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE (assessment_id, invited_email)
);

CREATE INDEX idx_workspace_reviewers_assessment ON public.workspace_reviewers(assessment_id);
CREATE INDEX idx_workspace_reviewers_user ON public.workspace_reviewers(reviewer_user_id);
CREATE INDEX idx_workspace_reviewers_token ON public.workspace_reviewers(invite_token);

ALTER TABLE public.workspace_reviewers ENABLE ROW LEVEL SECURITY;

-- Owner of the assessment can manage reviewers
CREATE POLICY "Owner views own workspace reviewers" ON public.workspace_reviewers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Owner invites reviewers" ON public.workspace_reviewers
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Owner updates own workspace reviewers" ON public.workspace_reviewers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Owner deletes own workspace reviewers" ON public.workspace_reviewers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

-- Reviewer can view their own invitation rows (so the portal can list their workspaces)
CREATE POLICY "Reviewer views own invitations" ON public.workspace_reviewers
  FOR SELECT USING (
    reviewer_user_id = auth.uid()
    OR (auth.jwt() ->> 'email') = invited_email
  );

-- Reviewer can mark themselves as accepted
CREATE POLICY "Reviewer accepts own invitation" ON public.workspace_reviewers
  FOR UPDATE USING (
    (auth.jwt() ->> 'email') = invited_email
  );

-- Helper: check if current user is a reviewer for an assessment
CREATE OR REPLACE FUNCTION public.is_workspace_reviewer(_assessment_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_reviewers
    WHERE assessment_id = _assessment_id
      AND status = 'active'
      AND (reviewer_user_id = _user_id
           OR invited_email = (SELECT email FROM auth.users WHERE id = _user_id))
  )
$$;

-- ============ EXPAND ACCESS ON EXISTING TABLES TO REVIEWERS ============
-- Reviewers see assessments they were invited to
CREATE POLICY "Reviewers view invited assessments" ON public.assessments
  FOR SELECT USING (public.is_workspace_reviewer(id, auth.uid()));

-- Reviewers see signed documents in those assessments
CREATE POLICY "Reviewers view documents in invited workspaces" ON public.signed_documents
  FOR SELECT USING (
    assessment_id IS NOT NULL
    AND public.is_workspace_reviewer(assessment_id, auth.uid())
  );

-- Reviewers see step progress in those assessments
CREATE POLICY "Reviewers view step progress in invited workspaces" ON public.step_progress
  FOR SELECT USING (public.is_workspace_reviewer(assessment_id, auth.uid()));

-- ============ DOCUMENT REVIEW STATUS COLUMNS ============
CREATE TYPE public.document_review_status AS ENUM ('draft', 'awaiting_review', 'changes_requested', 'approved');

ALTER TABLE public.signed_documents
  ADD COLUMN review_status document_review_status NOT NULL DEFAULT 'draft',
  ADD COLUMN reviewer_user_id UUID,
  ADD COLUMN reviewer_signed_at TIMESTAMPTZ,
  ADD COLUMN reviewer_signature_data TEXT,
  ADD COLUMN reviewer_name TEXT,
  ADD COLUMN review_notes TEXT;

-- Reviewers can update review_status on documents they're reviewing
CREATE POLICY "Reviewers update review status" ON public.signed_documents
  FOR UPDATE USING (
    assessment_id IS NOT NULL
    AND public.is_workspace_reviewer(assessment_id, auth.uid())
  );

-- ============ DOCUMENT COMMENTS ============
CREATE TABLE public.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signed_document_id UUID NOT NULL REFERENCES public.signed_documents(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,        -- 'reviewer' | 'owner'
  page INTEGER NOT NULL DEFAULT 1,
  pos_x NUMERIC(5,4) NOT NULL DEFAULT 0.5,  -- 0..1 (relative to page width)
  pos_y NUMERIC(5,4) NOT NULL DEFAULT 0.5,  -- 0..1 (relative to page height)
  body TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_comments_doc ON public.document_comments(signed_document_id);
CREATE INDEX idx_document_comments_assessment ON public.document_comments(assessment_id);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Owner of the workspace sees all comments
CREATE POLICY "Owner views workspace comments" ON public.document_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

-- Reviewer sees comments in workspaces they were invited to
CREATE POLICY "Reviewer views workspace comments" ON public.document_comments
  FOR SELECT USING (public.is_workspace_reviewer(assessment_id, auth.uid()));

-- Either party can add comments to a workspace they have access to
CREATE POLICY "Members add comments" ON public.document_comments
  FOR INSERT WITH CHECK (
    author_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
      OR public.is_workspace_reviewer(assessment_id, auth.uid())
    )
  );

-- Author can update / resolve own comment; owner can resolve any
CREATE POLICY "Author updates own comment" ON public.document_comments
  FOR UPDATE USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

CREATE POLICY "Author deletes own comment" ON public.document_comments
  FOR DELETE USING (
    author_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid())
  );

-- updated_at trigger
CREATE TRIGGER update_document_comments_updated_at
BEFORE UPDATE ON public.document_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();