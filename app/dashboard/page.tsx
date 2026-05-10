import { createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

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
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-6 text-center">
        {user.github_avatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.github_avatar}
            alt={user.github_username ?? 'Avatar'}
            className="w-14 h-14 rounded-full mx-auto"
          />
        )}
        <h1 className="text-3xl font-semibold">
          Welcome, {user.github_username}
        </h1>
        <p className="text-zinc-500 text-sm">
          Phase 3 — project ideas coming soon.
        </p>
      </div>
    </main>
  )
}
