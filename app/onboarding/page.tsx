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
    <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center gap-3">
          {user?.github_avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.github_avatar}
              alt={user.github_username ?? 'GitHub avatar'}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <p className="text-sm text-zinc-400">Signed in as</p>
            <p className="font-medium">@{user?.github_username}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Add your AI API key</h1>
          <p className="text-sm text-zinc-400">
            Abhyas uses your own Anthropic or OpenAI key. It is encrypted with AES-256-GCM and
            never stored in plaintext. It is decrypted only during agent calls on the server.
          </p>
        </div>

        <ApiKeyForm />
      </div>
    </main>
  )
}
