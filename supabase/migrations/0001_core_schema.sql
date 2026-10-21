-- PeopleLogic core schema: multi-tenant, RLS on every tenant-owned table.
-- Apply with `supabase db push` or by running this file in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type org_role as enum ('owner','admin','hr_director','people_analyst','dept_manager','exec_viewer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- identity
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  industry text,
  size_band text,
  -- privacy: minimum group size before team-level survey/sensitive insights are shown
  min_group_size int not null default 8 check (min_group_size between 5 and 200),
  retention_days int not null default 365 check (retention_days between 30 and 3650),
  onboarding_step int not null default 0,
  onboarding_done boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null,
  -- department managers only see these teams (empty = none)
  team_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists idx_members_user on organization_members(user_id);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role org_role not null,
  team_ids uuid[] not null default '{}',
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index if not exists idx_invites_org on invitations(org_id);

-- ---------------------------------------------------------------- org structure
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  department_id uuid references departments(id) on delete set null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);
create index if not exists idx_teams_org on teams(org_id);

-- ---------------------------------------------------------------- aggregated workforce data (no individual records)
create table if not exists workforce_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  period date not null,
  headcount int not null check (headcount >= 0),
  import_job_id uuid,
  created_at timestamptz not null default now(),
  unique (team_id, period)
);
create table if not exists workforce_metrics (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  period date not null,
  metric text not null,
  value numeric not null,
  provenance text not null default 'imported' check (provenance in ('imported','user_entered','estimated')),
  import_job_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists turnover_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  period date not null,
  departures int not null check (departures >= 0),
  voluntary int check (voluntary >= 0),
  involuntary int check (involuntary >= 0),
  import_job_id uuid,
  created_at timestamptz not null default now(),
  unique (team_id, period)
);
create table if not exists staffing_records (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  period date not null,
  approved_positions int not null check (approved_positions >= 0),
  open_positions int not null default 0 check (open_positions >= 0),
  hires int not null default 0 check (hires >= 0),
  import_job_id uuid,
  created_at timestamptz not null default now(),
  unique (team_id, period)
);
create table if not exists workload_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  period date not null,
  demand_hours numeric check (demand_hours >= 0),
  capacity_hours numeric check (capacity_hours >= 0),
  overtime_hours numeric check (overtime_hours >= 0),
  backlog int check (backlog >= 0),
  import_job_id uuid,
  created_at timestamptz not null default now(),
  unique (team_id, period)
);

-- ---------------------------------------------------------------- feedback (privacy-preserving: no respondent identifiers stored)
create table if not exists feedback_surveys (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  period date not null,
  respondents int not null default 0,
  import_job_id uuid,
  created_at timestamptz not null default now()
);
create table if not exists feedback_responses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  survey_id uuid not null references feedback_surveys(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  theme text,
  sentiment numeric check (sentiment between -1 and 1),
  score numeric,
  comment_redacted text,
  created_at timestamptz not null default now()
);
create index if not exists idx_fb_survey on feedback_responses(survey_id);

-- ---------------------------------------------------------------- analysis outputs
create table if not exists analysis_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text not null,
  period_start date,
  period_end date,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists attrition_insights (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid references analysis_runs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  evidence_level text not null check (evidence_level in ('observed_indicator','potential_risk_signal','model_estimate','ai_explanation','verified_finding')),
  title text not null,
  detail jsonb not null default '{}'::jsonb,
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  review_status text not null default 'unreviewed' check (review_status in ('unreviewed','reviewed','verified','dismissed')),
  reviewer_note text,
  created_at timestamptz not null default now()
);
create table if not exists root_cause_findings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  run_id uuid references analysis_runs(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  observed_pattern text not null,
  evidence jsonb not null default '[]'::jsonb,
  possible_explanation text,
  alternative_explanations jsonb not null default '[]'::jsonb,
  confidence text not null default 'low',
  additional_data_needed jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  period_start date,
  period_end date,
  review_status text not null default 'unreviewed',
  created_at timestamptz not null default now()
);
create table if not exists manager_recommendations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  recommendation text not null,
  evidence text,
  intended_outcome text,
  owner_role text,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  review_date date,
  status text not null default 'proposed' check (status in ('proposed','accepted','in_progress','completed','dismissed')),
  outcome_notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists intervention_actions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  source text,
  title text not null,
  description text,
  owner text,
  due_date date,
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists intervention_outcomes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  action_id uuid not null references intervention_actions(id) on delete cascade,
  useful text check (useful in ('yes','partly','no','too_early')),
  notes text,
  recorded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- scenarios & costs
