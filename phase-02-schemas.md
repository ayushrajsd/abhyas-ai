# Phase 02 — DB Corrections + Zod Schemas
## Read CLAUDE.md first. Then read this file completely before writing a single line of code.

---

## What This Phase Builds

Two things. In this order. Do not mix them.

**Part A — DB Migration corrections** (do first, takes 10 minutes)
Three fixes to the Phase 1 migration that were decided after implementation:
1. Fix `complexity` check constraint on `projects` table (`easy/medium` → `beginner/intermediate`)
2. Add `setup_checklist` column to `milestones` table
3. Add the new `learner_stats` table

**Part B — Zod Schemas** (the main work of this phase)
Every schema for every agent's input and output, plus DB row types — written and exported before any agent code exists. This is the contract that all six agents will be built against.

**No agent code. No UI. No Server Actions beyond what's needed for the migration.**
If you find yourself writing agent logic, stop. That's Phase 3 onwards.

---

## Done When

- [ ] `supabase/migrations/002_corrections.sql` runs clean with `npx supabase db push`
- [ ] Supabase dashboard confirms: `projects.complexity` check constraint shows `beginner/intermediate/challenging`
- [ ] Supabase dashboard confirms: `milestones` table has `setup_checklist` column (jsonb, nullable)
- [ ] Supabase dashboard confirms: `learner_stats` table exists with RLS enabled
- [ ] `schemas/agents.ts` — file exists, all exports compile with `npx tsc --noEmit`
- [ ] `schemas/db.ts` — file exists, all exports compile with `npx tsc --noEmit`
- [ ] `import { ProjectIdeaSchema, MilestoneSchema, TaskSchema, NudgeOutputSchema, VerificationOutputSchema, CompletionOutputSchema } from '@/schemas/agents'` — no TypeScript errors
- [ ] `import { UserRow, ProjectRow, MilestoneRow, TaskRow, NudgeSessionRow, LearnerStatsRow } from '@/schemas/db'` — no TypeScript errors
- [ ] No agent files exist yet — `lib/agents/` directory is empty or does not exist

---

## Part A — Migration 002

Create `supabase/migrations/002_corrections.sql`. Run it with `npx supabase db push`.

```sql
-- 002_corrections.sql
-- Fixes three issues from Phase 1 that were decided after implementation.

-- FIX 1: complexity check constraint
-- 'easy' and 'medium' are wrong. The correct values are 'beginner' and 'intermediate'.
-- Drop the old constraint and add the correct one.
alter table public.projects
  drop constraint if exists projects_complexity_check;

alter table public.projects
  add constraint projects_complexity_check
  check (complexity in ('beginner', 'intermediate', 'challenging'));

-- FIX 2: setup_checklist column on milestones
-- Agent 2 (Milestone Architect) generates a setup checklist for Milestone 1 only.
-- Shape: [{ item: string, command: string | null, done: boolean }]
-- Null for all milestones except Milestone 1 (order_index = 0).
alter table public.milestones
  add column if not exists setup_checklist jsonb;

-- FIX 3: learner_stats table
-- One row per user. Created on first COMPLETE_PROJECT.
-- Updated on every subsequent COMPLETE_PROJECT.
-- avg_nudge_level: rolling average across all projects.
--   1.0 = always resolved at L1 (independent learner)
--   3.0 = always needed L3 (needs more support)
-- Read by Agent 4 as secondary scaffolding signal.
-- Read by Agent 6 to generate the private reflection paragraph.
create table if not exists public.learner_stats (
  user_id         uuid primary key references public.users(id) on delete cascade,
  projects_done   integer default 0,
  avg_nudge_level numeric(3,2) default 0,
  last_complexity text check (last_complexity in ('beginner', 'intermediate', 'challenging')),
  suggested_next  text,          -- what Narrator suggested at last project completion
  updated_at      timestamptz default now()
);

alter table public.learner_stats enable row level security;

create policy "learner_stats_own"
  on public.learner_stats
  for all
  using (auth.uid() = user_id);
```

**Verify before moving to Part B:**
Open Supabase dashboard → Table Editor. Confirm all three fixes are in place. Do not start schemas until the DB is correct — the DB schema is the ground truth that schemas/db.ts must match.

---

## Part B — Zod Schemas

### Why schemas before agents

Every agent file will import its input and output types from `schemas/agents.ts`. If an agent produces output that doesn't match the schema, it throws at runtime — not silently fails. This is the contract.

Writing schemas first also forces precision. If you cannot write a Zod schema for an agent's output, you do not yet know what that agent should produce. The schema is the spec.

