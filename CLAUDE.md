# Abhyas AI — Project Compass
## Read this file at the start of every session. It is the single source of truth.

---

## What This Is

Abhyas AI is a multi-agent AI learning platform built as a route inside tapovan.ai (`/abhyas`).

**Core philosophy — Gurukul:** The teacher never gives the answer. They give the next question, the next step, the next context. The answer, when it arrives, arrives in the student's hands — and because of that, it stays.

**The product in one sentence:** A learner enters a topic and skill level, gets AI-generated project ideas, picks one, works through milestones and tasks on their own machine, asks for nudges when stuck, gets verified via GitHub, and ends with a LinkedIn post draft that reflects their authentic journey.

**Core value proposition:** Abhyas is the answer to "I want to learn Next.js / pgvector / RAG — but tutorials don't stick." You learn by building something real. The platform scaffolds the journey so an absolute beginner can enter with zero prior knowledge of the stack and exit with a working project and genuine understanding. The AI never carries you — it orients you, points you to the right resources at the right moment, and nudges you when you are genuinely stuck. The work — and the learning — stays yours.

**What it is NOT:** Not a course platform. Not a tutorial generator. Not an AI that writes code for the learner. Ever.

---

## Stack — Non-Negotiable

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14, App Router | Server Actions keep API keys server-side always. Streaming via server components. No separate backend. |
| Language | TypeScript | Zod validates all agent I/O. Type safety catches contract violations at compile time. |
| Database | Supabase (Postgres + Auth) | Managed Postgres. Built-in RLS. GitHub OAuth handled natively. |
| Auth | GitHub OAuth only | Target audience (AI devs) all have GitHub. Two separate OAuth moments — see Security section. |
| AI calls | User's own API key (BYOK) | User provides their Anthropic or OpenAI key. Encrypted AES-256-GCM. Never stored plaintext. |
| Observability | Langfuse | Every agent call traced. Essential for nudge calibration. |
| Deployment | Vercel | Server Actions, edge functions, environment variable management. |

---

## BYOK Model Configuration — Provider-Aware Agent Calls

Users bring either an **Anthropic** or **OpenAI** key. `api_provider` in the users table records which. Every agent call must route to the correct model for that provider. This is handled by a single config object in `lib/model-config.ts` — never hardcode model strings inside agent files.

### Model Tiers

| Tier | Role | Anthropic | OpenAI |
|---|---|---|---|
| **fast** | High-volume, low-stakes generation (Agent 1 tasks, Agent 3 task list) | `claude-haiku-4-5` | `gpt-5.4-nano` |
| **capable** | Reasoning-heavy, high-stakes calls (Agent 2, Agent 4, Agent 5, Agent 6, Agent 3 hints) | `claude-sonnet-4-5` | `gpt-5.4-mini` |

### The Config (`lib/model-config.ts`)

```typescript
export type Provider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'capable'

export const MODEL_CONFIG: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    fast:    'claude-haiku-4-5',
    capable: 'claude-sonnet-4-5',
  },
  openai: {
    fast:    'gpt-5.4-nano',   // $0.20/MTok in — cheapest GPT-5.4 class, 400K context
    capable: 'gpt-5.4-mini',   // $0.75/MTok in — strong reasoning, coding, agentic tasks
  },
}

export function getModel(provider: Provider, tier: ModelTier): string {
  return MODEL_CONFIG[provider][tier]
}
```

### Per-Agent Model Tier

| Agent | Tier | Reason |
|---|---|---|
| Agent 1 — Project Ideator | `fast` | Generative ideation; quality is in prompt design |
| Agent 2 — Milestone Architect | `capable` | Architectural sequencing; milestone quality shapes the entire journey |
| Agent 3 — Task list | `fast` | Straightforward task decomposition |
| Agent 3 — Hints generation | `capable` | Hints require understanding where learners actually get stuck |
| Agent 4 — Nudge Agent | `capable` | Highest-stakes call in the platform. Never downgrade this. |
| Agent 5 — Verifier | `capable` | Code comprehension and honest assessment require reasoning depth |
| Agent 6 — Completion Narrator | `capable` | Authentic, non-AI-sounding posts require real language quality |

### Calling Convention in Every Agent File