create table if not exists workforce_scenarios (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete set null,
  name text not null,
  is_base boolean not null default false,
  result jsonb not null default '{}'::jsonb,
  explanation text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  scenario_id uuid not null references workforce_scenarios(id) on delete cascade,
  key text not null,
  value numeric,
  provenance text not null default 'user_entered' check (provenance in ('observed','user_entered','estimated')),
  created_at timestamptz not null default now()
);
create table if not exists turnover_cost_models (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  team_id uuid references teams(id) on delete cascade,
  period date not null,
  departures int not null default 0 check (departures >= 0),
  recruitment_cost numeric not null default 0 check (recruitment_cost >= 0),
  onboarding_cost numeric not null default 0 check (onboarding_cost >= 0),
  training_cost numeric not null default 0 check (training_cost >= 0),
  temp_staffing_cost numeric not null default 0 check (temp_staffing_cost >= 0),
  vacancy_days numeric not null default 0 check (vacancy_days >= 0),
  daily_lost_capacity_cost numeric not null default 0 check (daily_lost_capacity_cost >= 0),
  manager_hours numeric not null default 0 check (manager_hours >= 0),
  manager_hourly_cost numeric not null default 0 check (manager_hourly_cost >= 0),
  provenance text not null default 'user_entered' check (provenance in ('imported','user_entered','estimated')),
  import_job_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- reports
create table if not exists leadership_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  report_type text not null,
  title text not null,
  period_start date,
  period_end date,
  scope_team_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','final')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists report_sections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  report_id uuid not null references leadership_reports(id) on delete cascade,
  position int not null,
  heading text not null,
  body text not null default '',
  provenance text not null default 'calculated',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- data sources & imports
create table if not exists data_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  kind text not null,
  label text not null,
  status text not null default 'active',
  last_synced_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists integration_connections (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'not_connected',
  last_sync_at timestamptz,
  last_error text,
  -- credentials must be written only by trusted server code; never selectable by clients
  credentials_encrypted text,
  created_at timestamptz not null default now(),
  unique (org_id, provider)
);
create table if not exists import_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  dataset_type text not null,
  filename text,
  status text not null default 'completed' check (status in ('processing','completed','failed')),
  rows_total int not null default 0,
  rows_imported int not null default 0,
  rows_rejected int not null default 0,
  rows_duplicate int not null default 0,
  mapping jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists import_errors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  import_job_id uuid not null references import_jobs(id) on delete cascade,
  row_number int,
  field text,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- AI conversations
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);
create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  structured jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- billing, usage, audit
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade unique,
  plan text not null check (plan in ('professional','enterprise')),
  status text not null default 'pending_verification' check (status in ('pending_verification','active','past_due','canceled')),
  external_reference text,
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists credit_balances (
  org_id uuid primary key references organizations(id) on delete cascade,
  balance numeric not null default 0 check (balance >= 0),
  low_threshold numeric,
  updated_at timestamptz not null default now()
);
create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  operation text not null,
  model text,
  tokens_used int,
  credits_charged numeric not null default 0,
  status text not null check (status in ('success','failed','refunded','blocked')),
  error_category text,
  created_at timestamptz not null default now()
);
create index if not exists idx_usage_org on usage_events(org_id, created_at desc);
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  entity text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_org on audit_logs(org_id, created_at desc);

-- ---------------------------------------------------------------- helper functions
create or replace function is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where org_id = p_org and user_id = auth.uid());
$$;

create or replace function org_role_of(p_org uuid) returns org_role
language sql stable security definer set search_path = public as $$
  select role from organization_members where org_id = p_org and user_id = auth.uid();
$$;

