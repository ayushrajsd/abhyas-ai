# Phase 04 — Agent 2: Milestone Architect + Roadmap UI
## Read CLAUDE.md first. Then read this file completely before writing a single line of code.

---

## What This Phase Builds

1. `lib/agents/milestoneArchitect.ts` — Agent 2, generates 4–6 milestones for a selected project
2. `actions/agents.ts` — add the `generateMilestones` Server Action (alongside the existing Agent 1 action)
3. `app/projects/[id]/page.tsx` — replaces the Phase 3 stub with the real project view + milestone roadmap
4. `components/MilestoneRoadmap.tsx` — the visual roadmap showing all milestones and their status
5. `app/projects/[id]/milestones/[milestoneId]/page.tsx` — milestone view stub (replaced in Phase 5)

Agent 2 is called once, immediately after the learner selects a project. It generates the full milestone plan, saves all milestones to Supabase, and the roadmap renders. Milestone 1 is set to `active`, all others `locked`.

**No task generation yet. No warm-up shelf content yet. No nudge UI.**
The phase ends when the learner can see their full milestone roadmap and click into Milestone 1 (stub page).

---

## Done When

- [ ] Select a project in Phase 3 — instead of landing on a stub, the project page loads and Agent 2 runs automatically
- [ ] Milestone generation completes — 4–6 milestones saved to Supabase `milestones` table
- [ ] `milestones` table confirms: `order_index` is sequential from 0, `status = 'active'` for Milestone 1, `status = 'locked'` for all others
- [ ] `milestones` table confirms: Milestone 1 row has `setup_checklist` populated (jsonb array, not null), all others have `null`
- [ ] `milestones` table confirms: `concepts_introduced` has no repeated concepts across milestones — each concept appears in exactly one milestone
- [ ] Milestone roadmap renders all milestones — title, description, status badge, estimated hours, concepts introduced
- [ ] Milestone 1 is clickable — links to `/projects/[id]/milestones/[milestoneId]` stub
- [ ] Milestones 2–N are visually locked — not clickable, locked badge visible
- [ ] Beginner project: confirm `setup_checklist` has 5–7 items including exact commands
- [ ] Challenging project: confirm `setup_checklist` has 2–3 items (non-obvious prerequisites only)
- [ ] Langfuse — one trace named `agent_2_milestone_architect` per generation, with `userId`, `projectTitle`, `complexity`, milestone count, token count, latency
- [ ] OpenAI path: same flow works with an OpenAI key

---

## Package Dependencies

No new packages needed. All dependencies from Phase 3 cover this phase.

---

## File-by-File Build Order

### 1. `lib/agents/milestoneArchitect.ts`

Agent 2 is not streamed — it returns the full milestone plan in one response. The learner waits a few seconds and the complete roadmap renders. This is intentional: the roadmap should feel like a complete plan arriving, not incremental pieces.

#### Why `capable` tier matters here

Agent 2 is the most consequential agent in the platform. A poorly sequenced milestone plan breaks the learner's entire journey. Milestone 1 must be achievable in 2–4 hours. Each milestone must introduce genuinely new concepts (no repeats). The plan must be independently verifiable at each step. This requires reasoning depth — use `capable` always.

#### The system prompt

```typescript
function buildSystemPrompt(complexity: string): string {
  const complexityGuidance = {
    beginner: `
COMPLEXITY: BEGINNER
- Milestone 1 must be achievable in 2–4 hours by someone new to the stack
- Break work into small, confidence-building steps
- Each milestone ends with something the learner can see working
- Avoid open-ended architectural decisions — scope is clear and bounded
- Setup checklist for Milestone 1 must include every step including Node.js version check`,

    intermediate: `
COMPLEXITY: INTERMEDIATE
- Milestone 1 achievable in 2–4 hours but requires real design choices
- Some ambiguity in later milestones is intentional — learner must reason through it
- Milestones should build on each other's architectural decisions
- Setup checklist for Milestone 1: cover non-obvious prerequisites, skip the basics`,

    challenging: `