### Two files

```
schemas/
  agents.ts    ← agent I/O contracts — imported by lib/agents/*
  db.ts        ← DB row types — imported by Server Actions and anywhere that reads from Supabase
```

---

### `schemas/db.ts`

DB row types. These mirror the Supabase tables exactly. Used in Server Actions when reading from or writing to the DB.

```typescript
import { z } from 'zod'

// ─── Shared enums ────────────────────────────────────────────────────────────

export const ProviderSchema = z.enum(['anthropic', 'openai'])
export const SkillLevelSchema = z.enum(['beginner', 'intermediate', 'advanced'])
export const ComplexitySchema = z.enum(['beginner', 'intermediate', 'challenging'])
export const ProjectStatusSchema = z.enum(['active', 'complete', 'paused'])
export const MilestoneStatusSchema = z.enum(['locked', 'active', 'complete'])
export const VerificationTypeSchema = z.enum(['verified', 'self'])
export const TaskStatusSchema = z.enum(['locked', 'active', 'done'])
export const VerificationStatusSchema = z.enum(['complete', 'partial', 'incorrect', 'cannot_assess'])

// ─── Setup checklist item ─────────────────────────────────────────────────────
// Stored as jsonb in milestones.setup_checklist (Milestone 1 only)

export const SetupItemSchema = z.object({
  item:    z.string(),           // human-readable description
  command: z.string().nullable(), // exact terminal command, or null if no command needed
  done:    z.boolean().default(false),
})
export type SetupItem = z.infer<typeof SetupItemSchema>

// ─── DB Row types ─────────────────────────────────────────────────────────────

export const UserRowSchema = z.object({
  id:                z.string().uuid(),
  email:             z.string().email(),
  github_username:   z.string().nullable(),
  github_avatar:     z.string().nullable(),
  github_token:      z.string().nullable(),      // encrypted — never decrypt client-side
  github_repo_token: z.string().nullable(),      // encrypted — null until Verifier requested
  encrypted_api_key: z.string().nullable(),      // encrypted — null until onboarding complete
  api_provider:      ProviderSchema.nullable(),
  skill_level:       SkillLevelSchema.nullable(),
  created_at:        z.string(),
})
export type UserRow = z.infer<typeof UserRowSchema>

export const ProjectRowSchema = z.object({
  id:          z.string().uuid(),
  user_id:     z.string().uuid(),
  topic:       z.string(),
  title:       z.string(),
  description: z.string(),
  complexity:  ComplexitySchema,
  status:      ProjectStatusSchema,
  github_repo: z.string().nullable(),
  created_at:  z.string(),
})
export type ProjectRow = z.infer<typeof ProjectRowSchema>

export const MilestoneRowSchema = z.object({
  id:                  z.string().uuid(),
  project_id:          z.string().uuid(),
  title:               z.string(),
  description:         z.string(),
  learning_objectives: z.array(z.string()),
  concepts_introduced: z.array(z.string()),
  order_index:         z.number().int(),
  status:              MilestoneStatusSchema,
  verification_type:   VerificationTypeSchema.nullable(),
  verified_at:         z.string().nullable(),
  setup_checklist:     z.array(SetupItemSchema).nullable(), // only on Milestone 1
  created_at:          z.string(),
})
export type MilestoneRow = z.infer<typeof MilestoneRowSchema>

export const PrewrittenHintsSchema = z.object({
  l1: z.string(), // complexity-calibrated — see CLAUDE.md Adaptive Scaffolding
  l2: z.string(),
  l3: z.string(),
})
export type PrewrittenHints = z.infer<typeof PrewrittenHintsSchema>

export const TaskRowSchema = z.object({
  id:               z.string().uuid(),
  milestone_id:     z.string().uuid(),
  title:            z.string(),
  description:      z.string(),
  concept:          z.string(),
  done_when:        z.string(),         // specificity varies by complexity
  prewritten_hints: PrewrittenHintsSchema,
  order_index:      z.number().int(),
  status:           TaskStatusSchema,
  estimated_minutes: z.number().int().nullable(),
  created_at:       z.string(),
})
export type TaskRow = z.infer<typeof TaskRowSchema>

export const NudgeSessionRowSchema = z.object({
  id:               z.string().uuid(),
  task_id:          z.string().uuid(),
  user_id:          z.string().uuid(),
  stuck_description: z.string(),
  code_snippet:     z.string().nullable(),
  nudge_level:      z.union([z.literal(1), z.literal(2), z.literal(3)]),
  response:         z.string(),
  was_helpful:      z.boolean().nullable(),
  created_at:       z.string(),
})
export type NudgeSessionRow = z.infer<typeof NudgeSessionRowSchema>

export const VerificationRunRowSchema = z.object({
  id:             z.string().uuid(),
  milestone_id:   z.string().uuid(),
  user_id:        z.string().uuid(),
  status:         VerificationStatusSchema,
  feedback:       z.string(),
  files_reviewed: z.array(z.string()),
  commit_sha:     z.string().nullable(),
  created_at:     z.string(),
})
export type VerificationRunRow = z.infer<typeof VerificationRunRowSchema>

export const CompletionPostRowSchema = z.object({
  id:               z.string().uuid(),
  project_id:       z.string().uuid(),
  user_id:          z.string().uuid(),
  project_summary:  z.string(),
  concepts_mastered: z.array(z.string()),
  post_technical:   z.string(),
  post_story:       z.string(),
  post_achievement: z.string(),
  shared_at:        z.string().nullable(),
  created_at:       z.string(),
})
export type CompletionPostRow = z.infer<typeof CompletionPostRowSchema>

export const LearnerStatsRowSchema = z.object({
  user_id:         z.string().uuid(),
  projects_done:   z.number().int(),
  avg_nudge_level: z.number(),          // 1.0–3.0 rolling average
  last_complexity: ComplexitySchema.nullable(),
  suggested_next:  z.string().nullable(),
  updated_at:      z.string(),
})
export type LearnerStatsRow = z.infer<typeof LearnerStatsRowSchema>
```

