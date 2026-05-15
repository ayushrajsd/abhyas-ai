import { createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import ApiKeyForm from '@/components/abhyas/ApiKeyForm'

export default async function OnboardingPage() {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/')

  const { data: user } = await supabase
    .from('users')
    .select('encrypted_api_key, github_username, github_avatar')
    .eq('id', session.user.id)
    .single()

  if (user?.encrypted_api_key) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <span className="font-serif text-lg font-semibold text-charcoal">
          Abhyas<span className="text-forest">.ai</span>
        </span>
        {user?.github_avatar && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.github_avatar}
              alt={user.github_username ?? ''}
              className="w-7 h-7 rounded-full"
            />
            <span className="text-sm text-muted">@{user.github_username}</span>
          </div>
        )}
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-16 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
        {/* Left: context */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="font-serif text-3xl font-bold text-charcoal">
              One last thing before you start
            </h1>
            <p className="text-muted leading-relaxed">
              Abhyas uses your own AI key. No shared quota, no data sent to us.
              Your key is encrypted before storage and decrypted only during agent calls.
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-5 space-y-4">
            <p className="text-sm font-medium text-charcoal">What your key is used for</p>
            <ul className="space-y-3">
              {[
                { label: 'Project ideas', desc: 'Generating 5–7 project ideas for your topic' },
                { label: 'Milestones', desc: 'Breaking your project into learnable chunks' },
                { label: 'Nudges', desc: 'Pointing you in the right direction when stuck' },
                { label: 'Verification', desc: 'Reading your GitHub code to confirm completion' },
              ].map(item => (
                <li key={item.label} className="flex gap-3 text-sm">
                  <span className="text-forest mt-0.5">◆</span>
                  <span>
                    <span className="font-medium text-charcoal">{item.label}: </span>
                    <span className="text-muted">{item.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: form */}
        <div className="bg-white border border-border rounded-2xl p-7 shadow-sm">
          <ApiKeyForm />
        </div>
      </main>
    </div>
  )
}
