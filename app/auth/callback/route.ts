import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServerClient } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  console.log('[auth/callback] full URL:', request.url)
  console.log('[auth/callback] code present:', !!code)
  console.log('[auth/callback] all params:', Object.fromEntries(searchParams.entries()))

  if (!code) {
    console.error('[auth/callback] FAIL: no code in URL params')
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const supabase = createAuthClient()

  // Exchange the code for a session: required step with PKCE flow
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  console.log('[auth/callback] exchangeCodeForSession error:', error?.message ?? 'none')
  console.log('[auth/callback] session present:', !!data.session)

  if (error || !data.session) {
    console.error('[auth/callback] FAIL: exchange failed:', error?.message)
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const session = data.session

  // CRITICAL: provider_token is only available here at exchange time, never again
  const githubToken = session.provider_token
  console.log('[auth/callback] provider_token present:', !!githubToken)
  if (!githubToken) {
    console.error('[auth/callback] FAIL: no provider_token in session')
    return NextResponse.redirect(`${origin}/?error=token_missing`)
  }

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

  const destination = user?.encrypted_api_key ? '/dashboard' : '/onboarding'
  return NextResponse.redirect(`${origin}${destination}`)
}
