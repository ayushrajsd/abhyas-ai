import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Service-role client — bypasses RLS — Server Actions only, never client components
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Auth-aware server client — cookie-based session, respects RLS
// Use in Server Components and Route Handlers to read the current user
export function createAuthClient() {
  const cookieStore = cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch { /* Server Component — read-only context */ }
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch { /* Server Component — read-only context */ }
        },
      },
    }
  )
}

// Browser client lives in lib/supabase.client.ts to avoid importing next/headers in client components
