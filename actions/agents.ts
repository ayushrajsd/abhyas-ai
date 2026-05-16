'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { runMilestoneArchitect } from '@/lib/agents/milestoneArchitect'
import type { ProjectIdea } from '@/schemas/agents'
import type { Provider } from '@/lib/model-config'

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
