import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'

// Uses @supabase/ssr which stores the PKCE code verifier in cookies,
// making it accessible to the server-side callback route handler
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
