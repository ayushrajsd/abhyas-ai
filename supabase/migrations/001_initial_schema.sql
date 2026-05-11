-- gen_random_uuid() is built into Postgres 13+ — no extension needed

-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  github_username text,
  github_avatar text,
  github_token text,             -- AES-256-GCM encrypted, read:user + user:email scope
  github_repo_token text,        -- AES-256-GCM encrypted, repo scope — NULL until Verifier requested
  encrypted_api_key text,        -- AES-256-GCM encrypted — NULL until onboarding complete
  api_provider text check (api_provider in ('anthropic', 'openai')),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz default now()
);

-- PROJECTS
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  title text not null,
  description text not null,
  complexity text check (complexity in ('easy', 'medium', 'challenging')),
  status text default 'active' check (status in ('active', 'complete', 'paused')),
  github_repo text,
  created_at timestamptz default now()
);

-- MILESTONES
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  learning_objectives text[] not null default '{}',
  concepts_introduced text[] not null default '{}',
  order_index integer not null,
  status text default 'locked' check (status in ('locked', 'active', 'complete')),
  verification_type text check (verification_type in ('verified', 'self')),
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- TASKS
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  description text not null,
  concept text not null,
  done_when text not null,
  prewritten_hints jsonb not null default '{"l1": "", "l2": "", "l3": ""}',
  order_index integer not null,
  status text default 'locked' check (status in ('locked', 'active', 'done')),
  estimated_minutes integer,
  created_at timestamptz default now()
);

-- NUDGE SESSIONS
create table public.nudge_sessions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stuck_description text not null,
  code_snippet text,
  nudge_level integer not null check (nudge_level in (1, 2, 3)),
  response text not null,
  was_helpful boolean,
  created_at timestamptz default now()
);

-- VERIFICATION RUNS
create table public.verification_runs (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('complete', 'partial', 'incorrect', 'cannot_assess')),
  feedback text not null,
  files_reviewed text[] not null default '{}',
  commit_sha text,
  created_at timestamptz default now()
);

-- COMPLETION POSTS
create table public.completion_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  project_summary text not null,
  concepts_mastered text[] not null default '{}',
  post_technical text not null,
  post_story text not null,
  post_achievement text not null,
  shared_at timestamptz,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.nudge_sessions enable row level security;
alter table public.verification_runs enable row level security;
alter table public.completion_posts enable row level security;

-- RLS Policies — each user sees only their own data
create policy "users_own" on public.users for all using (auth.uid() = id);
create policy "projects_own" on public.projects for all using (auth.uid() = user_id);
create policy "milestones_own" on public.milestones for all
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "tasks_own" on public.tasks for all
  using (milestone_id in (
    select m.id from public.milestones m
    join public.projects p on p.id = m.project_id
    where p.user_id = auth.uid()
  ));
create policy "nudge_sessions_own" on public.nudge_sessions for all using (auth.uid() = user_id);
create policy "verification_runs_own" on public.verification_runs for all using (auth.uid() = user_id);
create policy "completion_posts_own" on public.completion_posts for all using (auth.uid() = user_id);

-- Indexes for known query patterns
create index projects_user_id on public.projects(user_id);
create index milestones_project_id on public.milestones(project_id, order_index);
create index tasks_milestone_id on public.tasks(milestone_id, order_index);
create index nudge_sessions_task_id on public.nudge_sessions(task_id);
create index nudge_sessions_user_id on public.nudge_sessions(user_id);
create index verification_runs_milestone_id on public.verification_runs(milestone_id);
