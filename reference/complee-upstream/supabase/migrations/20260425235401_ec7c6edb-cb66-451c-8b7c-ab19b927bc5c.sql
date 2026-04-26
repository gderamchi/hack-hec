-- Backfill: link orphaned signed_documents to the only assessment of their owner
UPDATE public.signed_documents sd
SET assessment_id = a.id
FROM public.assessments a
WHERE sd.assessment_id IS NULL
  AND sd.user_id = a.user_id
  AND (
    SELECT COUNT(*) FROM public.assessments a2 WHERE a2.user_id = sd.user_id
  ) = 1;