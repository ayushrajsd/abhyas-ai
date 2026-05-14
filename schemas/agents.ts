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
  concept: z.string(),
  type:    z.enum(['docs', 'video', 'article', 'interactive']),
})
export type WarmupResource = z.infer<typeof WarmupResourceSchema>

export const LearnerStatsInputSchema = z.object({
  avgNudgeLevel:  z.number(),
  projectsDone:   z.number().int(),
  lastComplexity: ComplexitySchema.nullable(),
})
export type LearnerStatsInput = z.infer<typeof LearnerStatsInputSchema>

// ─── Agent 1 — Project Ideator ────────────────────────────────────────────────
// Trigger: ENTER_TOPIC
// Model tier: fast

export const Agent1InputSchema = z.object({
  topic:            z.string().min(1),
  skillLevel:       z.enum(['beginner', 'intermediate', 'advanced']),
  existingProjects: z.array(z.string()).default([]),
})
export type Agent1Input = z.infer<typeof Agent1InputSchema>

export const ProjectIdeaSchema = z.object({
  id:                  z.string(),
  title:               z.string(),
  description:         z.string(),
  complexity:          ComplexitySchema,
  estimatedHours:      z.number(),
  conceptsEncountered: z.array(z.string()),
  skillsBuilt:         z.array(z.string()),
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
  title:              z.string(),
  description:        z.string(),
  learningObjectives: z.array(z.string()),
  conceptsIntroduced: z.array(z.string()),
  warmupResources:    z.array(WarmupResourceSchema),
  orderIndex:         z.number().int(),
  setupChecklist:     z.array(SetupItemSchema).nullable(),
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
  completedMilestones: z.array(z.string()),
  skillLevel:          z.enum(['beginner', 'intermediate', 'advanced']),
  complexity:          ComplexitySchema,
})
export type Agent3Input = z.infer<typeof Agent3InputSchema>

export const TaskSchema = z.object({
  title:            z.string(),
  description:      z.string(),
  concept:          z.string(),
  doneWhen:         z.string(),
  prewrittenHints:  PrewrittenHintsSchema,
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
// nudgeText is a ReadableStream returned separately — not in this schema

export const NudgeLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

export const Agent4InputSchema = z.object({
  task:             TaskSchema,
  stuckDescription: z.string().min(1),
  codeSnippet:      z.string().nullable(),
  nudgeLevel:       NudgeLevelSchema,
  previousNudges:   z.array(z.object({
    level:    NudgeLevelSchema,
    response: z.string(),
  })).default([]),
  milestone:    MilestoneSchema,
  complexity:   ComplexitySchema,
  learnerStats: LearnerStatsInputSchema,
})
export type Agent4Input = z.infer<typeof Agent4InputSchema>

export const NudgeOutputSchema = z.object({
  nudgeLevel:        NudgeLevelSchema,
  conceptsAddressed: z.array(z.string()),
  suggestEscalation: z.boolean(),
})
export type NudgeOutput = z.infer<typeof NudgeOutputSchema>

// ─── Agent 5 — Verifier ───────────────────────────────────────────────────────
// Trigger: VERIFY_MILESTONE (opt-in — self-verify is equally valid)
// Model tier: capable

export const Agent5InputSchema = z.object({
  milestone:   MilestoneSchema,
  tasks:       z.array(TaskSchema),
  githubRepo:  z.string(),
  commitRange: z.string(),
})
export type Agent5Input = z.infer<typeof Agent5InputSchema>

export const VerificationOutputSchema = z.object({
  status:           VerificationStatusSchema,
  feedback:         z.string(),
  filesReviewed:    z.array(z.string()),
  conceptsVerified: z.array(z.string()),
})
export type VerificationOutput = z.infer<typeof VerificationOutputSchema>

// ─── Agent 6 — Completion Narrator ───────────────────────────────────────────
// Trigger: COMPLETE_PROJECT
// Model tier: capable

export const Agent6InputSchema = z.object({
  project:    ProjectIdeaSchema,
  milestones: z.array(MilestoneSchema),
  nudgeSessions: z.array(z.object({
    taskTitle:  z.string(),
    nudgeLevel: NudgeLevelSchema,
    response:   z.string(),
    wasHelpful: z.boolean().nullable(),
  })),
  verificationRuns: z.array(z.object({
    milestoneTitle: z.string(),
    status:         VerificationStatusSchema,
    filesReviewed:  z.array(z.string()),
  })),
  warmupResources:     z.array(WarmupResourceSchema),
  totalHoursEstimated: z.number(),
  learnerName:         z.string(),
  learnerStats:        LearnerStatsInputSchema,
})
export type Agent6Input = z.infer<typeof Agent6InputSchema>

export const CompletionPostSchema = z.object({
  variant: z.enum(['technical', 'story', 'achievement']),
  content: z.string(),
})
export type CompletionPost = z.infer<typeof CompletionPostSchema>

export const CompletionOutputSchema = z.object({
  posts:                    z.array(CompletionPostSchema).length(3),
  projectSummary:           z.string(),
  conceptsMastered:         z.array(z.string()),
  nextComplexitySuggestion: z.string(),
})
export type CompletionOutput = z.infer<typeof CompletionOutputSchema>

// ─── Orchestrator action types ────────────────────────────────────────────────
// Discriminated unions — not Zod schemas.
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
