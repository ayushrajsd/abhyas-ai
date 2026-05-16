import { createAuthClient, createServerClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { runProjectIdeator } from '@/lib/agents/projectIdeator'
import type { Provider } from '@/lib/model-config'

export async function POST(request: Request) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
  }

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key, api_provider')
    .eq('id', session.user.id)
    .single()

  if (!user?.encrypted_api_key) {
    return new Response(JSON.stringify({ error: 'No API key found. Complete onboarding first.' }), { status: 400 })
  }

  const { topic, skillLevel } = await request.json() as { topic: string; skillLevel: string }

  // Persist skill level so Agent 2 can read it when milestones are generated
  await db.from('users').update({ skill_level: skillLevel }).eq('id', session.user.id)

  const apiKey = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
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

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson' },
  })
}
