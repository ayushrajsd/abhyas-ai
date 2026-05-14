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
  item:    z.string(),
  command: z.string().nullable(),
  done:    z.boolean().default(false),
})
export type SetupItem = z.infer<typeof SetupItemSchema>

// ─── DB Row types ─────────────────────────────────────────────────────────────

export const UserRowSchema = z.object({
  id:                z.string().uuid(),
  email:             z.string().email(),
  github_username:   z.string().nullable(),
  github_avatar:     z.string().nullable(),
  github_token:      z.string().nullable(),
  github_repo_token: z.string().nullable(),
  encrypted_api_key: z.string().nullable(),
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
  setup_checklist:     z.array(SetupItemSchema).nullable(),
  created_at:          z.string(),
})
export type MilestoneRow = z.infer<typeof MilestoneRowSchema>

export const PrewrittenHintsSchema = z.object({
  l1: z.string(),
  l2: z.string(),
  l3: z.string(),
})
export type PrewrittenHints = z.infer<typeof PrewrittenHintsSchema>

export const TaskRowSchema = z.object({
  id:                z.string().uuid(),
  milestone_id:      z.string().uuid(),
  title:             z.string(),
  description:       z.string(),
  concept:           z.string(),
  done_when:         z.string(),
  prewritten_hints:  PrewrittenHintsSchema,
  order_index:       z.number().int(),
  status:            TaskStatusSchema,
  estimated_minutes: z.number().int().nullable(),
  created_at:        z.string(),
})
export type TaskRow = z.infer<typeof TaskRowSchema>

export const NudgeSessionRowSchema = z.object({
  id:                z.string().uuid(),
  task_id:           z.string().uuid(),
  user_id:           z.string().uuid(),
  stuck_description: z.string(),
  code_snippet:      z.string().nullable(),
  nudge_level:       z.union([z.literal(1), z.literal(2), z.literal(3)]),
  response:          z.string(),
  was_helpful:       z.boolean().nullable(),
  created_at:        z.string(),
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
  id:                z.string().uuid(),
  project_id:        z.string().uuid(),
  user_id:           z.string().uuid(),
  project_summary:   z.string(),
  concepts_mastered: z.array(z.string()),
  post_technical:    z.string(),
  post_story:        z.string(),
  post_achievement:  z.string(),
  shared_at:         z.string().nullable(),
  created_at:        z.string(),
})
export type CompletionPostRow = z.infer<typeof CompletionPostRowSchema>

export const LearnerStatsRowSchema = z.object({
  user_id:         z.string().uuid(),
  projects_done:   z.number().int(),
  avg_nudge_level: z.number(),
  last_complexity: ComplexitySchema.nullable(),
  suggested_next:  z.string().nullable(),
  updated_at:      z.string(),
})
export type LearnerStatsRow = z.infer<typeof LearnerStatsRowSchema>
