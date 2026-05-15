'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import type { ProjectIdea } from '@/schemas/agents'

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
      user_id:     session.user.id,
      topic,
      title:       project.title,
      description: project.description,
      complexity:  project.complexity,
      status:      'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save project: ${error.message}`)
  return data.id
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
      user_id:     session.user.id,
      topic,
      title:       project.title,
      description: project.description,
      complexity:  project.complexity,
      status:      'saved',
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