```typescript
// lib/agents/someAgent.ts
import { getModel } from '@/lib/model-config'
import type { Provider } from '@/lib/model-config'

export async function someAgent(input: ..., provider: Provider, apiKey: string) {
  const model = getModel(provider, 'capable') // or 'fast'
  // use model string + apiKey + provider to construct the API call
}
```

### API Call Differences by Provider

```typescript
// Anthropic
const response = await anthropic.messages.create({
  model,
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
})

// OpenAI
const response = await openai.chat.completions.create({
  model,
  messages: [{ role: 'user', content: prompt }],
})
```

Both clients are initialised inside the Server Action with the decrypted key — never in client components. Use the `provider` field from the user record to branch between `Anthropic` and `OpenAI` SDK clients.

### Streaming Differences

Both providers support streaming but the SDK surface differs:
- **Anthropic:** `anthropic.messages.stream(...)` → async iterable of `MessageStreamEvent`
- **OpenAI:** `openai.chat.completions.create({ stream: true })` → async iterable of `ChatCompletionChunk`

The agent wraps whichever stream into a `ReadableStream` before returning to the Server Action — the UI layer never knows which provider is behind it.

---

## Architecture Rules — Never Violate

1. **Orchestrator is a deterministic switch statement.** It is NOT an LLM. It does not decide which agent to call — the user's action determines that. `ENTER_TOPIC` → Agent 1. `SELECT_PROJECT` → Agent 2. `COMPLETE_TASK` → Agent 3 or next milestone. `REQUEST_NUDGE` → Agent 4. `VERIFY_MILESTONE` → Agent 5. `COMPLETE_PROJECT` → Agent 6. If you find yourself writing a prompt that decides routing, stop and write a switch statement.

2. **API keys never touch the client.** Keys are decrypted inside Server Actions only. No client component ever sees, receives, or handles an API key. No API response ever contains a key.

3. **Schemas first, always.** Before writing any agent code, the Zod schema for its output must exist in `schemas/agents.ts`. If you cannot write the schema, you do not yet know what the agent should do. The schema is the contract.

4. **The Nudge Agent never writes working code.** Level 1 = conceptual reframe. Level 2 = directional hint. Level 3 = concrete direction. Even at Level 3, no complete, runnable code block is ever generated. This is the hardest constraint to maintain and the most important.

5. **No LLM-driven routing.** Explicit in the architecture. Ruled out. Switch statement, not an orchestrator LLM.

6. **Pre-written hints serve first.** When a learner clicks "I'm stuck," the three pre-written hints from `tasks.prewritten_hints` are shown first (L1, then L2 if requested, then L3). The Nudge Agent (Agent 4) is only called when the learner explicitly requests more help beyond the pre-written hints, or when their stuck situation is novel (e.g., they paste specific code with a specific error).

---

## The Six Agents — Build Order Matters

### Agent 1 — Project Ideator (green)
- **Model tier:** `fast` → `claude-haiku-4-5` (Anthropic) / `gpt-5.4-nano` (OpenAI)
- **Trigger:** `ENTER_TOPIC` action
- **Input:** topic (string), skillLevel, existingProjects[]
- **Output:** `projects: ProjectIdea[]` (5–7 items), Zod-validated, streamed card-by-card
- **Key rules:** No prerequisites shown on the card. `conceptsEncountered[]` is a map, not a gate. `warmupResources[]` does NOT live on the project card — it lives on milestones. The card shows only what the learner will encounter and build.
- **Card zones:** (1) Title + description + complexity badge + estimated hours + bookmark button. (2) Concepts encountered + Skills built — two columns, no prerequisites. (3) "Start Project" button only.
- **Complexity distribution — enforce exactly in the system prompt:**
  - beginner: 5 beginner, 1 intermediate, 0 challenging
  - intermediate: 1 beginner, 4 intermediate, 2 challenging
  - advanced: 0 beginner, 2 intermediate, 5 challenging
- **Save for Later:** Learners can bookmark any card. Bookmarked projects are stored in the `projects` table with `status = 'saved'`. They persist across sessions and appear in a compact list above the topic entry on the dashboard. Bookmark state is detected by title matching (AI-generated IDs are not stable across sessions).

