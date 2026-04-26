CREATE OR REPLACE FUNCTION public.can_access_reviewer_document_object(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.signed_documents sd
    WHERE (sd.storage_path = _path OR sd.signed_storage_path = _path)
      AND sd.assessment_id IS NOT NULL
      AND public.is_workspace_reviewer(sd.assessment_id, _user_id)
  )
$$;

CREATE POLICY "Reviewers view invited workspace files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents'
  AND public.can_access_reviewer_document_object(name, auth.uid())
);