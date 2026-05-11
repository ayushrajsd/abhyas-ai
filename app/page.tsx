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
    <div className="min-h-screen" style={{ backgroundColor: '#f7f4ef' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #ddd8cf' }}>
        <span className="font-serif text-lg font-semibold" style={{ color: '#1c1c1c' }}>
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span>
        </span>
        <a
          href="https://tapovan.ai"
          className="text-sm transition-colors"
          style={{ color: '#6b6b6b' }}
        >
          ← Tapovan.ai
        </a>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <h1 className="font-serif text-5xl font-bold leading-tight" style={{ color: '#1c1c1c' }}>
              Learn by building.<br />
              <span style={{ color: '#3d6b4f' }}>Never by watching.</span>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: '#6b6b6b' }}>
              Pick a topic. Get a project tailored to your level. Work through it on your own machine.
              Ask for a nudge when stuck — never given the answer.
            </p>
          </div>

          <div className="space-y-3">
            {searchParams.error && (
              <p className="text-sm rounded-lg px-4 py-3" style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                {searchParams.error === 'auth_failed' && 'Authentication failed. Please try again.'}
                {searchParams.error === 'token_missing' && 'GitHub token missing. Please try again.'}
                {!['auth_failed', 'token_missing'].includes(searchParams.error) && 'Something went wrong. Please try again.'}
              </p>
            )}
            <GitHubSignInButton />
            <p className="text-xs" style={{ color: '#9b9b9b' }}>
              Only reads your GitHub username and email. No repo access at sign-in.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {['Build real projects', 'Get nudged, not spoonfed', 'Verify via GitHub'].map(f => (
              <span key={f} className="text-sm flex items-center gap-1.5" style={{ color: '#3d6b4f' }}>
                <span>◆</span> {f}
              </span>
            ))}
          </div>
        </div>

        {/* Quote card */}
        <div className="rounded-2xl p-8 space-y-6" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd8cf', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="font-serif text-xl leading-relaxed italic" style={{ color: '#1c1c1c' }}>
            "The teacher never gives the answer. They give the next question, the next step, the next context."
          </p>
          <p className="font-serif text-sm italic" style={{ color: '#9b9b9b' }}>
            अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते — BG 6.35
          </p>
        </div>
      </main>
    </div>
  )
}