### Agent 2 — Milestone Architect (blue)
- **Model tier:** `capable` → `claude-sonnet-4-5` (Anthropic) / `gpt-5.4-mini` (OpenAI). Do not downgrade — milestone quality shapes the entire learner journey.
- **Trigger:** `SELECT_PROJECT` action
- **Input:** project (ProjectIdea), skillLevel, topic
- **Output:** `milestones: Milestone[]` (4–6 items), Zod-validated
- **Key rules:** Milestone 1 must be achievable in 2–4 hours max. `conceptsIntroduced[]` contains ONLY new concepts — no repeats from prior milestones. `warmupResources[]` is one resource per new concept — the milestone-level warm-up shelf. Milestones must be independently verifiable (ends with something testable).
- **Warm-up shelf behaviour:** Shown at top of milestone view before first task. Collapses to a drawer once learner starts. Never disappears — just moves out of the way.

### Agent 3 — Task Generator (amber)
- **Model tier:** `fast` for task list, `capable` for hints[] — both in the same call. Tasks are straightforward decomposition; hints require understanding where learners actually get stuck.
- **Trigger:** `SELECT_PROJECT` (first milestone) and `COMPLETE_TASK` (when a milestone is complete, generates next milestone's tasks)
- **Input:** milestone (Milestone), project (ProjectIdea), completedMilestones[], skillLevel
- **Output:** `tasks: Task[]` (3–5 items), Zod-validated. Each task: title, description, concept, doneWhen (concrete and testable), hints[] (3 pre-written), estimatedMinutes, conceptResources[] (1–2 items, see below)
- **Key rules:** Tasks are strictly ordered — cannot start N+1 before N is done. `doneWhen` is a concrete criterion, never a feeling. Hints are pre-generated at task creation — not at nudge time. Hint 1 = conceptual, Hint 2 = directional, Hint 3 = concrete (same 3-level philosophy as the Nudge Agent, but static).
- **Task-level resource shelf — `conceptResources[]`:** Each task carries 1–2 learning resources specifically for its `concept` field (e.g. if the concept is "Next.js App Router file-based routing", the resources link to the relevant Next.js docs section and a short explainer). This is the task-level equivalent of the milestone warm-up shelf. It addresses the absolute beginner gap: the warm-up shelf covers concepts being *introduced* in the milestone, but learners may lack foundational stack knowledge (Next.js routing, React state, how Supabase clients work) that the milestone assumes. `conceptResources[]` fills that gap at the exact moment of need — right at the task where the concept appears. Shown as a collapsible "Learn this concept" shelf on the task view. Pre-computed at task generation time (no runtime API call). **This is the mechanism that makes Abhyas viable for absolute beginners, not just AI-adjacent developers.** A learner with zero Next.js knowledge can enter, and at every task where a new framework concept appears, the right resource is already waiting.
- **Value proposition implication:** The combination of milestone warm-up shelf (new AI/RAG concepts) + task-level concept resources (stack fundamentals) means a learner can go from "I want to learn RAG but don't know where to start" to a working, verifiable project — without needing to pre-study a curriculum. The platform surfaces the right resource at the right moment, contextualised to the exact task. This is what differentiates Abhyas from both tutorial platforms (passive) and raw AI assistants (too permissive).

### Agent 4 — Nudge Agent (purple) ⚠️ Most Critical
- **Model tier:** `capable` always → `claude-sonnet-4-5` (Anthropic) / `gpt-5.4-mini` (OpenAI). Never downgrade. Highest-stakes interaction in the platform.
- **Trigger:** `REQUEST_NUDGE` action — only after pre-written hints have been served first
- **Input:** task (Task), stuckDescription (string), codeSnippet (optional), nudgeLevel (1|2|3), previousNudges[], milestone (for context)
- **Output:** nudgeText (streaming), nudgeLevel, conceptsAddressed[], suggestEscalation (boolean)
- **The three levels:**
  - **L1 Conceptual:** Reframes the problem. Points to the right mental model. No implementation details.
  - **L2 Directional:** Points at the right part of the problem and gives a direction. May reference a specific function, API, or approach. No code.
  - **L3 Concrete:** Names the exact issue. Shows the shape of the solution without filling it in. Still no complete code block.
- **HARDCODED SYSTEM PROMPT RULE:** "You must NEVER write working code for the learner. You must NEVER complete a function, fill in a class body, or provide a working implementation, even partially. If you find yourself writing code that would run as-is, STOP and rewrite as a conceptual description instead. Your job is to illuminate the path, not walk it for them."
- **Warm-up bridge:** The Nudge Agent receives `warmupResources[]` as context. When relevant, it bridges the stuck moment back to the warm-up shelf — "This is the chunking concept from your warm-up shelf — the specific issue is what the pgvector docs cover in the indexing section."

### Agent 5 — Verifier (rose)
- **Model tier:** `capable` → `claude-sonnet-4-5` (Anthropic) / `gpt-5.4-mini` (OpenAI)
- **Trigger:** `VERIFY_MILESTONE` action — only if learner opts in (self-verification is an equally valid first-class path)
- **Input:** milestone (Milestone), tasks (Task[]), githubRepo (string), commitRange (string)
- **Output:** `{ status: "complete" | "partial" | "incorrect" | "cannot_assess", feedback: string (specific), filesReviewed: string[], conceptsVerified: string[] }`
- **Key rules:** Uses GitHub Trees API + Contents API to read relevant files only (not the entire repo). Looks for genuine understanding, not passing tests. `cannot_assess` is valid and honest. Never writes, comments, or creates issues on the learner's repo. Repo access is requested in-context (at milestone completion), never at sign-in.
- **Two verification paths:** (1) Agent-verified → `verification_type = 'verified'` badge. (2) Self-verified → `verification_type = 'self'` badge. Both are equally valid completions. Narrator generates from code specifics for verified; from project context for self-verified.

### Agent 6 — Completion Narrator (cyan/purple gradient)
- **Model tier:** `capable` → `claude-sonnet-4-5` (Anthropic) / `gpt-5.4-mini` (OpenAI). Producing authentic posts that don't sound AI-written requires real language quality.
- **Trigger:** `COMPLETE_PROJECT` action
- **Input:** Full project journey — project, milestones[], nudgeSessions[], verificationRuns[], warmupResources[], totalHoursEstimated, learnerName
- **Output:** `{ posts: CompletionPost[] (exactly 3), projectSummary: string (2-3 sentences), conceptsMastered: string[] }`
- **Three post variants:** (1) Technical — for engineering audience, specific numbers and decisions. (2) Story — building-in-public narrative, draws from actual nudge sessions. (3) Achievement — short, 100-150 words, marks the milestone simply.
- **FORBIDDEN PHRASES in all posts:** "excited to share", "amazing journey", "I learned so much", "looking forward to what's next" — and all generic LinkedIn enthusiasm language. The system prompt must explicitly list these as forbidden.
- **Key rule:** Draws from real experience (nudge sessions = where learner actually struggled). Never exaggerates scope. `projectSummary` is stored permanently in the DB as the learner's portfolio record.
- **Abhyas mention:** Natural attribution only — "built this as a guided project on Abhyas AI" — not a hashtag or CTA. Learner can remove it.

---

## The Orchestrator

Lives in `lib/orchestrator.ts`. It is a TypeScript switch statement. Not an agent. Not an LLM.

```typescript
type UserAction =
  | { type: 'ENTER_TOPIC'; topic: string; skillLevel: SkillLevel }
  | { type: 'SELECT_PROJECT'; projectId: string }
  | { type: 'COMPLETE_TASK'; taskId: string; milestoneId: string }
  | { type: 'REQUEST_NUDGE'; taskId: string; level: 1 | 2 | 3; description: string }
  | { type: 'VERIFY_MILESTONE'; milestoneId: string }
  | { type: 'COMPLETE_PROJECT'; projectId: string }
```

`COMPLETE_TASK` logic: check for next task in milestone → if none, check for next milestone → if none, return `PROJECT_COMPLETE`. This is all code, no AI.

---

## Database Schema — 7 Tables

### users
`id` (uuid PK, from Supabase Auth) · `email` (text unique) · `github_username` (text) · `github_avatar` (text) · `github_token` (text, AES-256, read:user scope only) · `github_repo_token` (text, AES-256, repo scope, nullable until Verifier requested) · `encrypted_api_key` (text, AES-256, nullable until onboarding) · `api_provider` (text: anthropic|openai) · `skill_level` (text) · `created_at` (timestamptz)

### projects
`id` (uuid PK) · `user_id` (uuid FK) · `topic` (text) · `title` (text) · `description` (text) · `complexity` (text) · `status` (text: active|complete|paused) · `github_repo` (text, nullable) · `created_at` (timestamptz)

### milestones
`id` (uuid PK) · `project_id` (uuid FK) · `title` (text) · `description` (text) · `learning_objectives` (text[]) · `concepts_introduced` (text[]) · `order_index` (integer) · `status` (text: locked|active|complete) · `verification_type` (text: verified|self|null) · `verified_at` (timestamptz, nullable)

### tasks
`id` (uuid PK) · `milestone_id` (uuid FK) · `title` (text) · `description` (text) · `concept` (text) · `done_when` (text) · `prewritten_hints` (jsonb: {l1, l2, l3}) · `concept_resources` (jsonb: WarmupResource[], 1–2 items — task-level resource shelf for the task's primary concept) · `order_index` (integer) · `status` (text: locked|active|done) · `estimated_minutes` (integer)

### nudge_sessions
`id` (uuid PK) · `task_id` (uuid FK) · `user_id` (uuid FK) · `stuck_description` (text) · `code_snippet` (text, nullable) · `nudge_level` (integer: 1|2|3) · `response` (text) · `was_helpful` (boolean, nullable, user-rated) · `created_at` (timestamptz)

### verification_runs
`id` (uuid PK) · `milestone_id` (uuid FK) · `user_id` (uuid FK) · `status` (text: complete|partial|incorrect) · `feedback` (text) · `files_reviewed` (text[]) · `commit_sha` (text) · `created_at` (timestamptz)

### completion_posts
`id` (uuid PK) · `project_id` (uuid FK) · `user_id` (uuid FK) · `project_summary` (text) · `concepts_mastered` (text[]) · `post_technical` (text) · `post_story` (text) · `post_achievement` (text) · `shared_at` (timestamptz, nullable) · `created_at` (timestamptz)

---

## Security Architecture — BYOK

- **AES-256-GCM** for all sensitive values: `encrypted_api_key`, `github_token`, `github_repo_token`
- **Master key:** Lives in Vercel env var `ENCRYPTION_KEY` (32 bytes, hex). Never in source. Never in DB.
- **Storage format:** `iv:authTag:ciphertext` (all hex, colon-separated)
- **Decryption:** Server Actions only. Key exists in server memory only for the duration of one agent call.
- **Client rule:** No client component ever touches, sees, or receives a key value. No API response ever returns a key.

```typescript
// lib/crypto.ts — AES-256-GCM encrypt/decrypt
// encryptApiKey(plaintext: string): string → "iv:tag:ciphertext"
// decryptApiKey(stored: string): string → plaintext
```

---

## GitHub OAuth — Two Separate Moments

**Moment 1 — Sign-in (landing page):**
- Scopes: `read:user` + `user:email` only
- Stored as: `github_token` (encrypted)
- `github_repo_token` column is null at this point
- The learner sees a minimal, familiar permission prompt. No repo mention.

**Moment 2 — Repo access (milestone completion screen, inside an active project):**
- Triggered only when learner clicks "Verify Milestone" and `github_repo_token` is null
- UI shows a contextual explanation before any redirect: "To verify your milestone, Abhyas needs read-only access to your repository. This is used only to check your code. Abhyas never writes, comments, or modifies your repo."
- Two buttons: "Connect GitHub repo" and "I'll verify myself"
- If connected: incremental auth (session stays active, no re-login). Stored as `github_repo_token` (encrypted, separate column).
- If self-verify: `verification_type = 'self'`, milestone marked complete immediately, no friction.

**IMPORTANT — Supabase provider_token behaviour:** Supabase gives you the GitHub `provider_token` in the session callback but does NOT store it automatically. Extract it at callback time and store it encrypted yourself. If you miss this step, the token is gone.

---

## File Structure

```
app/
  abhyas/
    page.tsx                    # Landing / topic entry
    layout.tsx                  # Abhyas-specific layout
    onboarding/
      page.tsx                  # API key setup (one field, one step)
    projects/
      [id]/
        page.tsx                # Project view with milestone roadmap
        milestones/
          [milestoneId]/
            page.tsx            # Milestone view with warm-up shelf + task list
            tasks/
              [taskId]/
                page.tsx        # Task view with nudge interface

lib/
  agents/
    projectIdeator.ts           # Agent 1 — structured output, streamed card-by-card
    milestoneArchitect.ts       # Agent 2 — structured output
    taskGenerator.ts            # Agent 3 — structured output + hints
    nudgeAgent.ts               # Agent 4 — streaming text, NEVER complete code
    verifier.ts                 # Agent 5 — GitHub Trees API + structured output
    completionNarrator.ts       # Agent 6 — full journey → 3 LinkedIn drafts
  orchestrator.ts               # State machine — switch statement, NOT an LLM
  model-config.ts               # Provider-aware model tier config — single source of truth for all model strings
  crypto.ts                     # AES-256-GCM encrypt/decrypt
  github.ts                     # GitHub API client (Trees + Contents APIs)
  supabase.ts                   # Supabase client (server + client variants)

schemas/
  agents.ts                     # ALL Zod schemas for agent I/O — written first, always
  db.ts                         # Zod schemas matching DB tables

actions/
  agents.ts                     # Server Actions — call orchestrator, decrypt key server-side
  auth.ts                       # GitHub OAuth callbacks, API key storage

components/
  abhyas/
    TopicEntry.tsx
    ProjectIdeaCard.tsx
    MilestoneRoadmap.tsx
    TaskList.tsx
    StuckForm.tsx               # The nudge request UI
    NudgeResponse.tsx           # Streaming nudge display
    VerificationReport.tsx
```

---

## Topics Supported in V1

RAG — the primary topic for launch. Add after launch: Agents, Fine-tuning, Embeddings, Prompt Engineering.

---

## What Is Explicitly OUT OF SCOPE for V1

Do not build any of the following before public launch:

- **In-browser code execution** — learners build on their own machine. Abhyas reads GitHub.
- **Collaborative / social features** — no sharing between users, no feed, no leaderboard, no stars.
- **LLM-driven orchestrator routing** — deterministic switch statement only.
- **Custom fine-tuned models** — BYOK with standard models is sufficient.
- **Native mobile app** — responsive web first.
- **Analytics dashboard for learners** — the milestone roadmap is the progress view.

---

## Build Milestones — Do Not Start N+1 Until N Passes Its Done-When

| Phase | What | Done When |
|---|---|---|
| Phase 1 | Foundation: Next.js + Supabase + GitHub OAuth + BYOK crypto | Click "Continue with GitHub," see minimal permission prompt (no repo mention), land back, see GitHub username, add API key, confirm encrypted in Supabase |
| Phase 2 | Schemas: All Zod schemas in `schemas/agents.ts` and `schemas/db.ts` | Every schema imports without error. Types are exported. No agent code yet. |
| Phase 3 | Agent 1 + streaming UI | Enter "RAG" at beginner level, see 5–7 streaming project cards each with full content, click a warm-up resource pill and confirm it opens correctly, pick a project and see it saved in Supabase |
| Phase 4 | Agent 2 + milestone roadmap UI | Pick a project, see milestone roadmap rendered, milestones in DB, Milestone 1 shows as "active" |
| Phase 5 | Agent 3 + task flow + orchestrator COMPLETE_TASK branch | End-to-end flow works for one complete milestone — see all tasks, complete them in sequence, move to next milestone automatically. Each task shows a "Learn this concept" shelf with 1–2 pre-generated resources for its concept field. |
| Phase 6 | Agent 4 (Nudge) — the hardest phase | Mark a task stuck, see pre-written Hint 1, request more, see Nudge Agent's L1 streamed, escalate to L2 and L3, verify no complete code block appears in any response |
| Phase 7 | Agent 5 + incremental GitHub OAuth | Select a repo, push code for Milestone 1, click Verify, see specific feedback with files reviewed listed |
| Phase 8 | Agent 6 + polish | Three LinkedIn post variants render after project completion, all nudge/error/loading/empty states handled, 10 alpha users complete one milestone without unhandled error |

---

## The First Three Files to Create (Phase 1 start)

1. **`schemas/agents.ts`** — Write every Zod schema first, before any agent code.
2. **`lib/crypto.ts`** — Write and test encrypt/decrypt before anything else touches user data.
3. **`lib/agents/projectIdeator.ts`** — The simplest agent. Get end-to-end streaming working first.

---

## Langfuse Tracing

Every agent call goes through Langfuse. Trace name = agent name. Capture: input, output, model, tokens, latency. The nudge sessions are especially important to trace — nudge calibration depends on being able to review what was actually generated.

---

*Abhyas AI · tapovan.ai/abhyas · Open Source · MIT*
*अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते — BG 6.35*