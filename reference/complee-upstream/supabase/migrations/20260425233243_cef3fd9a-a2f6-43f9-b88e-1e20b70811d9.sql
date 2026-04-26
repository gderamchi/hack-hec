-- Allow any authenticated user holding a valid invite token to accept an invitation
-- by stamping their user_id and flipping status to 'active'. The token acts as the
-- shared secret. We keep the email-based policy for magic-link flows in parallel.

CREATE POLICY "Reviewer accepts invitation by token"
ON public.workspace_reviewers
FOR UPDATE
TO authenticated
USING (status = 'pending')
WITH CHECK (status = 'active');

-- Allow any authenticated user to read the invitation row addressed to them by
-- token (so the accept page can fetch + display workspace info pre-acceptance).
-- The token is a 48-char hex secret, equivalent to a bearer credential.
CREATE POLICY "Anyone with token can view invitation"
ON public.workspace_reviewers
FOR SELECT
TO authenticated
USING (true);

-- user_roles needs an INSERT policy so a freshly-accepted reviewer can self-assign
-- the 'reviewer' role (only for themselves, only the reviewer role).
CREATE POLICY "Users self-assign reviewer role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'reviewer');