# Phase 03 — Agent 1: Project Ideator + Streaming UI
## Read CLAUDE.md first. Then read this file completely before writing a single line of code.

---

## What This Phase Builds

The first agent and the first real UI the learner sees:

1. `lib/agents/projectIdeator.ts` — Agent 1, streaming project ideas card-by-card
2. `actions/agents.ts` — the Server Action that decrypts the API key and calls Agent 1
3. `app/dashboard/page.tsx` — replaces the Phase 1 stub with the real topic entry UI
4. `components/TopicEntry.tsx` — topic input + skill level selector
5. `components/ProjectIdeaCard.tsx` — the card that renders one streamed project idea
6. Saving the selected project to Supabase and redirecting to the project view (stub)

**No milestone UI. No task UI. No Agent 2 yet.**
The phase ends when the learner clicks "Start Project" and the selection is saved to the DB.

---

## Done When

- [ ] Navigate to `/dashboard` — see topic input field and skill level selector, not the old stub
- [ ] Type "RAG" + select "Beginner" + submit — streaming starts within 2 seconds
- [ ] Watch 5–7 project cards stream in one by one — each card fully renders before the next starts
- [ ] Each card shows: title, description, complexity badge, estimated hours, concepts encountered, skills built — and nothing else (no warm-up resources, no prerequisites)
- [ ] "Start Project" button on a card — saves to `projects` table in Supabase, redirects to `/projects/[id]` (stub page for now)
- [ ] Saved project row in Supabase has: correct `topic`, `title`, `complexity`, `status = 'active'`, `user_id`
- [ ] Repeat with "Intermediate" skill level — confirm card content and complexity badges differ meaningfully from Beginner results
- [ ] Langfuse dashboard — one trace named `agent_1_project_ideator` appears per run, with `userId`, `topic`, `skillLevel`, token count, and latency
- [ ] OpenAI path: swap to an OpenAI key in onboarding — same flow works, cards stream correctly
- [ ] No `warmupResources` field appears anywhere on the project card or in the Agent 1 response

---

## Package Dependencies

Install before writing any code.

```bash
npm install @anthropic-ai/sdk      # Anthropic SDK
npm install openai                  # OpenAI SDK
npm install langfuse                # already installed in Phase 1 — confirm it's there
```

Both SDKs installed regardless of which provider the current user has — the server needs both available since different users bring different keys.

---

## File-by-File Build Order

### 1. `lib/agents/projectIdeator.ts`

This is the core of the phase. Build and test this in isolation before touching any UI.

#### What Agent 1 does

Takes a topic and skill level. Returns 5–7 project ideas, streamed as a JSON array. Each project idea is a complete `ProjectIdea` object (validated against `ProjectIdeaSchema`).

The streaming pattern: the agent streams the entire JSON array as a string. The Server Action parses each complete JSON object as it arrives and yields it to the UI. The UI renders each card as it lands — not all at once when the full response is done.

#### The system prompt

The system prompt is the most important part of this file. Get it right before worrying about the streaming mechanics.

```typescript
function buildSystemPrompt(): string {
  return `You are the Project Ideator for Abhyas AI — a Gurukul-philosophy learning platform for AI developers.

Your job: Generate project ideas for a learner who wants to build with AI.

PLATFORM CONTEXT:
- V1 supports one topic: RAG (Retrieval-Augmented Generation)
- V1 stack is fixed: Next.js 14 + Supabase + pgvector
- Learner brings their own Anthropic or OpenAI API key
- Projects are built on the learner's own machine, pushed to GitHub

WHAT TO GENERATE:
Generate 5–7 distinct project ideas. Each must be genuinely buildable in the stated stack within the estimated hours. No toy examples. No "hello world" variants. Real projects that a developer would be proud to show.

FOR EACH PROJECT, provide:
- title: specific and descriptive (e.g. "Codebase Q&A Assistant" not "RAG App")
- description: 2–3 sentences. What it does, why it's interesting, what makes it non-trivial.
- complexity: match to the learner's skill level. beginner → mostly beginner projects, a couple intermediate. intermediate → mix of intermediate and challenging.
- estimatedHours: realistic total hours. beginner 8–20hrs, intermediate 15–35hrs, challenging 25–60hrs.
- conceptsEncountered: the AI/RAG concepts the learner will actually use (e.g. "chunking strategy", "vector similarity search", "embedding models", "context window management"). 4–6 items.
- skillsBuilt: practical engineering skills (e.g. "building streaming APIs", "Supabase pgvector setup", "Next.js Server Actions"). 3–5 items.

WHAT NOT TO INCLUDE:
- No prerequisites — conceptsEncountered is a map of what they'll meet, not a gate
- No warmupResources — those live on milestones, not project cards
- No "you need to know X before starting" language anywhere