create or replace function has_org_role(p_org uuid, p_roles org_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(org_role_of(p_org) = any(p_roles), false);
$$;

-- department managers are limited to their assigned teams; other roles see all teams
create or replace function can_see_team(p_org uuid, p_team uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when not is_org_member(p_org) then false
    when org_role_of(p_org) = 'dept_manager' then
      p_team is not null and p_team = any((select team_ids from organization_members where org_id = p_org and user_id = auth.uid()))
    else true
  end;
$$;

-- ---------------------------------------------------------------- RLS
-- 1) profiles
alter table profiles enable row level security;
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles for all using (id = auth.uid()) with check (id = auth.uid());

-- 2) organizations: members read; owner/admin update. Creation happens via create_organization().
alter table organizations enable row level security;
drop policy if exists org_read on organizations;
drop policy if exists org_update on organizations;
create policy org_read on organizations for select using (is_org_member(id));
create policy org_update on organizations for update using (has_org_role(id, array['owner','admin']::org_role[]))
  with check (has_org_role(id, array['owner','admin']::org_role[]));

-- 3) membership & invitations: members can see the roster; owner/admin manage
alter table organization_members enable row level security;
drop policy if exists mem_read on organization_members;
drop policy if exists mem_write on organization_members;
create policy mem_read on organization_members for select using (is_org_member(org_id));
create policy mem_write on organization_members for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]) and role <> 'owner');

alter table invitations enable row level security;
drop policy if exists inv_all on invitations;
create policy inv_all on invitations for all
  using (has_org_role(org_id, array['owner','admin']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin']::org_role[]) and role <> 'owner');

-- 4) generic policies for tenant tables
do $$
declare
  t text;
  -- readable by every member
  read_all text[] := array['departments','analysis_runs','leadership_reports','report_sections','data_sources','import_jobs',
    'attrition_insights','root_cause_findings','manager_recommendations','intervention_actions','intervention_outcomes',
    'workforce_scenarios','scenario_assumptions','turnover_cost_models','workforce_metrics'];
  -- team-scoped: department managers restricted to assigned teams
  team_scoped text[] := array['teams','workforce_snapshots','turnover_records','staffing_records','workload_snapshots'];
  writers text[] := array['owner','admin','hr_director','people_analyst'];
begin
  foreach t in array read_all loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t||'_read', t);
    execute format('drop policy if exists %I on %I', t||'_write', t);
    execute format('create policy %I on %I for select using (is_org_member(org_id))', t||'_read', t);
    execute format($f$create policy %I on %I for all using (has_org_role(org_id, %L::org_role[])) with check (has_org_role(org_id, %L::org_role[]))$f$,
      t||'_write', t, writers, writers);
  end loop;

  -- tables that carry team_id get manager scoping on SELECT
  foreach t in array array['attrition_insights','root_cause_findings','manager_recommendations','intervention_actions','turnover_cost_models','workforce_metrics'] loop
    execute format('drop policy if exists %I on %I', t||'_read', t);
    execute format('create policy %I on %I for select using (is_org_member(org_id) and (team_id is null and org_role_of(org_id) <> ''dept_manager'' or can_see_team(org_id, team_id)))', t||'_read', t);
  end loop;

  foreach t in array team_scoped loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I on %I', t||'_read', t);
    execute format('drop policy if exists %I on %I', t||'_write', t);
    if t = 'teams' then
      execute format('create policy %I on %I for select using (can_see_team(org_id, id))', t||'_read', t);
    else
      execute format('create policy %I on %I for select using (can_see_team(org_id, team_id))', t||'_read', t);
    end if;
    execute format($f$create policy %I on %I for all using (has_org_role(org_id, %L::org_role[])) with check (has_org_role(org_id, %L::org_role[]))$f$,
      t||'_write', t, writers, writers);
  end loop;
end $$;

-- managers may log recommendation/intervention outcomes for their own teams
drop policy if exists mgr_rec_update on manager_recommendations;
create policy mgr_rec_update on manager_recommendations for update
  using (org_role_of(org_id) = 'dept_manager' and can_see_team(org_id, team_id))
  with check (org_role_of(org_id) = 'dept_manager' and can_see_team(org_id, team_id));
