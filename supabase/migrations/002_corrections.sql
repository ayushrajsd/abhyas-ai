-- 002_corrections.sql
-- Fixes three issues from Phase 1 that were decided after implementation.

-- FIX 1: complexity check constraint
-- 'easy' and 'medium' are wrong. The correct values are 'beginner' and 'intermediate'.
alter table public.projects
  drop constraint if exists projects_complexity_check;

alter table public.projects
  add constraint projects_complexity_check
  check (complexity in ('beginner', 'intermediate', 'challenging'));

-- FIX 2: setup_checklist column on milestones
-- Agent 2 (Milestone Architect) generates a setup checklist for Milestone 1 only.
-- Shape: [{ item: string, command: string | null, done: boolean }]
alter table public.milestones
  add column if not exists setup_checklist jsonb;

-- FIX 3: learner_stats table
-- One row per user. Created on first COMPLETE_PROJECT.
-- avg_nudge_level: rolling average across all projects (1.0 = independent, 3.0 = needs support).
-- Read by Agent 4 as secondary scaffolding signal and Agent 6 for private reflection.
create table if not exists public.learner_stats (
  user_id         uuid primary key references public.users(id) on delete cascade,
  projects_done   integer default 0,
  avg_nudge_level numeric(3,2) default 0,
  last_complexity text check (last_complexity in ('beginner', 'intermediate', 'challenging')),
  suggested_next  text,
  updated_at      timestamptz default now()
);

alter table public.learner_stats enable row level security;

create policy "learner_stats_own"
  on public.learner_stats
  for all
  using (auth.uid() = user_id);
