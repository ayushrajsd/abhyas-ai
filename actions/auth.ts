'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/crypto'
import { redirect } from 'next/navigation'

// Called from the onboarding page form — encrypts and stores the API key
// Anthropic keys: sk-ant-... | OpenAI keys: sk-...
export async function saveApiKey(formData: FormData) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/')

  const rawKey = (formData.get('apiKey') as string)?.trim()
  if (!rawKey) throw new Error('API key is required')

  const provider: 'anthropic' | 'openai' = rawKey.startsWith('sk-ant-') ? 'anthropic' : 'openai'

  const db = createServerClient()
  await db.from('users').update({
    encrypted_api_key: encryptApiKey(rawKey),
    api_provider: provider,
  }).eq('id', session.user.id)

  // Fire-and-forget Langfuse trace — failure never surfaces to user
  try {
    console.log('[langfuse] attempting trace — keys present:', {
      secret: !!process.env.LANGFUSE_SECRET_KEY,
      public: !!process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL,
    })
    const { Langfuse } = await import('langfuse')
    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl: process.env.LANGFUSE_BASEURL,
    })
    const trace = langfuse.trace({
      name: 'api_key_saved',
      userId: session.user.id,
      metadata: { provider },
    })
    trace.event({ name: 'key_stored', metadata: { provider } })
    await langfuse.flushAsync()
    console.log('[langfuse] trace flushed successfully')
  } catch (err) {
    console.error('[langfuse] trace failed:', err)
  }

  redirect('/dashboard')
}
