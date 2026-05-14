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

      <main className="max-w-4xl mx-auto px-8 py-16">
        <DashboardClient username={user.github_username ?? ''} />
      </main>
    </div>
  )
}