COMPLEXITY: CHALLENGING
- Learner has strong foundations — milestones can be ambitious
- Milestone 1 still achievable in 2–4 hours but sets up consequential decisions for later
- Later milestones should have real trade-offs with no single "right" answer
- Setup checklist for Milestone 1: only the genuinely non-obvious prerequisites (2–3 items max)`,
  }[complexity] ?? ''

  return `You are the Milestone Architect for Abhyas AI — a Gurukul-philosophy learning platform.

Your job: Design a complete milestone plan for a RAG project built on Next.js 14 + Supabase + pgvector.

PLATFORM CONTEXT:
- Stack is fixed: Next.js 14 (App Router) + Supabase (Postgres + pgvector + Auth)
- Learner builds on their own machine, pushes to GitHub
- Each milestone ends with something independently verifiable
- Warm-up resources (docs, articles) are surfaced at milestone level — one per new concept
- The Nudge Agent helps when learners are stuck — milestones don't need to pre-explain everything

${complexityGuidance}

MILESTONE RULES (non-negotiable):
1. Generate exactly 4–6 milestones — no more, no less
2. Milestone 1 MUST be achievable in 2–4 hours
3. conceptsIntroduced[] contains ONLY new concepts — zero repeats across milestones
   If "chunking" appears in Milestone 1, it must NOT appear in Milestone 2, 3, 4, or 5
4. Each milestone must end with something independently verifiable (a working endpoint, a UI that renders, a passing query)
5. warmupResources: exactly one resource per concept in conceptsIntroduced[]
   - type must be one of: "docs", "video", "article", "interactive"
   - url must be real and working — no made-up URLs
   - Prefer official docs over third-party articles

SETUP CHECKLIST (Milestone 1 only):
Generate a setupChecklist for Milestone 1 ONLY. This is null for all other milestones.
Each item: { "item": "human-readable description", "command": "exact terminal command or null", "done": false }
Stack-specific — reference exact package names, exact commands for Next.js + Supabase.

LEARNING OBJECTIVES:
3–5 clear statements of what the learner will understand after completing the milestone.
Written as outcomes: "You will understand how...", "You will be able to..."

OUTPUT FORMAT:
Respond with ONLY a valid JSON object. No preamble. No markdown fences.

{
  "milestones": [
    {
      "title": "...",
      "description": "...",
      "learningObjectives": ["...", "..."],
      "conceptsIntroduced": ["chunking strategy", "..."],
      "warmupResources": [
        {
          "title": "pgvector documentation",
          "url": "https://github.com/pgvector/pgvector",
          "concept": "chunking strategy",
          "type": "docs"
        }
      ],
      "orderIndex": 0,
      "setupChecklist": [
        { "item": "Node.js 18+ installed", "command": "node --version", "done": false },
        { "item": "pgvector extension enabled in Supabase", "command": null, "done": false }
      ]
    },
    {
      "title": "...",
      "orderIndex": 1,
      "setupChecklist": null,
      ...
    }
  ]
}`
}
```

#### The agent function

```typescript
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import {
  Agent2InputSchema,
  Agent2OutputSchema,
  type Agent2Output,
} from '@/schemas/agents'

export async function runMilestoneArchitect(
  input: unknown,
  provider: Provider,
  apiKey: string,
): Promise<Agent2Output> {
  const validated = Agent2InputSchema.parse(input)

  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'agent_2_milestone_architect',
    input: {
      projectTitle: validated.project.title,
      complexity:   validated.project.complexity,
      skillLevel:   validated.skillLevel,
    },
  })

  const prompt = `Design a milestone plan for this project:

Title: ${validated.project.title}
Description: ${validated.project.description}
Complexity: ${validated.project.complexity}
Concepts the learner will encounter: ${validated.project.conceptsEncountered.join(', ')}
Skill level: ${validated.skillLevel}
Topic: ${validated.topic}`

  const model = getModel(provider, 'capable')
  let rawResponse = ''

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      const response = await client.messages.create({
        model,
        max_tokens: 6000,       // milestones are verbose — give it room
        system: buildSystemPrompt(validated.project.complexity),
        messages: [{ role: 'user', content: prompt }],
      })
      rawResponse = response.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

    } else {
      // OpenAI — Responses API
      const client = new OpenAI({ apiKey })
      const response = await client.responses.create({
        model,
        instructions: buildSystemPrompt(validated.project.complexity),
        input: prompt,
      })
      rawResponse = response.output_text ?? ''
    }

    const parsed = JSON.parse(rawResponse)
    const validated_output = Agent2OutputSchema.parse(parsed)

    // Validate no repeated concepts across milestones
    assertNoDuplicateConcepts(validated_output.milestones)

    // Validate setup_checklist only on first milestone
    assertSetupChecklistPosition(validated_output.milestones)

    trace.update({
      output: { milestoneCount: validated_output.milestones.length },
      metadata: {
        model,
        provider,
        responseLength: rawResponse.length,
      },
    })

    return validated_output

  } catch (err) {
    trace.update({ metadata: { error: String(err) } })
    throw err
  } finally {
    await langfuse.flushAsync()
  }
}

// ─── Post-generation validators ───────────────────────────────────────────────

function assertNoDuplicateConcepts(milestones: Agent2Output['milestones']) {
  const seen = new Set<string>()
  for (const milestone of milestones) {
    for (const concept of milestone.conceptsIntroduced) {
      const key = concept.toLowerCase().trim()
      if (seen.has(key)) {
        throw new Error(
          `Duplicate concept "${concept}" introduced in multiple milestones. ` +
          `Each concept must appear in exactly one milestone.`
        )
      }
      seen.add(key)
    }
  }
}

function assertSetupChecklistPosition(milestones: Agent2Output['milestones']) {
  for (const milestone of milestones) {
    if (milestone.orderIndex > 0 && milestone.setupChecklist !== null) {
      throw new Error(
        `setup_checklist must only be on Milestone 1 (orderIndex 0). ` +
        `Found non-null value on milestone with orderIndex ${milestone.orderIndex}.`
      )
    }
  }
  // Milestone 0 must have a setup checklist
  const first = milestones.find(m => m.orderIndex === 0)
  if (first && (first.setupChecklist === null || first.setupChecklist.length === 0)) {
    throw new Error('Milestone 1 (orderIndex 0) must have a non-empty setup_checklist.')
  }
}
```

---

### 2. `actions/agents.ts` — Add `generateMilestones` Server Action

Add this to the existing `actions/agents.ts` file alongside `generateProjectIdeas`.

```typescript
// Add to actions/agents.ts

import { runMilestoneArchitect } from '@/lib/agents/milestoneArchitect'
import type { Agent2Output, ProjectIdea } from '@/schemas/agents'

export async function generateMilestones(
  project: ProjectIdea,
  skillLevel: string,
): Promise<string> {
  // Returns the ID of Milestone 1 for redirect

  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const db = createServerClient()
  const { data: user } = await db
    .from('users')
    .select('encrypted_api_key, api_provider')
    .eq('id', session.user.id)
    .single()

  if (!user?.encrypted_api_key) throw new Error('No API key — complete onboarding first')

  const apiKey  = decryptApiKey(user.encrypted_api_key)
  const provider = user.api_provider as Provider

  // Run Agent 2
  const output: Agent2Output = await runMilestoneArchitect(
    { project, skillLevel, topic: 'RAG' },
    provider,
    apiKey,
  )

  // Save all milestones to Supabase in order
  // First, find the project ID from the project title + user
  const { data: projectRow } = await db
    .from('projects')
    .select('id, complexity')
    .eq('user_id', session.user.id)
    .eq('title', project.title)
    .eq('status', 'active')
    .single()

  if (!projectRow) throw new Error('Project not found')

  // Insert all milestones — Milestone 1 is 'active', rest are 'locked'
  const milestonesToInsert = output.milestones.map(m => ({
    project_id:          projectRow.id,
    title:               m.title,
    description:         m.description,
    learning_objectives: m.learningObjectives,
    concepts_introduced: m.conceptsIntroduced,
    order_index:         m.orderIndex,
    status:              m.orderIndex === 0 ? 'active' : 'locked',
    setup_checklist:     m.setupChecklist ?? null,
    // warmupResources stored as part of the milestone data
    // For now: store in a separate column or as jsonb — see note below
  }))

  const { data: inserted, error } = await db
    .from('milestones')
    .insert(milestonesToInsert)
    .select('id, order_index')

  if (error) throw new Error(`Failed to save milestones: ${error.message}`)

  // Return Milestone 1's ID for redirect
  const firstMilestone = inserted?.find(m => m.order_index === 0)
  if (!firstMilestone) throw new Error('Milestone 1 not found after insert')

  return firstMilestone.id
}
```

