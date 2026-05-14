'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { runProjectIdeator } from '@/lib/agents/projectIdeator'
import type { Provider } from '@/lib/model-config'
import type { ProjectIdea } from '@/schemas/agents'

export async function generateProjectIdeas(
  topic: string,
  skillLevel: string,
): Promise<ReadableStream<Uint8Array>> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key, api_provider')
    .eq('id', session.user.id)
    .single()

  if (!user?.encrypted_api_key) throw new Error('No API key found — complete onboarding first')

  const apiKey = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider

  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const generator = runProjectIdeator(
          { topic, skillLevel, existingProjects: [] },
          provider,
          apiKey,
          session.user.id,
        )

        for await (const project of generator) {
          controller.enqueue(encoder.encode(JSON.stringify(project) + '\n'))
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
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
