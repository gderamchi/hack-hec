-- ─── Compliance Agent Tables ──────────────────────────────────────────────────
-- Isolated from existing schema. No modifications to existing tables.

create table if not exists compliance_profiles (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  operating_model jsonb not null default '{}'::jsonb,
  active_regulations jsonb not null default '["DORA","PSD3/PSR","EU AI Act","FCA Consumer Duty"]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists regulation_change_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references compliance_profiles(id) on delete cascade,
  regulation_name text not null,
  jurisdiction text not null default '',
  change_summary text not null default '',
  regulation_text text not null default '',
  relevance_score integer not null default 0,
  status text not null default 'detected'
    check (status in ('detected','irrelevant','pending_review','accepted','rejected')),
  propagation_result jsonb,
  extraction_result jsonb,
  detected_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone
);

create table if not exists remediation_plans (
  id uuid primary key default gen_random_uuid(),
  change_event_id uuid not null references regulation_change_events(id) on delete cascade,
  profile_id uuid not null references compliance_profiles(id) on delete cascade,
  actions jsonb not null default '[]'::jsonb,
  conflict_flags jsonb not null default '[]'::jsonb,
  conflict_check_status text not null default 'pending'
    check (conflict_check_status in ('pending','safe','flagged')),
  status text not null default 'draft'
    check (status in ('draft','conflict_flagged','accepted','rejected')),
  accepted_by text,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists agent_activity_log (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references compliance_profiles(id) on delete cascade,
  event_type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_rce_profile_status on regulation_change_events(profile_id, status);
create index if not exists idx_rplan_event on remediation_plans(change_event_id);
create index if not exists idx_rplan_profile on remediation_plans(profile_id);
create index if not exists idx_agent_log_profile_time on agent_activity_log(profile_id, created_at desc);