> **Note on warmupResources storage:** The `milestones` table doesn't currently have a `warmup_resources` column — warmup resources are generated by Agent 2 but need somewhere to live. Two options: (a) add a `warmup_resources jsonb` column to `milestones` via a new migration, or (b) store them in a separate `warmup_resources` table. For V1, option (a) is simpler. Add migration `003_warmup_resources.sql`:
>
> ```sql
> alter table public.milestones
>   add column if not exists warmup_resources jsonb not null default '[]';
> ```
>
> Then include `warmup_resources: JSON.stringify(m.warmupResources)` in `milestonesToInsert`.

---

### 3. `app/projects/[id]/page.tsx` — Real Project View

Replaces the Phase 3 stub. Runs Agent 2 on first load if milestones don't exist yet.

```typescript
import { createServerClient } from '@/lib/supabase'
import { createAuthClient } from '@/lib/supabase'
import { MilestoneRoadmap } from '@/components/MilestoneRoadmap'
import { generateMilestones } from '@/actions/agents'
import { redirect } from 'next/navigation'

interface ProjectPageProps {
  params: { id: string }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/')

  const db = createServerClient()

  // Fetch project
  const { data: project } = await db
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (!project) redirect('/dashboard')

  // Fetch milestones — if none exist, Agent 2 hasn't run yet
  const { data: milestones } = await db
    .from('milestones')
    .select('*')
    .eq('project_id', params.id)
    .order('order_index')

  // If no milestones yet — this is first load after project selection
  // Run Agent 2 and redirect back to this page (milestones will exist on reload)
  if (!milestones || milestones.length === 0) {
    // Reconstruct ProjectIdea from the saved project row for Agent 2 input
    // In a real implementation, you'd store the full ProjectIdea JSON at project creation
    // For now, use what's available from the project row
    // NOTE: Add a `project_idea` jsonb column to projects table via migration if needed
    const firstMilestoneId = await generateMilestones(
      {
        id:                   project.id,
        title:                project.title,
        description:          project.description,
        complexity:           project.complexity,
        estimatedHours:       0,          // not needed by Agent 2
        conceptsEncountered:  [],         // Agent 2 works from title + description
        skillsBuilt:          [],
      },
      session.user.user_metadata?.skill_level ?? 'beginner',
    )
    redirect(`/projects/${params.id}/milestones/${firstMilestoneId}`)
  }

  return (
    <main>
      <header>
        <h1>{project.title}</h1>
        <p>{project.description}</p>
        <span>{project.complexity} · {project.status}</span>
      </header>

      <MilestoneRoadmap
        projectId={params.id}
        milestones={milestones}
      />
    </main>
  )
}
```

