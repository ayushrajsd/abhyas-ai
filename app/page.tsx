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
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <span className="font-serif text-lg font-semibold text-charcoal">
          Abhyas<span className="text-forest">.ai</span>
        </span>
        <a href="https://tapovan.ai" className="text-sm text-muted hover:text-charcoal transition-colors">
          ← Tapovan.ai
        </a>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-8 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="font-serif text-5xl font-bold text-charcoal leading-tight">
              Learn by building.<br />
              <span className="text-forest">Never by watching.</span>
            </h1>
            <p className="text-lg text-muted leading-relaxed">
              Pick a topic. Get a project. Work through it on your own machine.
              Ask for a nudge when stuck — never the answer.
            </p>
          </div>

          <div className="space-y-4">
            {searchParams.error && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {searchParams.error === 'auth_failed' && 'Authentication failed. Please try again.'}
                {searchParams.error === 'token_missing' && 'GitHub token missing. Please try again.'}
                {!['auth_failed', 'token_missing'].includes(searchParams.error) && 'Something went wrong. Please try again.'}
              </p>
            )}
            <GitHubSignInButton />
            <p className="text-xs text-muted">
              Only reads your GitHub username and email. No repo access at sign-in.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['Build real projects', 'Get nudged, not spoonfed', 'Verify via GitHub'].map(f => (
              <span key={f} className="text-sm text-forest flex items-center gap-1.5">
                <span className="text-forest">◆</span> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Quote card */}
        <div className="bg-white border border-border rounded-2xl p-8 shadow-sm space-y-4">
          <p className="font-serif text-xl text-charcoal leading-relaxed italic">
            "The teacher never gives the answer. They give the next question, the next step, the next context."
          </p>
          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-sm font-medium text-charcoal">The Gurukul Philosophy</p>
            <p className="text-xs text-muted font-serif italic">
              अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते — BG 6.35
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
