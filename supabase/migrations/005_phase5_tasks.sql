-- 005_phase5_tasks.sql
-- Phase 5: Agent 3 + Task Flow

-- Add concept_resources to tasks
-- Shape: [{ title, url, concept, type }] — 1-2 items per task
-- Provides a task-level "Learn this concept" shelf for the task's primary concept
alter table public.tasks
  add column if not exists concept_resources jsonb not null default '[]'::jsonb;
