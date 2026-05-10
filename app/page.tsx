import { createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import GitHubSignInButton from '@/components/abhyas/GitHubSignInButton'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('encrypted_api_key')
      .eq('id', session.user.id)
      .single()

    redirect(user?.encrypted_api_key ? '/dashboard' : '/onboarding')
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">Abhyas AI</h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Pick a topic. Build a real project. Get nudged when stuck — never given the answer.
          </p>
        </div>

        <blockquote className="text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-4 text-left">
          अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते<br />
          <span className="not-italic text-zinc-600">— BG 6.35</span>
        </blockquote>

        <div className="space-y-4">
          {searchParams.error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-4 py-3">
              {searchParams.error === 'auth_failed' && 'Authentication failed. Please try again.'}
              {searchParams.error === 'token_missing' && 'GitHub token missing. Please try again.'}
              {!['auth_failed', 'token_missing'].includes(searchParams.error) && 'Something went wrong. Please try again.'}
            </p>
          )}

          <GitHubSignInButton />

          <p className="text-xs text-zinc-600">
            Only reads your GitHub username and email. No repo access at sign-in.
          </p>
        </div>
      </div>
    </main>
  )
}