drop policy if exists mgr_int_update on intervention_actions;
create policy mgr_int_update on intervention_actions for update
  using (org_role_of(org_id) = 'dept_manager' and can_see_team(org_id, team_id))
  with check (org_role_of(org_id) = 'dept_manager' and can_see_team(org_id, team_id));

-- 5) feedback: aggregate-ready tables visible to analyst+ only; managers/exec never read raw responses.
alter table feedback_surveys enable row level security;
alter table feedback_responses enable row level security;
drop policy if exists fbs_read on feedback_surveys;
drop policy if exists fbs_write on feedback_surveys;
drop policy if exists fbr_read on feedback_responses;
drop policy if exists fbr_write on feedback_responses;
create policy fbs_read on feedback_surveys for select using (is_org_member(org_id));
create policy fbs_write on feedback_surveys for all
  using (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]));
create policy fbr_read on feedback_responses for select
  using (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]));
create policy fbr_write on feedback_responses for all
  using (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]))
  with check (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]));

-- 6) import errors, integrations
alter table import_errors enable row level security;
drop policy if exists ie_read on import_errors;
drop policy if exists ie_write on import_errors;
create policy ie_read on import_errors for select using (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]));
create policy ie_write on import_errors for insert with check (has_org_role(org_id, array['owner','admin','hr_director','people_analyst']::org_role[]));

alter table integration_connections enable row level security;
drop policy if exists ic_read on integration_connections;
create policy ic_read on integration_connections for select using (has_org_role(org_id, array['owner','admin']::org_role[]));
-- writes: service role only (no client policy). Credential column is never returned to clients by the app.

-- 7) AI conversations: owned by user within the org
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
drop policy if exists conv_own on ai_conversations;
drop policy if exists msg_own on ai_messages;
create policy conv_own on ai_conversations for all
  using (user_id = auth.uid() and is_org_member(org_id))
  with check (user_id = auth.uid() and is_org_member(org_id));
create policy msg_own on ai_messages for all
  using (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()) and is_org_member(org_id))
  with check (exists (select 1 from ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()) and is_org_member(org_id));

-- 8) billing/usage/audit: members read (billing: owner/admin/hr), writes through trusted functions only
alter table subscriptions enable row level security;
alter table credit_balances enable row level security;
alter table usage_events enable row level security;
alter table audit_logs enable row level security;
drop policy if exists sub_read on subscriptions;
drop policy if exists cb_read on credit_balances;
drop policy if exists ue_read on usage_events;
drop policy if exists al_read on audit_logs;
create policy sub_read on subscriptions for select using (is_org_member(org_id));
create policy cb_read on credit_balances for select using (is_org_member(org_id));
create policy ue_read on usage_events for select using (has_org_role(org_id, array['owner','admin','hr_director']::org_role[]));
create policy al_read on audit_logs for select using (has_org_role(org_id, array['owner','admin','hr_director']::org_role[]));
-- no insert/update/delete policies on these four tables: only security-definer functions or the service role can write.