SKILL LEVEL CALIBRATION:
- beginner: favour projects with clear, bounded scope. Avoid open-ended architecture decisions.
- intermediate: projects that require real design choices. Some ambiguity is intentional.
- challenging: projects where the learner must make consequential architectural decisions with real trade-offs.

VARIETY:
Generate meaningfully different projects — different use cases, different complexity levels, different conceptual challenges. Do not generate 5 versions of the same idea.

OUTPUT FORMAT:
Respond with ONLY a valid JSON array. No preamble. No explanation. No markdown fences.
The array must be parseable by JSON.parse() with no preprocessing.

[
  {
    "id": "unique-id-1",
    "title": "...",
    "description": "...",
    "complexity": "beginner|intermediate|challenging",
    "estimatedHours": 12,
    "conceptsEncountered": ["...", "..."],
    "skillsBuilt": ["...", "..."]
  }
]`
}
```

#### The agent function

```typescript
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import { Agent1InputSchema, Agent1OutputSchema, type ProjectIdea } from '@/schemas/agents'

export async function* runProjectIdeator(
  input: unknown,
  provider: Provider,
  apiKey: string,
): AsyncGenerator<ProjectIdea> {
  // Validate input
  const validated = Agent1InputSchema.parse(input)

  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'agent_1_project_ideator',
    input: validated,
  })

  const prompt = `Topic: ${validated.topic}
Skill level: ${validated.skillLevel}
${validated.existingProjects.length > 0
  ? `Already built: ${validated.existingProjects.join(', ')} — generate different projects`
  : ''
}`

  const model = getModel(provider, 'fast')
  let fullResponse = ''

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      })

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullResponse += chunk.delta.text
          // Try to yield complete project objects as they arrive
          yield* extractCompleteProjects(fullResponse)
        }
      }

    } else {
      // OpenAI — uses Responses API for gpt-5.4-nano
      const client = new OpenAI({ apiKey })
      const stream = await client.responses.create({
        model,
        stream: true,
        instructions: buildSystemPrompt(),
        input: prompt,
      })

      for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta') {
          fullResponse += chunk.delta
          yield* extractCompleteProjects(fullResponse)
        }
      }
    }

    // Validate the complete output against the schema
    const parsed = JSON.parse(fullResponse)
    Agent1OutputSchema.parse({ projects: parsed })

    // Langfuse — log completion
    trace.update({
      output: { projectCount: parsed.length },
      metadata: { model, provider, responseLength: fullResponse.length },
    })

  } catch (err) {
    trace.update({ metadata: { error: String(err) } })
    throw err
  } finally {
    await langfuse.flushAsync()
  }
}

// ─── Streaming JSON parser ─────────────────────────────────────────────────────
// Extracts complete JSON objects from a partial JSON array string.
// Yields each complete ProjectIdea as it becomes parseable.
// Tracks which objects have already been yielded to avoid duplicates.

const yieldedCount = new Map<string, number>()

function* extractCompleteProjects(partial: string): Generator<ProjectIdea> {
  // Find all complete JSON objects in the partial string
  // A complete object ends with }, followed by , or ]
  const matches = partial.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g)

  let count = 0
  for (const match of matches) {
    count++
    try {
      const obj = JSON.parse(match[0]) as ProjectIdea
      // Only yield if we haven't yielded this position yet
      const key = partial.slice(0, 20) // use start of string as session key
      const already = yieldedCount.get(key) ?? 0
      if (count > already) {
        yieldedCount.set(key, count)
        yield obj
      }
    } catch {
      // Incomplete object — skip, will retry on next chunk
    }
  }
}
```

> **Note on the streaming JSON parser:** The approach above is a simple heuristic. For V1 it works reliably for the flat JSON structure Agent 1 produces. If you find it missing objects or double-yielding, replace `extractCompleteProjects` with a proper streaming JSON parser like `stream-json` (npm). The agent function signature stays the same either way.

---

### 2. `actions/agents.ts` — Server Action for Agent 1

This is where the API key is decrypted. The raw key never leaves this function.

