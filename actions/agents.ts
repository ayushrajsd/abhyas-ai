'use server'

import { revalidatePath } from 'next/cache'
import { createAuthClient, createServerClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { runMilestoneArchitect } from '@/lib/agents/milestoneArchitect'
import { runTaskGenerator } from '@/lib/agents/taskGenerator'
import { handleCompleteTask, type CompleteTaskResult } from '@/lib/orchestrator'
import type { ProjectIdea, Milestone } from '@/schemas/agents'
import type { Provider } from '@/lib/model-config'

export type { CompleteTaskResult }

export type SavedIdea = {
  id: string
  title: string
  description: string
  complexity: string
  topic: string
}

export async function selectProject(project: ProjectIdea, topic: string): Promise<string> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { data, error } = await db
    .from('projects')
    .insert({
      user_id:      session.user.id,
      topic,
      title:        project.title,
      description:  project.description,
      complexity:   project.complexity,
      status:       'active',
      project_data: project,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save project: ${error.message}`)
  return data.id
}

export async function generateAndSaveMilestones(projectId: string): Promise<void> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()

  // Fetch project + user in parallel
  const [projectResult, userResult] = await Promise.all([
    db.from('projects').select('*').eq('id', projectId).eq('user_id', session.user.id).single(),
    db.from('users').select('encrypted_api_key, api_provider, skill_level').eq('id', session.user.id).single(),
  ])

  if (projectResult.error || !projectResult.data) throw new Error('Project not found')
  if (userResult.error || !userResult.data) throw new Error('User not found')

  // Guard: if milestones already exist, do nothing (prevents double-generation from Strict Mode)
  const { count } = await db
    .from('milestones')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
  if ((count ?? 0) > 0) return

  const projectRow = projectResult.data
  const user = userResult.data

  if (!user.encrypted_api_key || !user.api_provider) {
    throw new Error('API key not configured. Please complete onboarding.')
  }
  // skill_level is set at ideation time; fall back to complexity-based inference for older sessions
  const skillLevel = user.skill_level ?? (
    projectRow.complexity === 'challenging' ? 'advanced' :
    projectRow.complexity === 'intermediate' ? 'intermediate' :
    'beginner'
  )

  const apiKey = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider

  // Reconstruct ProjectIdea — use stored project_data if available, fall back to row fields
  const project: ProjectIdea = projectRow.project_data ?? {
    id:                  projectRow.id,
    title:               projectRow.title,
    description:         projectRow.description,
    complexity:          projectRow.complexity,
    estimatedHours:      20,
    conceptsEncountered: [],
    skillsBuilt:         [],
  }

  const milestones = await runMilestoneArchitect(
    {
      project,
      skillLevel,
      topic: projectRow.topic,
    },
    provider,
    apiKey,
    session.user.id,
  )

  // Bulk insert milestones — first is 'active', rest are 'locked'
  const rows = milestones.map((m, i) => ({
    project_id:          projectId,
    title:               m.title,
    description:         m.description,
    learning_objectives: m.learningObjectives,
    concepts_introduced: m.conceptsIntroduced,
    warmup_resources:    m.warmupResources,
    order_index:         i,
    status:              i === 0 ? 'active' : 'locked',
    setup_checklist:     m.setupChecklist ?? null,
  }))

  const { error: insertError } = await db.from('milestones').insert(rows)
  if (insertError) throw new Error(`Failed to save milestones: ${insertError.message}`)
}

export async function getProjectWithMilestones(projectId: string) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const db = createServerClient()
  const [projectResult, milestonesResult] = await Promise.all([
    db.from('projects').select('*').eq('id', projectId).eq('user_id', session.user.id).single(),
    db.from('milestones').select('*').eq('project_id', projectId).order('order_index', { ascending: true }),
  ])

  if (projectResult.error || !projectResult.data) return null

  return {
    project: projectResult.data,
    milestones: milestonesResult.data ?? [],
  }
}

export async function getSavedProjects(): Promise<SavedIdea[]> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return []

  const db = createServerClient()
  const { data } = await db
    .from('projects')
    .select('id, title, description, complexity, topic')
    .eq('user_id', session.user.id)
    .eq('status', 'saved')
    .order('created_at', { ascending: false })

  return (data ?? []) as SavedIdea[]
}

export async function bookmarkProject(project: ProjectIdea, topic: string): Promise<string> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { data, error } = await db
    .from('projects')
    .insert({
      user_id:      session.user.id,
      topic,
      title:        project.title,
      description:  project.description,
      complexity:   project.complexity,
      status:       'saved',
      project_data: project,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to bookmark: ${error.message}`)
  return data.id
}

export async function removeBookmark(projectId: string): Promise<void> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  await db.from('projects').delete().eq('id', projectId).eq('user_id', session.user.id)
}