---

### `schemas/agents.ts`

Agent I/O contracts. One input schema and one output schema per agent. These are the types that agent files will use. Nothing else.

```typescript
import { z } from 'zod'
import {
  ComplexitySchema,
  SetupItemSchema,
  PrewrittenHintsSchema,
  VerificationStatusSchema,
} from './db'

// ─── Shared agent types ───────────────────────────────────────────────────────

export const WarmupResourceSchema = z.object({
  title:   z.string(),
  url:     z.string().url(),
  concept: z.string(),  // which concept this resource covers
  type:    z.enum(['docs', 'video', 'article', 'interactive']),
})
export type WarmupResource = z.infer<typeof WarmupResourceSchema>

export const LearnerStatsInputSchema = z.object({
  avgNudgeLevel: z.number(),       // from learner_stats.avg_nudge_level
  projectsDone:  z.number().int(), // from learner_stats.projects_done
  lastComplexity: ComplexitySchema.nullable(),
})
export type LearnerStatsInput = z.infer<typeof LearnerStatsInputSchema>

// ─── Agent 1 — Project Ideator ────────────────────────────────────────────────
// Trigger: ENTER_TOPIC
// Model tier: fast

export const Agent1InputSchema = z.object({
  topic:            z.string().min(1),
  skillLevel:       z.enum(['beginner', 'intermediate', 'advanced']),
  existingProjects: z.array(z.string()).default([]), // titles of projects already done
})
export type Agent1Input = z.infer<typeof Agent1InputSchema>

export const ProjectIdeaSchema = z.object({
  id:               z.string(),           // generated client-side, used to select project
  title:            z.string(),
  description:      z.string(),
  complexity:       ComplexitySchema,
  estimatedHours:   z.number(),
  conceptsEncountered: z.array(z.string()), // what learner will meet — not prerequisites
  skillsBuilt:      z.array(z.string()),
  // warmupResources live on milestones, NOT on the project card
})
export type ProjectIdea = z.infer<typeof ProjectIdeaSchema>

export const Agent1OutputSchema = z.object({
  projects: z.array(ProjectIdeaSchema).min(5).max(7),
})
export type Agent1Output = z.infer<typeof Agent1OutputSchema>

// ─── Agent 2 — Milestone Architect ───────────────────────────────────────────
// Trigger: SELECT_PROJECT
// Model tier: capable

export const Agent2InputSchema = z.object({
  project:    ProjectIdeaSchema,
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  topic:      z.string(),
})
export type Agent2Input = z.infer<typeof Agent2InputSchema>

export const MilestoneSchema = z.object({
  title:               z.string(),
  description:         z.string(),
  learningObjectives:  z.array(z.string()),
  conceptsIntroduced:  z.array(z.string()), // NEW concepts only — no repeats from prior milestones
  warmupResources:     z.array(WarmupResourceSchema), // one per new concept
  orderIndex:          z.number().int(),
  // setupChecklist only on the first milestone (orderIndex === 0), null otherwise
  setupChecklist:      z.array(SetupItemSchema).nullable(),
})
export type Milestone = z.infer<typeof MilestoneSchema>

export const Agent2OutputSchema = z.object({
  milestones: z.array(MilestoneSchema).min(4).max(6),
})
export type Agent2Output = z.infer<typeof Agent2OutputSchema>

// ─── Agent 3 — Task Generator ─────────────────────────────────────────────────
// Trigger: SELECT_PROJECT (first milestone) + COMPLETE_TASK (subsequent milestones)
// Model tier: fast for tasks, capable for hints

export const Agent3InputSchema = z.object({
  milestone:           MilestoneSchema,
  project:             ProjectIdeaSchema,
  completedMilestones: z.array(z.string()), // titles of completed milestones for context
  skillLevel:          z.enum(['beginner', 'intermediate', 'advanced']),
  complexity:          ComplexitySchema,    // drives doneWhen specificity and hint character
})
export type Agent3Input = z.infer<typeof Agent3InputSchema>

export const TaskSchema = z.object({
  title:            z.string(),
  description:      z.string(),
  concept:          z.string(),     // core concept this task exercises
  doneWhen:         z.string(),     // specificity varies by complexity — see CLAUDE.md
  prewrittenHints:  PrewrittenHintsSchema, // character varies by complexity — see CLAUDE.md
  orderIndex:       z.number().int(),
  estimatedMinutes: z.number().int(),
})
export type Task = z.infer<typeof TaskSchema>

export const Agent3OutputSchema = z.object({
  tasks: z.array(TaskSchema).min(3).max(5),
})
export type Agent3Output = z.infer<typeof Agent3OutputSchema>

// ─── Agent 4 — Nudge Agent ────────────────────────────────────────────────────
// Trigger: REQUEST_NUDGE (only after pre-written hints have been served)
// Model tier: capable — NEVER downgrade
// Output is streamed — nudgeText arrives as a ReadableStream in the agent file
// This schema validates the non-streamed metadata returned alongside the stream

export const NudgeLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const Agent4InputSchema = z.object({
  task:             TaskSchema,
  stuckDescription: z.string().min(1),
  codeSnippet:      z.string().nullable(),  // optional paste from learner
  nudgeLevel:       NudgeLevelSchema,
  previousNudges:   z.array(z.object({
    level:    NudgeLevelSchema,
    response: z.string(),
  })).default([]),
  milestone:        MilestoneSchema,         // for warm-up shelf bridging
  complexity:       ComplexitySchema,        // PRIMARY scaffolding signal — drives tone
  learnerStats:     LearnerStatsInputSchema, // SECONDARY signal — informs calibration
})
export type Agent4Input = z.infer<typeof Agent4InputSchema>

export const NudgeOutputSchema = z.object({
  // nudgeText is NOT here — it's a ReadableStream returned separately
  nudgeLevel:        NudgeLevelSchema,
  conceptsAddressed: z.array(z.string()),
  suggestEscalation: z.boolean(), // true = agent thinks learner needs L+1
})
export type NudgeOutput = z.infer<typeof NudgeOutputSchema>

// ─── Agent 5 — Verifier ───────────────────────────────────────────────────────
// Trigger: VERIFY_MILESTONE (opt-in — self-verify is equally valid)
// Model tier: capable

export const Agent5InputSchema = z.object({
  milestone:   MilestoneSchema,
  tasks:       z.array(TaskSchema),
  githubRepo:  z.string(),    // "owner/repo" format
  commitRange: z.string(),    // e.g. "abc123..def456" or just latest commit SHA
})
export type Agent5Input = z.infer<typeof Agent5InputSchema>

export const VerificationOutputSchema = z.object({
  status:           VerificationStatusSchema,
  feedback:         z.string(),          // specific — references actual files and concepts
  filesReviewed:    z.array(z.string()), // paths of files Agent 5 actually read
  conceptsVerified: z.array(z.string()),
})
export type VerificationOutput = z.infer<typeof VerificationOutputSchema>

// ─── Agent 6 — Completion Narrator ───────────────────────────────────────────
// Trigger: COMPLETE_PROJECT
// Model tier: capable

export const Agent6InputSchema = z.object({
  project:              ProjectIdeaSchema,
  milestones:           z.array(MilestoneSchema),
  nudgeSessions:        z.array(z.object({
    taskTitle:    z.string(),
    nudgeLevel:   NudgeLevelSchema,
    response:     z.string(),
    wasHelpful:   z.boolean().nullable(),
  })),
  verificationRuns:     z.array(z.object({
    milestoneTitle:   z.string(),
    status:           VerificationStatusSchema,
    filesReviewed:    z.array(z.string()),
  })),
  warmupResources:      z.array(WarmupResourceSchema),
  totalHoursEstimated:  z.number(),
  learnerName:          z.string(),
  learnerStats:         LearnerStatsInputSchema,
})
export type Agent6Input = z.infer<typeof Agent6InputSchema>

export const CompletionPostSchema = z.object({
  variant: z.enum(['technical', 'story', 'achievement']),
  content: z.string(),
})
export type CompletionPost = z.infer<typeof CompletionPostSchema>

export const CompletionOutputSchema = z.object({
  posts:                  z.array(CompletionPostSchema).length(3),
  projectSummary:         z.string(),        // 2-3 sentences — stored permanently in DB
  conceptsMastered:       z.array(z.string()),
  nextComplexitySuggestion: z.string(),      // the private reflection paragraph
})
export type CompletionOutput = z.infer<typeof CompletionOutputSchema>

// ─── Orchestrator action types ────────────────────────────────────────────────
// These are not Zod schemas — they are TypeScript discriminated unions.
// The orchestrator is a switch statement, not an agent.

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
export type Complexity = 'beginner' | 'intermediate' | 'challenging'

export type UserAction =
  | { type: 'ENTER_TOPIC';      topic: string; skillLevel: SkillLevel }
  | { type: 'SELECT_PROJECT';   projectId: string }
  | { type: 'COMPLETE_TASK';    taskId: string; milestoneId: string }
  | { type: 'REQUEST_NUDGE';    taskId: string; level: 1 | 2 | 3; description: string; codeSnippet?: string }
  | { type: 'VERIFY_MILESTONE'; milestoneId: string }
  | { type: 'COMPLETE_PROJECT'; projectId: string }
```