```typescript
'use server'

import { createAuthClient, createServerClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { runProjectIdeator } from '@/lib/agents/projectIdeator'
import type { Provider } from '@/lib/model-config'
import type { ProjectIdea } from '@/schemas/agents'

// Returns a ReadableStream of newline-delimited JSON — one ProjectIdea per line.
// The client reads this stream and renders each card as it arrives.
export async function generateProjectIdeas(
  topic: string,
  skillLevel: string,
): Promise<ReadableStream<string>> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Fetch encrypted key and provider from DB
  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key, api_provider')
    .eq('id', session.user.id)
    .single()

  if (!user?.encrypted_api_key) throw new Error('No API key found — complete onboarding first')

  // Decrypt server-side — key never touches the client
  const apiKey = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider

  // Build the stream
  const encoder = new TextEncoder()

  return new ReadableStream<string>({
    async start(controller) {
      try {
        const generator = runProjectIdeator(
          { topic, skillLevel, existingProjects: [] },
          provider,
          apiKey,
        )

        for await (const project of generator) {
          // Newline-delimited JSON — one complete ProjectIdea per line
          controller.enqueue(JSON.stringify(project) + '\n')
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

// Save selected project to DB after learner clicks "Start Project"
export async function selectProject(project: ProjectIdea): Promise<string> {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { data, error } = await db
    .from('projects')
    .insert({
      user_id:     session.user.id,
      topic:       project.title, // will be refined when we add topic field to form
      title:       project.title,
      description: project.description,
      complexity:  project.complexity,
      status:      'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(`Failed to save project: ${error.message}`)
  return data.id // returns the new project UUID for redirect
}
```

---

### 3. `components/TopicEntry.tsx`

The first thing the learner sees on the dashboard. Keep it focused — one text input, one skill level selector, one submit button.

```typescript
'use client'

import { useState } from 'react'

interface TopicEntryProps {
  onSubmit: (topic: string, skillLevel: string) => void
  isLoading: boolean
}

export function TopicEntry({ onSubmit, isLoading }: TopicEntryProps) {
  const [topic, setTopic] = useState('')
  const [skillLevel, setSkillLevel] = useState('beginner')

  return (
    <div>
      <h1>What do you want to build?</h1>
      <p>Abhyas V1 is built for RAG projects on Next.js + Supabase.</p>

      <input
        type="text"
        placeholder="e.g. RAG, embeddings, semantic search"
        value={topic}
        onChange={e => setTopic(e.target.value)}
        disabled={isLoading}
      />

      <fieldset>
        <legend>Your current level</legend>
        {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
          <label key={level}>
            <input
              type="radio"
              name="skillLevel"
              value={level}
              checked={skillLevel === level}
              onChange={() => setSkillLevel(level)}
              disabled={isLoading}
            />
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </label>
        ))}
      </fieldset>

      <button
        onClick={() => topic.trim() && onSubmit(topic.trim(), skillLevel)}
        disabled={isLoading || !topic.trim()}
      >
        {isLoading ? 'Finding projects...' : 'Show me projects'}
      </button>
    </div>
  )
}
```

> Styling is intentionally omitted here — apply Tailwind classes in the actual implementation. The structure and behaviour are what matter for this phase.

---

### 4. `components/ProjectIdeaCard.tsx`

Renders one project idea. Three zones — see CLAUDE.md for the card zone spec.

```typescript
'use client'

import type { ProjectIdea } from '@/schemas/agents'

interface ProjectIdeaCardProps {
  project: ProjectIdea
  onSelect: (project: ProjectIdea) => void
  isSelecting: boolean
}

const complexityColour = {
  beginner:     'green',
  intermediate: 'amber',
  challenging:  'red',
} as const

export function ProjectIdeaCard({ project, onSelect, isSelecting }: ProjectIdeaCardProps) {
  return (
    <div>
      {/* Zone 1 — Identity */}
      <div>
        <h2>{project.title}</h2>
        <span>{complexityColour[project.complexity]} • {project.complexity}</span>
        <span>~{project.estimatedHours} hours</span>
        <p>{project.description}</p>
      </div>

      {/* Zone 2 — What the learner will encounter and build */}
      <div>
        <div>
          <h3>Concepts you'll encounter</h3>
          <ul>
            {project.conceptsEncountered.map(c => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <div>
          <h3>Skills you'll build</h3>
          <ul>
            {project.skillsBuilt.map(s => <li key={s}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Zone 3 — Action */}
      {/* No prerequisites. No warmup resources. One button only. */}
      <div>
        <button
          onClick={() => onSelect(project)}
          disabled={isSelecting}
        >
          {isSelecting ? 'Starting...' : 'Start Project'}
        </button>
      </div>
    </div>
  )
}
```

**Important:** Zone 2 shows `conceptsEncountered` and `skillsBuilt` only. No prerequisites. No "you need to know X first." The card is an invitation, not a gate.

---

### 5. `app/dashboard/page.tsx`