export async function startSavedProject(projectId: string): Promise<void> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { error } = await db
    .from('projects')
    .update({ status: 'active' })
    .eq('id', projectId)
    .eq('user_id', session.user.id)

  if (error) throw new Error(`Failed to start project: ${error.message}`)
}

// ─── Phase 5: Task actions ────────────────────────────────────────────────────

export async function getMilestoneWithTasks(milestoneId: string) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const db = createServerClient()
  const { data: milestone, error: mError } = await db
    .from('milestones')
    .select('*')
    .eq('id', milestoneId)
    .single()

  if (mError || !milestone) return null

  const [projectResult, tasksResult, allMilestonesResult] = await Promise.all([
    db.from('projects').select('*').eq('id', milestone.project_id).eq('user_id', session.user.id).single(),
    db.from('tasks').select('*').eq('milestone_id', milestoneId).order('order_index', { ascending: true }),
    db.from('milestones').select('id, order_index, status, title').eq('project_id', milestone.project_id).order('order_index', { ascending: true }),
  ])

  if (projectResult.error || !projectResult.data) return null

  return {
    milestone,
    project: projectResult.data,
    tasks: tasksResult.data ?? [],
    allMilestones: allMilestonesResult.data ?? [],
  }
}

export async function generateAndSaveTasks(milestoneId: string): Promise<void> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()

  const [milestoneResult, userResult] = await Promise.all([
    db.from('milestones').select('*, projects!inner(*)').eq('id', milestoneId).single(),
    db.from('users').select('encrypted_api_key, api_provider, skill_level').eq('id', session.user.id).single(),
  ])

  if (milestoneResult.error || !milestoneResult.data) throw new Error('Milestone not found')
  if (userResult.error || !userResult.data) throw new Error('User not found')

  // Guard: prevent double-generation
  const { count } = await db
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('milestone_id', milestoneId)
  if ((count ?? 0) > 0) return

  const milestoneRow = milestoneResult.data
  const projectRow = Array.isArray(milestoneRow.projects) ? milestoneRow.projects[0] : milestoneRow.projects
  const user = userResult.data

  if (!user.encrypted_api_key || !user.api_provider) {
    throw new Error('API key not configured.')
  }

  const apiKey = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider
  const skillLevel = user.skill_level ?? 'beginner'

  // Fetch completed milestones for context
  const { data: completedMilestones } = await db
    .from('milestones')
    .select('title')
    .eq('project_id', projectRow.id)
    .eq('status', 'complete')

  const completedTitles = (completedMilestones ?? []).map((m: { title: string }) => m.title)

  const project: ProjectIdea = projectRow.project_data ?? {
    id:                  projectRow.id,
    title:               projectRow.title,
    description:         projectRow.description,
    complexity:          projectRow.complexity,
    estimatedHours:      20,
    conceptsEncountered: [],
    skillsBuilt:         [],
  }

  const milestone: Milestone = {
    title:               milestoneRow.title,
    description:         milestoneRow.description,
    learningObjectives:  milestoneRow.learning_objectives,
    conceptsIntroduced:  milestoneRow.concepts_introduced,
    warmupResources:     milestoneRow.warmup_resources ?? [],
    orderIndex:          milestoneRow.order_index,
    setupChecklist:      milestoneRow.setup_checklist ?? null,
  }

  const tasks = await runTaskGenerator(
    {
      milestone,
      project,
      completedMilestones: completedTitles,
      skillLevel,
      complexity: projectRow.complexity,
    },
    provider,
    apiKey,
    session.user.id,
  )

  // First task is active, rest locked
  const rows = tasks.map((t, i) => ({
    milestone_id:      milestoneId,
    title:             t.title,
    description:       t.description,
    concept:           t.concept,
    done_when:         t.doneWhen,
    prewritten_hints:  t.prewrittenHints,
    concept_resources: t.conceptResources,
    order_index:       i,
    status:            i === 0 ? 'active' : 'locked',
    estimated_minutes: t.estimatedMinutes,
  }))

  const { error: insertError } = await db.from('tasks').insert(rows)
  if (insertError) throw new Error(`Failed to save tasks: ${insertError.message}`)
}

export async function completeTask(taskId: string): Promise<CompleteTaskResult> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const result = await handleCompleteTask(db, taskId, session.user.id)

  // Revalidate relevant paths
  if (result.outcome === 'next_task' || result.outcome === 'next_milestone') {
    revalidatePath(`/projects/[id]/milestones/[milestoneId]`, 'page')
  }
  if (result.outcome === 'next_milestone' || result.outcome === 'project_complete') {
    revalidatePath(`/projects/[id]`, 'page')
  }

  return result
}
