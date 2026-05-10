import { handleGitHubCallback } from '@/actions/auth'

export async function GET() {
  await handleGitHubCallback()
}
