-- Documents library table
CREATE TABLE public.signed_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  requirement_id TEXT,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'step', -- 'step' | 'master' | 'upload'
  storage_path TEXT NOT NULL,
  signed_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'unsigned', -- 'unsigned' | 'signed'
  signer_name TEXT,
  signature_method TEXT, -- 'typed' | 'drawn'
  signature_hash TEXT,
  signed_ip TEXT,
  signed_user_agent TEXT,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signed documents"
  ON public.signed_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own signed documents"
  ON public.signed_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own signed documents"
  ON public.signed_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own signed documents"
  ON public.signed_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_signed_documents_user ON public.signed_documents(user_id);
CREATE INDEX idx_signed_documents_assessment ON public.signed_documents(assessment_id);

CREATE TRIGGER update_signed_documents_updated_at
BEFORE UPDATE ON public.signed_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Files are stored under {user_id}/...
CREATE POLICY "Users view own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);