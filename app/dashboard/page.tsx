import { createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/')

  const { data: user } = await supabase
    .from('users')
    .select('github_username, github_avatar, encrypted_api_key')
    .eq('id', session.user.id)
    .single()

  if (!user?.encrypted_api_key) redirect('/onboarding')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}>
      {/* Thin accent bar at top */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #3d6b4f 0%, #7ab394 60%, #f7f4ef 100%)' }} />

      <nav className="flex items-center justify-between px-8 py-5" style={{ borderBottom: '1px solid #e8e3da' }}>
        <span className="font-serif text-lg font-semibold tracking-tight">
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span>
        </span>
        {user.github_avatar && (
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.github_avatar}
              alt={user.github_username ?? ''}
              className="w-7 h-7 rounded-full"
              style={{ border: '1.5px solid #ddd8cf' }}
            />
            <span className="text-sm" style={{ color: '#6b6b6b' }}>@{user.github_username}</span>
          </div>
        )}
      </nav>

      {/* Hero */}
      <div
        className="px-8 py-14"
        style={{
          background: 'linear-gradient(180deg, #eef6f1 0%, #f7f4ef 100%)',
          borderBottom: '1px solid #e8e3da',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <p className="text-sm mb-5" style={{ color: '#6b6b6b' }}>
            Good to have you back, <span className="font-medium" style={{ color: '#3d6b4f' }}>@{user.github_username}</span>
          </p>

          {/* The insight — two lines that land before the explanation */}
          <h1 className="font-serif font-bold leading-tight" style={{ fontSize: '2rem', color: '#1c1c1c' }}>
            AI can ship it.
          </h1>
          <h2 className="font-serif font-semibold leading-snug mt-1" style={{ fontSize: '1.4rem', color: '#4b4b4b' }}>
            That&apos;s not the point.
          </h2>

          {/* The explanation — Tapovan pacing: short, landed, no padding */}
          <div className="mt-6 space-y-3 max-w-xl">
            <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b' }}>
              Cars move faster than legs. People still run.
              AI builds faster than you can type. That is not a reason to stop — it is the reason to start.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>
              Pick a project. Work through it yourself. Ask for the next step only when you need it.
              The understanding, when it arrives, stays.
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-8 py-10">
        <DashboardClient />
      </main>
    </div>
  )
}
