# Phase 01 — Foundation
## Read CLAUDE.md first. Then read this file completely before writing a single line of code.

---

## Repo & Deployment Setup — Do This Before Any Code

This is a **standalone Next.js app** deployed at `abhyas.tapovan.ai`. It is not inside the tapovan.ai monorepo. All routes start at `/`.

### Step 1 — Clone the repo and scaffold Next.js

The repo already exists at `github.com/ayushrajsd/abhyas-ai`. Clone it and scaffold Next.js into it.

```bash
git clone git@github.com:ayushrajsd/abhyas-ai.git
cd abhyas-ai

# Scaffold Next.js 14 into the existing repo directory
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
```

> If `create-next-app` asks "A package.json already exists. Do you want to continue?" — yes.

```bash
git add .
git commit -m "chore: scaffold Next.js 14 app"
git push origin main
```

### Step 2 — Supabase project

Create a **new, separate** Supabase project named `abhyas`. Do not reuse tapovan.ai's Supabase project. This gives Abhyas its own independent database, auth configuration, and API keys.

### Step 3 — Vercel project

- Create a new Vercel project connected to the `ayushrajsd/abhyas-ai` repo
- Add custom domain: `abhyas.tapovan.ai`
- On your domain registrar (or wherever tapovan.ai's DNS lives), add: `abhyas CNAME cname.vercel-dns.com`
- All environment variables live in this Vercel project — completely independent of tapovan.ai's Vercel project

### Step 4 — GitHub OAuth App

Create a **new** GitHub OAuth App (not the one used by tapovan.ai if one exists):
- Application name: `Abhyas AI`
- Homepage URL: `https://abhyas.tapovan.ai`
- Authorization callback URL: `https://abhyas.tapovan.ai/auth/callback`
- Add a second callback URL for local dev: `http://localhost:3000/auth/callback`

Copy the Client ID and Client Secret into the Supabase `abhyas` project → Auth → Providers → GitHub.

---

---

## What This Phase Builds

The non-negotiable infrastructure that every later phase depends on:

1. Next.js 14 project wired into the existing `tapovan.ai` monorepo at the `/abhyas` route
2. Supabase project with all 7 database tables created via migration
3. GitHub OAuth — Moment 1 only (sign-in with minimal scopes, no repo access)
4. `lib/crypto.ts` — AES-256-GCM encrypt/decrypt, tested before anything touches user data
5. `lib/model-config.ts` — provider-aware model tier config (Anthropic + OpenAI)
6. `lib/supabase.ts` — server and client Supabase clients
7. Onboarding page — one field: API key entry (Anthropic or OpenAI), encrypted on submit
8. Langfuse wired up and producing its first trace on API key save

**No agents. No UI beyond the landing page and onboarding. No schemas yet.**
Schemas come in Phase 2. Agents come in Phase 3 onwards.

---

## Done When

Work through this checklist in order. Do not move to Phase 2 until every item passes.

- [ ] `npx supabase db push` runs clean — all 7 tables exist, no errors
- [ ] Navigate to `abhyas.tapovan.ai` (or `localhost:3000`) — landing page renders with "Continue with GitHub" button
- [ ] Click "Continue with GitHub" — GitHub permission prompt shows **only** `read:user` and `user:email` scopes. No repo mention anywhere.
- [ ] Complete GitHub OAuth — redirected back to `/onboarding`, GitHub username and avatar visible
- [ ] Returning user (already has key) — redirected directly to `/dashboard` stub, not onboarding
- [ ] Add an Anthropic API key on the onboarding page — submit succeeds, row appears in `users` table with `encrypted_api_key` NOT NULL and `api_provider = 'anthropic'`
- [ ] Open Supabase table editor — confirm the stored value is ciphertext (looks like `a3f2...:b9c1...:d4e7...`), not the raw key
- [ ] Write and run a local test: `encryptApiKey('sk-ant-test') → decrypt → confirm match`
- [ ] Repeat the API key test with an OpenAI key (`sk-...`) — same result, `api_provider = 'openai'`
- [ ] Open Langfuse dashboard — one trace named `api_key_saved` appears with `userId` and `provider` metadata
- [ ] `lib/model-config.ts` — `getModel('anthropic', 'fast')` returns `'claude-haiku-4-5'`, `getModel('openai', 'capable')` returns `'gpt-5.4-mini'`

---

## Environment Variables

Create `.env.local` with all of the following. None of these are optional.

```bash
# Supabase — from the abhyas Supabase project (NOT tapovan.ai's project)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # Server-side only — never expose to client

# Encryption — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=                     # 32 bytes hex — master key for AES-256-GCM

# Langfuse
LANGFUSE_SECRET_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_BASEURL=https://cloud.langfuse.com

# App URL — used for OAuth redirects
NEXT_PUBLIC_APP_URL=http://localhost:3000   # change to https://abhyas.tapovan.ai in Vercel

# GitHub OAuth — configured in Supabase Auth dashboard
# Callback URL registered in GitHub OAuth App: https://abhyas.tapovan.ai/auth/callback
```

**ENCRYPTION_KEY rule:** Generate it once. Store it in Vercel environment variables AND in your local `.env.local`. Never commit it. Never log it. If it is lost, all stored keys are permanently inaccessible and every user must re-enter their API key.

---

## File-by-File Build Order

Build in this exact sequence. Each file depends on the ones before it.

### 1. `lib/crypto.ts`

Build and test this first, before anything that touches user data.

```typescript
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex') // must be 32 bytes

export function encryptApiKey(plaintext: string): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', MASTER_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Storage format: iv:authTag:ciphertext — all hex, colon-separated
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptApiKey(stored: string): string {
  const [ivHex, tagHex, cipherHex] = stored.split(':')
  const decipher = createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(cipherHex, 'hex', 'utf8') + decipher.final('utf8')
}
```

**Test it before continuing.** Run this in a scratch file or `tsx`:

```typescript
import { encryptApiKey, decryptApiKey } from './lib/crypto'
const key = 'sk-ant-api03-fake-test-key'
const encrypted = encryptApiKey(key)
console.log('Encrypted:', encrypted)       // should look like hex:hex:hex
const decrypted = decryptApiKey(encrypted)
console.log('Match:', decrypted === key)   // must print true
```

Do not proceed until `Match: true` is printed.

---

### 2. `lib/model-config.ts`

No external dependencies. Write it next so every later file can import from it.

```typescript
export type Provider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'capable'

export const MODEL_CONFIG: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    fast:    'claude-haiku-4-5',
    capable: 'claude-sonnet-4-5',
  },
  openai: {
    fast:    'gpt-5.4-nano',    // cheapest GPT-5.4 class, 400K context
    capable: 'gpt-5.4-mini',   // strong reasoning, coding, agentic tasks
  },
}

export function getModel(provider: Provider, tier: ModelTier): string {
  return MODEL_CONFIG[provider][tier]
}
```

---

### 3. `lib/supabase.ts`

Two clients — one for server (uses service role key, full access), one for client (uses anon key, respects RLS). Both are needed from Phase 1 onward.

```typescript
import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server client — for Server Actions and Route Handlers
// Uses service role key — bypasses RLS — only for trusted server-side operations
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Auth-aware server client — for reading session/user in Server Components
// Uses cookie-based session — respects RLS
export function createAuthClient() {
  const cookieStore = cookies()
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}

// Browser client — for Client Components
export function createBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

### 4. Database Migration

Create `supabase/migrations/001_initial_schema.sql`. This creates all 7 tables in one migration. Run it once and never edit it — future changes go in new migration files.

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- USERS
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  github_username text,
  github_avatar text,
  github_token text,             -- AES-256-GCM encrypted, read:user + user:email scope
  github_repo_token text,        -- AES-256-GCM encrypted, repo scope — NULL until Verifier requested
  encrypted_api_key text,        -- AES-256-GCM encrypted — NULL until onboarding complete
  api_provider text check (api_provider in ('anthropic', 'openai')),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz default now()
);

-- PROJECTS
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  title text not null,
  description text not null,
  complexity text check (complexity in ('easy', 'medium', 'challenging')),
  status text default 'active' check (status in ('active', 'complete', 'paused')),
  github_repo text,              -- nullable — set when learner connects a repo
  created_at timestamptz default now()
);

-- MILESTONES
create table public.milestones (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null,
  learning_objectives text[] not null default '{}',
  concepts_introduced text[] not null default '{}',  -- NEW concepts in this milestone only
  order_index integer not null,
  status text default 'locked' check (status in ('locked', 'active', 'complete')),
  verification_type text check (verification_type in ('verified', 'self')),  -- null = not yet done
  verified_at timestamptz,
  created_at timestamptz default now()
);

-- TASKS
create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  description text not null,
  concept text not null,         -- the core concept this task exercises
  done_when text not null,       -- concrete, testable completion criterion
  prewritten_hints jsonb not null default '{"l1": "", "l2": "", "l3": ""}',
  order_index integer not null,
  status text default 'locked' check (status in ('locked', 'active', 'done')),
  estimated_minutes integer,
  created_at timestamptz default now()
);

-- NUDGE SESSIONS
create table public.nudge_sessions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  stuck_description text not null,
  code_snippet text,             -- optional paste from learner
  nudge_level integer not null check (nudge_level in (1, 2, 3)),
  response text not null,
  was_helpful boolean,           -- null until user rates it
  created_at timestamptz default now()
);

-- VERIFICATION RUNS
create table public.verification_runs (
  id uuid primary key default uuid_generate_v4(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('complete', 'partial', 'incorrect', 'cannot_assess')),
  feedback text not null,
  files_reviewed text[] not null default '{}',
  commit_sha text,
  created_at timestamptz default now()
);

-- COMPLETION POSTS
create table public.completion_posts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  project_summary text not null,        -- 2-3 sentence honest summary, stored permanently
  concepts_mastered text[] not null default '{}',
  post_technical text not null,         -- for engineering audience
  post_story text not null,             -- building-in-public narrative
  post_achievement text not null,       -- short milestone-focused post
  shared_at timestamptz,                -- null until user clicks share
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY
-- Users can only read and write their own rows.
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.tasks enable row level security;
alter table public.nudge_sessions enable row level security;
alter table public.verification_runs enable row level security;
alter table public.completion_posts enable row level security;

-- RLS Policies — own-data access only
create policy "users_own" on public.users for all using (auth.uid() = id);
create policy "projects_own" on public.projects for all using (auth.uid() = user_id);
create policy "milestones_own" on public.milestones for all
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "tasks_own" on public.tasks for all
  using (milestone_id in (
    select m.id from public.milestones m
    join public.projects p on p.id = m.project_id
    where p.user_id = auth.uid()
  ));
create policy "nudge_sessions_own" on public.nudge_sessions for all using (auth.uid() = user_id);
create policy "verification_runs_own" on public.verification_runs for all using (auth.uid() = user_id);
create policy "completion_posts_own" on public.completion_posts for all using (auth.uid() = user_id);

-- INDEXES — for the queries we know will run
create index projects_user_id on public.projects(user_id);
create index milestones_project_id on public.milestones(project_id, order_index);
create index tasks_milestone_id on public.tasks(milestone_id, order_index);
create index nudge_sessions_task_id on public.nudge_sessions(task_id);
create index nudge_sessions_user_id on public.nudge_sessions(user_id);
create index verification_runs_milestone_id on public.verification_runs(milestone_id);
```

---

### 5. GitHub OAuth Configuration

**In the Supabase dashboard** (Auth → Providers → GitHub) for the `abhyas` project:
- Enable GitHub provider
- Callback URL: `https://abhyas.tapovan.ai/auth/callback` (and `http://localhost:3000/auth/callback` for local dev)
- Scopes: `read:user user:email` — **only these two, nothing else**
- Copy Client ID and Client Secret from your GitHub OAuth App into Supabase

**In GitHub** (Settings → Developer settings → OAuth Apps → New OAuth App):
- Application name: `Abhyas AI`
- Homepage URL: `https://abhyas.tapovan.ai`
- Authorization callback URL: `https://abhyas.tapovan.ai/auth/callback`

---

### 6. `actions/auth.ts` — GitHub OAuth Callbacks

Two Server Actions: the sign-in callback (Moment 1), and the repo-access callback (Moment 2 — built here but only triggered from Phase 7).

```typescript
'use server'
import { createAuthClient, createServerClient } from '@/lib/supabase'
import { encryptApiKey } from '@/lib/crypto'
import { redirect } from 'next/navigation'

// Moment 1 — called from /abhyas/auth/callback after GitHub sign-in
// Scopes at this point: read:user + user:email ONLY. No repo access.
export async function handleGitHubCallback() {
  const supabase = createAuthClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) throw new Error('Auth failed — no session')

  // CRITICAL: Supabase does NOT persist provider_token automatically.
  // Extract it NOW from the session callback or it is gone.
  const githubToken = session.provider_token
  if (!githubToken) throw new Error('GitHub token missing from session')

  const db = createServerClient()
  await db.from('users').upsert({
    id: session.user.id,
    email: session.user.email!,
    github_username: session.user.user_metadata.user_name,
    github_avatar: session.user.user_metadata.avatar_url,
    github_token: encryptApiKey(githubToken),  // encrypted immediately
    github_repo_token: null,                    // not granted at sign-in — null intentionally
  })

  // Check if user has already completed onboarding (has an API key)
  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key')
    .eq('id', session.user.id)
    .single()

  redirect(user?.encrypted_api_key ? '/dashboard' : '/onboarding')
}

// Moment 2 — called from /abhyas/auth/repo-callback after incremental auth
// Only triggered when learner clicks "Connect GitHub repo" on milestone completion screen (Phase 7)
// Scopes at this point: read:user + user:email + repo
export async function handleRepoAccessCallback() {
  const supabase = createAuthClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) throw new Error('Auth failed')

  const repoToken = session.provider_token
  if (!repoToken) throw new Error('Repo token missing')

  const db = createServerClient()
  await db.from('users')
    .update({ github_repo_token: encryptApiKey(repoToken) })
    .eq('id', session.user.id)

  // Return to the milestone that triggered this flow
  const returnTo = session.user.user_metadata.return_to ?? '/dashboard'
  redirect(returnTo)
}
```

---

### 7. `actions/auth.ts` — API Key Storage Action

Add this to `actions/auth.ts`. This is the Server Action called when the learner submits their API key on the onboarding page.

```typescript
// Validate the key format before encrypting and storing
// Anthropic keys start with 'sk-ant-', OpenAI keys start with 'sk-'
export async function saveApiKey(formData: FormData) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/')

  const rawKey = formData.get('apiKey') as string
  if (!rawKey?.trim()) throw new Error('API key is required')

  // Detect provider from key prefix
  const provider: 'anthropic' | 'openai' =
    rawKey.startsWith('sk-ant-') ? 'anthropic' : 'openai'

  const db = createServerClient()
  await db.from('users').update({
    encrypted_api_key: encryptApiKey(rawKey.trim()),
    api_provider: provider,
  }).eq('id', session.user.id)

  // Langfuse trace — Phase 1's only trace
  const { Langfuse } = await import('langfuse')
  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'api_key_saved',
    userId: session.user.id,
    metadata: { provider },
  })
  trace.event({ name: 'key_stored', metadata: { provider } })
  await langfuse.flushAsync()

  redirect('/dashboard')
}
```

---

### 8. Route Handler — `app/auth/callback/route.ts`

```typescript
import { handleGitHubCallback } from '@/actions/auth'

export async function GET() {
  await handleGitHubCallback()
}
```

---

### 9. App Pages — Minimal Shells

**`app/layout.tsx`** — Root layout. Keep minimal for now.

**`app/page.tsx`** — Landing page. One job: render a "Continue with GitHub" button that triggers Supabase GitHub OAuth with `read:user user:email` scopes only.

```typescript
// The sign-in button triggers Supabase OAuth
// Scopes must be explicitly set to minimal — do not rely on Supabase defaults
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    scopes: 'read:user user:email',   // explicit — minimal — no repo
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  },
})
```

**`app/onboarding/page.tsx`** — One field: API key input. Submit calls `saveApiKey` Server Action. Show provider detection in real time (green badge: "Anthropic key detected" or "OpenAI key detected") based on the `sk-ant-` prefix. No other fields on this page. This is the only step between sign-in and the first project idea.

**`app/dashboard/page.tsx`** — Stub only for now. Just render: `<h1>Welcome, {username}</h1>`. Phase 3 builds this out into the real topic entry + project card view.

---

### 10. `lib/model-config.ts` — Verification

After wiring everything, add this sanity check somewhere you can run it (a test file, or temporarily in the dashboard page):

```typescript
import { getModel } from '@/lib/model-config'

console.log(getModel('anthropic', 'fast'))    // 'claude-haiku-4-5'
console.log(getModel('anthropic', 'capable')) // 'claude-sonnet-4-5'
console.log(getModel('openai', 'fast'))       // 'gpt-5.4-nano'
console.log(getModel('openai', 'capable'))    // 'gpt-5.4-mini'
```

---

## Package Dependencies

Install these. Nothing else is needed for Phase 1.

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install langfuse
npm install zod                    # installed now, used from Phase 2
```

No AI SDK packages yet — those come in Phase 3 when agents are built.

---

## What NOT to Build in Phase 1

These are common additions that feel natural but belong in later phases. Do not build them now.

- **No topic entry UI** — that's Phase 3 (Agent 1)
- **No project cards** — that's Phase 3
- **No milestone roadmap** — that's Phase 4
- **No Supabase RLS policies beyond what's in the migration** — the migration covers it
- **No error boundary UI** — Phase 8
- **No loading skeletons** — Phase 8
- **No mobile responsive polish** — Phase 8
- **No email/password auth** — GitHub OAuth only, always
- **No repo scope in sign-in** — that's Moment 2, Phase 7

---

## Security Checklist Before Committing

Run through this before pushing any code.

- [ ] `ENCRYPTION_KEY` is in `.env.local` and in `.gitignore` — confirm it is NOT in source control
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never imported in any file under `app/` that is a Client Component
- [ ] The `saveApiKey` Server Action has `'use server'` at the top
- [ ] The `handleGitHubCallback` action encrypts `provider_token` immediately — no plaintext ever hits the DB
- [ ] The onboarding page form submits to the Server Action — the raw key never appears in a client-side state variable, localStorage, or any API response
- [ ] RLS is enabled on all 7 tables — confirm in Supabase dashboard under Authentication → Policies

---

## Langfuse Setup

1. Create a free account at `cloud.langfuse.com`
2. Create a new project called `abhyas`
3. Copy Public Key and Secret Key into `.env.local`
4. After running the onboarding flow once, open the Langfuse dashboard → Traces
5. Confirm you see one trace named `api_key_saved` with `userId` and `provider` metadata

This is the only trace in Phase 1. From Phase 3 onwards, every agent call gets its own trace.

---

## Phase 1 is Complete When

All items in the Done When checklist at the top of this file pass. Specifically:

**The literal test:** Open a private browser window. Go to `abhyas.tapovan.ai`. Click "Continue with GitHub." See only `read:user` and `user:email` in the GitHub permission prompt — no repo mention. Complete the flow. See your GitHub username on the onboarding page. Add an Anthropic API key. Submit. Open Supabase — see the `encrypted_api_key` column is ciphertext, not your raw key. Open Langfuse — see one trace. Close the browser. Reopen. Go to `abhyas.tapovan.ai` — you are redirected directly to `/dashboard`, not back to onboarding.

That is Phase 1 done.

---

*Next: `phase-02-schemas.md` — Write every Zod schema before any agent code.*