Replaces the Phase 1 stub. Orchestrates `TopicEntry` and the streaming card list.

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopicEntry } from '@/components/TopicEntry'
import { ProjectIdeaCard } from '@/components/ProjectIdeaCard'
import { generateProjectIdeas, selectProject } from '@/actions/agents'
import type { ProjectIdea } from '@/schemas/agents'

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectIdea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (topic: string, skillLevel: string) => {
    setIsLoading(true)
    setProjects([])
    setError(null)

    try {
      const stream = await generateProjectIdeas(topic, skillLevel)
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const project = JSON.parse(line) as ProjectIdea
            setProjects(prev => [...prev, project])
          } catch {
            // malformed line — skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelect = useCallback(async (project: ProjectIdea) => {
    setIsSelecting(true)
    try {
      const projectId = await selectProject(project)
      router.push(`/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start project')
      setIsSelecting(false)
    }
  }, [router])

  return (
    <main>
      <TopicEntry onSubmit={handleSubmit} isLoading={isLoading} />

      {error && (
        <div role="alert">{error}</div>
      )}

      {projects.length > 0 && (
        <section>
          <h2>
            {isLoading
              ? `Finding projects... (${projects.length} so far)`
              : `${projects.length} projects for you`
            }
          </h2>
          <div>
            {projects.map(project => (
              <ProjectIdeaCard
                key={project.id}
                project={project}
                onSelect={handleSelect}
                isSelecting={isSelecting}
              />
            ))}
          </div>
        </section>
      )}

      {isLoading && projects.length === 0 && (
        <div>Finding projects for you...</div>
      )}
    </main>
  )
}
```

---

### 6. `app/projects/[id]/page.tsx` — Stub only

Create this now so the redirect from "Start Project" doesn't 404. Phase 4 builds this out.

```typescript
// app/projects/[id]/page.tsx
// STUB — replaced in Phase 4 (Agent 2 + Milestone Roadmap)

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <main>
      <p>Project {params.id} — milestone roadmap coming in Phase 4.</p>
    </main>
  )
}
```

---

## Langfuse Trace Spec

Every Agent 1 call must produce exactly this trace structure in Langfuse. Check the dashboard after the first run.

```
Trace name:     agent_1_project_ideator
userId:         <supabase user id>
input:          { topic, skillLevel, existingProjects }
output:         { projectCount: N }
metadata:       { model, provider, responseLength }
```

If the trace is missing or malformed, fix it before Phase 4. The Langfuse discipline established here carries through all six agents.

---

## Streaming — What to Verify Manually

After getting cards to render, do these manual checks:

1. **Cards appear one at a time** — not all at once after a delay. If all 6 appear simultaneously, the streaming isn't working — the action is buffering the full response before sending.

2. **No partial/broken cards** — each card that renders should be complete. If you see a card with missing fields, the JSON parser is yielding incomplete objects.

3. **Stream ends cleanly** — `isLoading` returns to `false` and the count is correct. If it hangs, the `ReadableStream` controller isn't being closed.

4. **Error state works** — temporarily pass an invalid API key. The error div should appear, not a blank screen.

---

## What NOT to Build in Phase 3

- **No Milestone Roadmap** — that's Phase 4
- **No warm-up shelf** — those resources live on milestones, not project cards. If Agent 1 is returning `warmupResources`, the system prompt needs fixing.
- **No task generation** — Phase 5
- **No nudge UI** — Phase 6
- **No polish / loading skeletons / mobile layout** — Phase 8
- **No saved projects list on the dashboard** — keep the dashboard focused on topic entry for now

---

## Common Mistakes

**Streaming the text character-by-character instead of card-by-card.** The UI should show complete cards arriving one at a time — not a text blob building up. If you're passing the raw stream text to the UI, rethink the architecture: the Server Action parses JSON objects and enqueues them as complete lines.

**Putting `warmupResources` on the project card.** Agent 1 must not generate warm-up resources. If you see this field in the response, the system prompt needs the explicit `WHAT NOT TO INCLUDE` instruction added back.

**Using `complexity` values `'easy'` or `'medium'`.** The correct values are `'beginner'`, `'intermediate'`, `'challenging'`. The DB check constraint will reject any other value.

**Decrypting the API key in a Client Component.** `decryptApiKey` must only be called inside `actions/agents.ts` (a Server Action). If you find yourself importing it anywhere under `app/` that doesn't have `'use server'`, that's a bug.

**Not handling the case where `encrypted_api_key` is null.** A learner who skips onboarding and navigates directly to `/dashboard` will have no key. The Server Action throws with a clear message — the UI should catch it and redirect to `/onboarding`.

---

## Phase 3 is Complete When

All Done When items pass. Specifically the literal test:

Open `/dashboard`. Type "RAG". Select "Beginner". Click "Show me projects". Watch cards stream in — 5 to 7 of them, one at a time. Each card shows title, description, complexity badge, estimated hours, concepts, and skills. No prerequisites. No warm-up resources. Click "Start Project" on one. A row appears in the `projects` Supabase table. You land on `/projects/[id]` stub page. Open Langfuse — one trace visible.

That is Phase 3 done.

---

*Next: `phase-04-agent2.md` — Milestone Architect + roadmap UI + setup checklist.*