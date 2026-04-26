ALTER TABLE public.step_progress
  ADD CONSTRAINT step_progress_user_assessment_req_unique
  UNIQUE (user_id, assessment_id, requirement_id);