---

## Compile Check

After writing both files, run this. Zero errors is the exit condition.

```bash
npx tsc --noEmit
```

If there are errors, fix them before moving to Phase 3. Do not suppress errors with `// @ts-ignore`. Every type error here becomes a runtime bug in an agent later.

Also do a quick import smoke test — paste this temporarily into `app/dashboard/page.tsx` and confirm no red underlines in your editor:

```typescript
// Smoke test — delete after confirming, do not commit
import {
  Agent1InputSchema, Agent1OutputSchema, ProjectIdeaSchema,
  Agent2InputSchema, Agent2OutputSchema, MilestoneSchema,
  Agent3InputSchema, Agent3OutputSchema, TaskSchema,
  Agent4InputSchema, NudgeOutputSchema,
  Agent5InputSchema, VerificationOutputSchema,
  Agent6InputSchema, CompletionOutputSchema,
  type UserAction,
} from '@/schemas/agents'

import {
  UserRowSchema, ProjectRowSchema, MilestoneRowSchema,
  TaskRowSchema, NudgeSessionRowSchema, VerificationRunRowSchema,
  CompletionPostRowSchema, LearnerStatsRowSchema,
  type SetupItem, type PrewrittenHints,
} from '@/schemas/db'
```

---

## What NOT to Build in Phase 2

