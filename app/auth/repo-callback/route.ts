import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServerClient } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const supabase = createAuthClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`)
  }

  const repoToken = data.session.provider_token
  if (!repoToken) {
    return NextResponse.redirect(`${origin}/?error=token_missing`)
  }

  const db = createServerClient()
  await db.from('users')
    .update({ github_repo_token: encryptApiKey(repoToken) })
    .eq('id', data.session.user.id)

  const returnTo = (data.session.user.user_metadata.return_to as string | undefined) ?? '/dashboard'
  return NextResponse.redirect(`${origin}${returnTo}`)
}
