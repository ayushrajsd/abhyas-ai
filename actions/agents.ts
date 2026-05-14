'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import type { ProjectIdea } from '@/schemas/agents'

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
