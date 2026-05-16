-- 004_phase4_milestones.sql
-- Phase 4: Agent 2 + Milestone Roadmap

-- Add warmup_resources to milestones
-- Shape: [{ title, url, concept, type }]
alter table public.milestones
  add column if not exists warmup_resources jsonb not null default '[]'::jsonb;

-- Add project_data to projects
-- Stores the full ProjectIdea JSON so Agent 2 has conceptsEncountered, skillsBuilt, estimatedHours
alter table public.projects
  add column if not exists project_data jsonb;
