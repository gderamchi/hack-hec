create table if not exists analysis_runs (
  id uuid primary key,
  company_name text not null,
  company_type text not null,
  country text not null,
  services jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  analysis_engine text,
  model text,
  reasoning_effort text,
  analysis_warnings jsonb not null default '[]'::jsonb,
  regulatory_sources jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists analysis_documents (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references analysis_runs(id) on delete cascade,
  name text not null,
  type text not null,
  content text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists evidence_matrix_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references analysis_runs(id) on delete cascade,
  requirement_id text not null,
  domain text not null,
  requirement_title text not null,
  regulatory_reference text,
  source_url text,
  status text not null,
  evidence_found text not null,
  source_document text,
  evidence_excerpt text,
  missing_evidence jsonb not null default '[]'::jsonb,
  priority text not null,
  confidence numeric not null,
  recommended_task text not null
);

create table if not exists roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references analysis_runs(id) on delete cascade,
  title text not null,
  owner text not null,
  priority text not null,
  deadline text not null,
  evidence_required jsonb not null default '[]'::jsonb,
  acceptance_criteria text not null,
  linked_requirement_ids jsonb not null default '[]'::jsonb
);

alter table analysis_runs add column if not exists analysis_engine text;
alter table analysis_runs add column if not exists model text;
alter table analysis_runs add column if not exists reasoning_effort text;
alter table analysis_runs add column if not exists analysis_warnings jsonb not null default '[]'::jsonb;
alter table analysis_runs add column if not exists regulatory_sources jsonb not null default '[]'::jsonb;

alter table evidence_matrix_items add column if not exists regulatory_reference text;
alter table evidence_matrix_items add column if not exists source_url text;