- **No agent files** — `lib/agents/` stays empty
- **No Server Actions beyond the migration** — actions come in Phase 3+
- **No UI changes** — dashboard stub from Phase 1 is fine as-is
- **No orchestrator logic** — the `UserAction` type is defined here but the switch statement is Phase 5

---

## Common Mistakes to Avoid

**Don't nest schemas unnecessarily.** `TaskSchema` is imported into `Agent3OutputSchema` — not redefined inside it.

**Don't use `z.any()` anywhere.** If you don't know the shape, figure it out before writing the schema. `z.any()` defeats the purpose entirely.

**`warmupResources` lives on milestones, not projects.** The project card schema has no `warmupResources` field. This is intentional — see CLAUDE.md.

**`setupChecklist` is nullable on `MilestoneSchema`.** It is only populated for Milestone 1. All other milestones have `null`. The schema reflects this.

**`nudgeText` is not in `NudgeOutputSchema`.** The nudge text is a `ReadableStream` — it arrives separately from the metadata. The schema only validates the non-streamed metadata.

**`complexity` and `skillLevel` are different fields.** `skillLevel` is about the learner (beginner / intermediate / advanced). `complexity` is about the project (beginner / intermediate / challenging). They are correlated but not the same.

---

## Phase 2 is Complete When

`npx tsc --noEmit` passes clean. Both schema files exist. The smoke test imports resolve without errors. No agent files exist.

That is Phase 2 done.

---

*Next: `phase-03-agent1.md` — Project Ideator + streaming project cards.*