> **Important note on ProjectIdea reconstruction:** When saving a project in Phase 3, the full `ProjectIdea` object (including `conceptsEncountered`, `skillsBuilt`, `estimatedHours`) is not stored — only `title`, `description`, `complexity` are saved. Agent 2 needs the full object. The cleanest fix is to add a `project_idea jsonb` column to the `projects` table and store the complete `ProjectIdea` at selection time. Add this to migration `003`:
>
> ```sql
> alter table public.projects
>   add column if not exists project_idea jsonb;
> ```
>
> Then in `selectProject()` (Phase 3's `actions/agents.ts`), also save `project_idea: project` (the full object). This makes Agent 2's input complete and avoids reconstruction hacks.

---

### 4. `components/MilestoneRoadmap.tsx`

Visual roadmap. Shows all milestones in order. Active milestone is clickable. Locked milestones are not.

```typescript
'use client'

import Link from 'next/link'
import type { MilestoneRow } from '@/schemas/db'

interface MilestoneRoadmapProps {
  projectId: string
  milestones: MilestoneRow[]
}

const statusConfig = {
  active:   { label: 'In Progress', clickable: true  },
  complete: { label: 'Complete',    clickable: true  },
  locked:   { label: 'Locked',      clickable: false },
} as const

export function MilestoneRoadmap({ projectId, milestones }: MilestoneRoadmapProps) {
  return (
    <section>
      <h2>Your Milestone Roadmap</h2>
      <p>{milestones.length} milestones · work through them in order</p>

      <ol>
        {milestones.map((milestone, index) => {
          const config = statusConfig[milestone.status]
          const href = `/projects/${projectId}/milestones/${milestone.id}`

          return (
            <li key={milestone.id}>
              {/* Milestone number + status */}
              <div>
                <span>Milestone {index + 1}</span>
                <span>{config.label}</span>
                {milestone.verification_type && (
                  <span>
                    {milestone.verification_type === 'verified' ? '✓ Verified' : '✓ Self-verified'}
                  </span>
                )}
              </div>

              {/* Title + description */}
              <div>
                <h3>{milestone.title}</h3>
                <p>{milestone.description}</p>
              </div>

              {/* Concepts introduced — what's new in this milestone */}
              {milestone.concepts_introduced.length > 0 && (
                <div>
                  <span>Introduces: </span>
                  {milestone.concepts_introduced.map(c => (
                    <span key={c}>{c}</span>
                  ))}
                </div>
              )}

              {/* CTA — only active and complete milestones are clickable */}
              <div>
                {config.clickable ? (
                  <Link href={href}>
                    {milestone.status === 'complete' ? 'Review' : 'Continue →'}
                  </Link>
                ) : (
                  <span>Complete Milestone {index} to unlock</span>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
```

---

### 5. `app/projects/[id]/milestones/[milestoneId]/page.tsx` — Stub

Create now so the roadmap link doesn't 404. Phase 5 builds this out with tasks and warm-up shelf.

```typescript
// STUB — replaced in Phase 5 (Agent 3 + Task Flow)

import { createServerClient, createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'

export default async function MilestonePage({
  params,
}: {
  params: { id: string; milestoneId: string }
}) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/')

  const db = createServerClient()
  const { data: milestone } = await db
    .from('milestones')
    .select('title, description, status, setup_checklist')
    .eq('id', params.milestoneId)
    .single()

  if (!milestone) redirect(`/projects/${params.id}`)

  return (
    <main>
      <h1>{milestone.title}</h1>
      <p>{milestone.description}</p>
      <p>Status: {milestone.status}</p>
      <p>Task flow and warm-up shelf — coming in Phase 5.</p>
    </main>
  )
}
```

---

### 6. Migration `003_phase4_additions.sql`

Two additions needed that were discovered during this phase's design. Run before testing.

```sql
-- 003_phase4_additions.sql

-- warmup_resources on milestones
-- Stores the warmup resources generated by Agent 2.
-- Shape: [{ title, url, concept, type }]
alter table public.milestones
  add column if not exists warmup_resources jsonb not null default '[]';

-- project_idea on projects
-- Stores the full ProjectIdea JSON from Agent 1.
-- Needed so Agent 2 receives the complete input without reconstruction.
alter table public.projects
  add column if not exists project_idea jsonb;
```

**Update `selectProject()` in `actions/agents.ts` (Phase 3 file)** — add `project_idea: project` to the insert:

```typescript
await db.from('projects').insert({
  user_id:      session.user.id,
  topic:        project.title,
  title:        project.title,
  description:  project.description,
  complexity:   project.complexity,
  status:       'active',
  project_idea: project,  // ← add this
})
```

And update `generateMilestones()` to read from `project_idea` instead of reconstructing:

```typescript
const { data: projectRow } = await db
  .from('projects')
  .select('id, complexity, project_idea')
  .eq('id', projectId)
  .single()

// Use stored project_idea directly — no reconstruction needed
const projectIdea = projectRow.project_idea as ProjectIdea
```

---

## Langfuse Trace Spec

```
Trace name:   agent_2_milestone_architect
userId:       <supabase user id>
input:        { projectTitle, complexity, skillLevel }
output:       { milestoneCount: N }
metadata:     { model, provider, responseLength }
```

---

## The Loading State — Important UX Detail

Agent 2 takes 5–15 seconds. This is the longest wait the learner experiences outside of verification. Handle it well:

The project page, on first load (no milestones yet), should show:
```
[Project title]
[Project description]

Designing your milestone roadmap...
This takes about 10 seconds.
```

Not a spinner alone — give the learner context for what's happening. They've just committed to a project. The wait should feel like the system is doing real work on their behalf, not hanging.

Once milestones arrive (after the redirect), the roadmap renders immediately from the DB — no loading state needed on subsequent visits.

---

## What NOT to Build in Phase 4

- **No warm-up shelf UI** — Phase 5. The resources are saved to DB in this phase, but not rendered yet.
- **No task list** — Phase 5
- **No setup checklist UI** — Phase 5 (checklist data is saved to DB here, rendered in Phase 5)
- **No "mark milestone complete" button** — Phase 5
- **No verification** — Phase 7
- **No progress percentage or analytics** — out of scope entirely

---

## Common Mistakes

**Not validating for duplicate concepts.** Agent 2 will occasionally repeat a concept across milestones despite the instruction. The `assertNoDuplicateConcepts()` validator catches this at generation time and throws — so Claude Code knows to retry or adjust the prompt. Do not remove this check.

**Not saving `warmup_resources` to the DB.** They're generated by Agent 2 and need to be in the DB for the warm-up shelf in Phase 5. If they're not saved here, Phase 5 has no data to render.

**Not saving `project_idea` at project selection.** If this is skipped in Phase 3's `selectProject()`, Agent 2 receives an incomplete input in Phase 4. The migration adds the column — make sure the insert is also updated.

**Milestone status.** Exactly one milestone should be `active` — always `orderIndex === 0` at creation. All others `locked`. If more than one is `active` after insert, there's a bug in the insert logic.

**`setup_checklist` on wrong milestones.** The validator `assertSetupChecklistPosition()` checks this. Only `orderIndex === 0` should have a non-null setup checklist.

**Making locked milestones visually ambiguous.** Locked milestones must not look clickable. No hover effects, no link styling, clear locked label. The learner should understand at a glance that they must complete Milestone 1 before anything else unlocks.

---

## Retry Logic — Agent 2 Failures

Agent 2 occasionally returns malformed JSON or fails the concept-duplicate validation. Build simple retry logic: up to 2 retries with the same input before showing an error to the learner.

```typescript
export async function runMilestoneArchitectWithRetry(
  input: unknown,
  provider: Provider,
  apiKey: string,
  maxRetries = 2,
): Promise<Agent2Output> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runMilestoneArchitect(input, provider, apiKey)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      // Wait briefly before retry
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1500))
    }
  }
  throw lastError
}
```

Use `runMilestoneArchitectWithRetry` in the Server Action, not `runMilestoneArchitect` directly.

---

## Phase 4 is Complete When

All Done When items pass. The literal test:

Select a project from Phase 3. Watch the "Designing your milestone roadmap..." loading state. The roadmap renders with 4–6 milestones. Milestone 1 has an "In Progress" badge and is clickable. All others show "Locked" and are not clickable. Click Milestone 1 — stub page loads. Open Supabase: milestones table has correct rows, `setup_checklist` is non-null on Milestone 1 only, `warmup_resources` is a non-empty array on each milestone. Open Langfuse: one `agent_2_milestone_architect` trace visible.

That is Phase 4 done.

---

*Next: `phase-05-agent3.md` — Task Generator + task flow + warm-up shelf + setup checklist UI + orchestrator COMPLETE_TASK branch.*