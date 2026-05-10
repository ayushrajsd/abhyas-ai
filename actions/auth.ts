'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/crypto'
import { redirect } from 'next/navigation'

// Moment 1 — called from /auth/callback after GitHub sign-in
// Scopes at this point: read:user + user:email ONLY. No repo access.
export async function handleGitHubCallback() {
  const supabase = createAuthClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) redirect('/?error=auth_failed')

  // CRITICAL: Supabase does NOT persist provider_token automatically.
  // Extract it NOW from the session or it is permanently gone.
  const githubToken = session.provider_token
  if (!githubToken) redirect('/?error=token_missing')

  const db = createServerClient()
  await db.from('users').upsert({
    id: session.user.id,
    email: session.user.email!,
    github_username: session.user.user_metadata.user_name,
    github_avatar: session.user.user_metadata.avatar_url,
    github_token: encryptApiKey(githubToken),
    github_repo_token: null,
  }, { onConflict: 'id', ignoreDuplicates: false })

  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key')
    .eq('id', session.user.id)
    .single()

  redirect(user?.encrypted_api_key ? '/dashboard' : '/onboarding')
}

// Moment 2 — called from /auth/repo-callback after incremental auth
// Only triggered when learner clicks "Connect GitHub repo" at milestone completion (Phase 7)
// Scopes at this point: read:user + user:email + repo (read)
export async function handleRepoAccessCallback() {
  const supabase = createAuthClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) redirect('/?error=auth_failed')

  const repoToken = session.provider_token
  if (!repoToken) redirect('/?error=token_missing')

  const db = createServerClient()
  await db.from('users')
    .update({ github_repo_token: encryptApiKey(repoToken) })
    .eq('id', session.user.id)

  const returnTo = (session.user.user_metadata.return_to as string | undefined) ?? '/dashboard'
  redirect(returnTo)
}

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
  } catch {
    // Langfuse failure must never block the user flow
  }

  redirect('/dashboard')
}
