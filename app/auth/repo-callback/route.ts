import { handleRepoAccessCallback } from '@/actions/auth'

export async function GET() {
  await handleRepoAccessCallback()
}