-- ---------------------------------------------------------------- trusted functions
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create or replace function create_organization(p_name text, p_industry text default null, p_size text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into organizations (name, industry, size_band, created_by) values (p_name, p_industry, p_size, auth.uid()) returning id into v_org;
  insert into organization_members (org_id, user_id, role) values (v_org, auth.uid(), 'owner');
  insert into audit_logs (org_id, user_id, action, entity) values (v_org, auth.uid(), 'organization.created', 'organizations');
  return v_org;
end $$;

create or replace function accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare inv invitations; v_email text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select email into v_email from auth.users where id = auth.uid();
  select * into inv from invitations where token = p_token and accepted_at is null and expires_at > now();
  if not found then raise exception 'invitation invalid or expired'; end if;
  if lower(inv.email) <> lower(v_email) then raise exception 'invitation was issued to a different email address'; end if;
  insert into organization_members (org_id, user_id, role, team_ids) values (inv.org_id, auth.uid(), inv.role, inv.team_ids)
    on conflict (org_id, user_id) do update set role = excluded.role, team_ids = excluded.team_ids;
  update invitations set accepted_at = now() where id = inv.id;
  insert into audit_logs (org_id, user_id, action, entity) values (inv.org_id, auth.uid(), 'invitation.accepted', 'invitations');
  return inv.org_id;
end $$;

create or replace function log_audit(p_org uuid, p_action text, p_entity text, p_detail jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_org_member(p_org) then raise exception 'forbidden'; end if;
  insert into audit_logs (org_id, user_id, action, entity, detail) values (p_org, auth.uid(), p_action, p_entity, p_detail);
end $$;

-- Atomic credit reservation. Returns usage_event id. If the org has no credit_balances row,
-- credits are "not configured": the call is logged but not metered.
create or replace function reserve_credits(p_org uuid, p_user uuid, p_operation text, p_amount numeric, p_model text default null)
returns table (usage_id uuid, metered boolean) language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_rows int; v_metered boolean;
begin
  -- Called only by trusted server code (service role) AFTER it verified membership of p_user.
  if p_amount < 0 then raise exception 'invalid amount'; end if;
  select exists (select 1 from credit_balances where org_id = p_org) into v_metered;
  if v_metered then
    update credit_balances set balance = balance - p_amount, updated_at = now()
      where org_id = p_org and balance >= p_amount;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into usage_events (org_id, user_id, operation, model, credits_charged, status, error_category)
        values (p_org, p_user, p_operation, p_model, 0, 'blocked', 'insufficient_credits');
      raise exception 'insufficient_credits';
    end if;
  end if;
  insert into usage_events (org_id, user_id, operation, model, credits_charged, status)
    values (p_org, p_user, p_operation, p_model, case when v_metered then p_amount else 0 end, 'success')
    returning id into v_id;
  return query select v_id, v_metered;
end $$;

create or replace function finalize_usage(p_usage uuid, p_ok boolean, p_tokens int default null, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
declare ev usage_events;
begin
  select * into ev from usage_events where id = p_usage for update;
  if not found or ev.status <> 'success' then return; end if;
  if p_ok then
    update usage_events set tokens_used = p_tokens where id = p_usage;
  else
    if ev.credits_charged > 0 then
      update credit_balances set balance = balance + ev.credits_charged, updated_at = now() where org_id = ev.org_id;
    end if;
    update usage_events set status = case when ev.credits_charged > 0 then 'refunded' else 'failed' end,
      error_category = p_error where id = p_usage;
  end if;
end $$;

-- Organization data deletion workflow (owner only): removes all tenant data, keeps the audit trail row.
create or replace function delete_organization_data(p_org uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_org_role(p_org, array['owner']::org_role[]) then raise exception 'forbidden'; end if;
  delete from organizations where id = p_org;
end $$;

grant execute on function create_organization(text,text,text) to authenticated;
grant execute on function accept_invitation(text) to authenticated;
grant execute on function log_audit(uuid,text,text,jsonb) to authenticated;
-- credit functions are service-role only so clients cannot self-refund or forge usage
revoke all on function reserve_credits(uuid,uuid,text,numeric,text) from public, anon, authenticated;
revoke all on function finalize_usage(uuid,boolean,int,text) from public, anon, authenticated;
grant execute on function reserve_credits(uuid,uuid,text,numeric,text) to service_role;
grant execute on function finalize_usage(uuid,boolean,int,text) to service_role;
grant execute on function delete_organization_data(uuid) to authenticated;

-- ---------------------------------------------------------------- co-member profile visibility & retention
create or replace function shares_org_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from organization_members a join organization_members b on a.org_id = b.org_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;
drop policy if exists profiles_comember on profiles;
create policy profiles_comember on profiles for select using (shares_org_with(id));

-- Removes survey response records older than the organization's retention period.
-- Schedule with pg_cron (if enabled) for automatic enforcement; the Settings page can also trigger it.
create or replace function apply_retention(p_org uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_days int; v_n int;
begin
  if not has_org_role(p_org, array['owner','admin']::org_role[]) then raise exception 'forbidden'; end if;
  select retention_days into v_days from organizations where id = p_org;
  delete from feedback_responses where org_id = p_org and created_at < now() - make_interval(days => v_days);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
grant execute on function shares_org_with(uuid) to authenticated;
grant execute on function apply_retention(uuid) to authenticated;
