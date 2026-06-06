# Phase 05 — Agent 3: Task Generator + Task Flow + Orchestrator

## Read CLAUDE.md first. Then read this file completely before writing a single line of code.

---

## ⚠️ Changes from Earlier Direction

**Setup checklist is NOT limited to Milestone 1.**

CLAUDE.md and phase-04 say the setup checklist is generated for Milestone 1 only. That was too narrow — ignore it for this phase onwards.

The correct behaviour is: Agent 2 generates a `setup_checklist` for **any milestone that introduces new environment requirements** — a new service, a new API key, a new env var, a new Supabase migration. Milestones with no new environment setup get `null`.

Real examples that warrant a checklist on later milestones:

- Milestone 2 adds pgvector embeddings → needs `OPENAI_API_KEY` in `.env.local` and a new migration
- Milestone 3 adds Langfuse observability → needs `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY`
- Milestone 4 adds GitHub verification → needs `github_repo_token` OAuth flow

**What this means for Phase 5:**

- `SetupChecklist` component renders whenever `milestone.setup_checklist` is non-null — on any milestone, not just `order_index === 0`
- The milestone page checks `setup_checklist !== null`, not `order_index === 0`
- The `assertSetupChecklistPosition` validator from phase-04 is NOT implemented — it enforces the wrong rule

**What stays the same:**

- Agent 2's system prompt (already implemented in Phase 4) — if it only generates checklists for Milestone 1, that's acceptable for now. The prompt can be improved when Agent 2 is revisited. The UI just needs to be ready to show a checklist on any milestone.
- DB schema — `setup_checklist jsonb nullable` on `milestones` is already correct from phase-02 migration

---

## What This Phase Builds

This is the core learning loop. Everything before this phase was setup. This phase is the thing itself.

1. `lib/agents/taskGenerator.ts` — Agent 3, generates 3–5 complexity-calibrated tasks per milestone
2. `lib/orchestrator.ts` — `COMPLETE_TASK` branch: next task → next milestone → project complete
3. `actions/agents.ts` — add `generateTasks` and `completeTask` Server Actions
4. `app/projects/[id]/milestones/[milestoneId]/page.tsx` — replaces Phase 4 stub with the real milestone view:
   - Setup checklist (any milestone that has one, above warm-up shelf)
   - Warm-up shelf (complexity-aware prominence)
   - Task list with hints drawer
5. `components/TaskList.tsx` — ordered tasks, sequential locking, `doneWhen`, hints L1→L2→L3
6. `components/WarmupShelf.tsx` — complexity-aware resource shelf
7. `components/SetupChecklist.tsx` — checkable items with commands, shown on any milestone that has setup requirements

**Agent 3 runs at two moments:**

- **Eagerly** — immediately after Agent 2 finishes (Phase 4), tasks for Milestone 1 are generated and saved before the learner arrives at the milestone page. No wait when they click in.
- **Lazily** — when the last task of a milestone is marked done, tasks for the next milestone are generated in the background before the transition.

**No Nudge Agent yet.** Pre-written hints are shown in this phase. The "I'm still stuck" button that calls Agent 4 is Phase 6.

---

## Done When

- [ ] Click "Begin Milestone" on Milestone 1 — task list renders immediately (no loading, tasks pre-generated in Phase 4)
- [ ] Tasks are in order — Task 1 is `active`, Tasks 2–N are `locked`
- [ ] Cannot interact with a locked task — it's visually distinct and non-interactive
- [ ] Each task shows: title, description, concept tag, estimated minutes, `doneWhen` criterion
- [ ] Click "Show hint" on Task 1 — L1 hint appears. "Show next hint" reveals L2. Then L3. No hint beyond L3.
- [ ] Beginner project hints: L1 explains concept with analogy. L2 points to specific SDK/docs. L3 shows response shape.
- [ ] Intermediate project hints: L1 asks a redirecting question. L2 points at abstraction. L3 names issue in prose only.
- [ ] Challenging project hints: L1 challenges an assumption. L2 points at docs or prior decision. L3 names category only.
- [ ] Click "Mark as done" on Task 1 — Task 2 unlocks. Task 1 shows "Done" state.
- [ ] Complete all tasks in Milestone 1 — milestone marked `complete` in DB, Milestone 2 status changes to `active`
- [ ] Milestone 2 tasks are already in DB when Milestone 1 completes (pre-generated in background)
- [ ] Redirected to Milestone 2 automatically after Milestone 1 completion
- [ ] Warm-up shelf: beginner project → expanded by default with prompt. Intermediate → collapsed. Challenging → minimal "References" link only.
- [ ] Setup checklist: visible only on Milestone 1, above the warm-up shelf. Absent on all other milestones.
- [ ] Langfuse: one trace `agent_3_task_generator` per milestone generation, with `userId`, `milestoneTitle`, `complexity`, task count, token count
- [ ] OpenAI path: same flow works end to end

---

## Package Dependencies

No new packages. All dependencies from Phase 3 cover this phase.

---

## File-by-File Build Order

### 1. `lib/agents/taskGenerator.ts`

Agent 3 makes two LLM calls in one function:

- **Call 1 (`fast` tier):** Generate task structure — title, description, concept, doneWhen, estimatedMinutes
- **Call 2 (`capable` tier):** Generate pre-written hints for each task — L1, L2, L3, calibrated by complexity

Two calls because the quality requirements differ. Task structure is deterministic and straightforward. Hints require genuine understanding of where learners get stuck — that needs the capable model.

#### The system prompts

```typescript
function buildTaskStructurePrompt(complexity: string): string {
  const doneWhenGuidance =
    {
      beginner: `doneWhen must be mechanical and specific. Name the exact endpoint, exact response shape, or exact UI state.
Example: "POST to /api/embed with {"text": "hello"} returns {"embedding": [0.023, -0.14, ...]}"
The learner should be able to verify completion without any judgment call.`,

      intermediate: `doneWhen must be outcome-based. Describe what should work, not how it should look.
Example: "Semantic search returns meaningfully different results for semantically different queries."
Some judgment is required — that's intentional.`,

      challenging: `doneWhen must be quality and judgment-based. The learner defines what done looks like within a criterion.
Example: "Retrieval quality holds up across at least 3 different document types with a latency strategy you can justify."
The learner must reason about quality, not just check a box.`,
    }[complexity] ?? "";

  return `You are the Task Generator for Abhyas AI — a Gurukul-philosophy learning platform.

Your job: Break a milestone into 3–5 concrete, sequentially ordered tasks for a learner building a RAG project on Next.js 14 + Supabase + pgvector.

TASK RULES:
- Generate exactly 3–5 tasks — no more, no less
- Tasks must be strictly ordered — each task builds on the previous
- Each task exercises exactly one core concept (the "concept" field)
- Tasks are independent enough that a learner can complete one in a focused session
- No task should require the learner to have done anything outside the milestone scope

DONE WHEN CALIBRATION:
${doneWhenGuidance}

ESTIMATED MINUTES:
Realistic time estimates. beginner: 30–90 min per task. intermediate: 45–120 min. challenging: 60–180 min.
Account for reading, debugging, and thinking time — not just implementation time.

STACK SPECIFICITY:
This is a Next.js 14 + Supabase project. Tasks must reference the actual stack.
Good: "Create a Supabase migration to add the embeddings column"
Bad: "Set up your database schema"

OUTPUT FORMAT:
Respond with ONLY a valid JSON array. No preamble. No markdown fences.

[
  {
    "title": "...",
    "description": "2-3 sentences. What to build and why it matters for the project.",
    "concept": "the single core concept this task exercises",
    "doneWhen": "...",
    "orderIndex": 0,
    "estimatedMinutes": 45
  }
]`;
}

function buildHintsPrompt(complexity: string): string {
  const hintGuidance =
    {
      beginner: `L1 — Explain the concept with an analogy. Name the pattern. No implementation details.
L2 — Point to the specific SDK function, Supabase method, or docs section the learner needs.
L3 — Show the response shape or function signature the learner should be targeting. No complete code.`,

      intermediate: `L1 — Ask a question that redirects their thinking. No explanation. No analogy.
L2 — Point at the right abstraction. No example. One directional sentence.
L3 — Name the exact issue. Describe the fix in prose only. No code shape shown.`,

      challenging: `L1 — Ask a single question that challenges an assumption they're making.
L2 — Point at a specific docs section or a decision the learner made in a prior task/milestone.
L3 — Name the category of the problem only. The learner figures out the fix.`,
    }[complexity] ?? "";

  return `You are generating pre-written hints for tasks in an AI learning platform.
Philosophy: Never give the answer. Illuminate the path, never walk it.

HINT LEVELS FOR ${complexity.toUpperCase()} COMPLEXITY:
${hintGuidance}

ABSOLUTE RULES (apply at all complexity levels):
- NEVER write working code in any hint at any level
- NEVER complete a function signature, fill in a class body, or show runnable code
- NEVER give the answer — even L3 must leave the final connection for the learner to make
- Hints must be stack-specific: reference Next.js, Supabase, @supabase/supabase-js, pgvector by name

OUTPUT FORMAT:
Given a JSON array of tasks, return a JSON array of hint objects in the same order.
Each object: { "taskIndex": N, "l1": "...", "l2": "...", "l3": "..." }
No preamble. No markdown fences. Valid JSON only.`;
}
```

#### The agent function

```typescript
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Langfuse } from "langfuse";
import { getModel, type Provider } from "@/lib/model-config";
import {
  Agent3InputSchema,
  Agent3OutputSchema,
  type Agent3Output,
  type Task,
} from "@/schemas/agents";

export async function runTaskGenerator(
  input: unknown,
  provider: Provider,
  apiKey: string,
): Promise<Agent3Output> {
  const validated = Agent3InputSchema.parse(input);
  const { complexity, milestone } = validated;

  const langfuse = new Langfuse();
  const trace = langfuse.trace({
    name: "agent_3_task_generator",
    input: {
      milestoneTitle: milestone.title,
      complexity,
      skillLevel: validated.skillLevel,
    },
  });

  const taskPrompt = `Generate tasks for this milestone:

Milestone: ${milestone.title}
Description: ${milestone.description}
Concepts introduced: ${milestone.conceptsIntroduced.join(", ")}
Project: ${validated.project.title}
Completed milestones so far: ${validated.completedMilestones.join(", ") || "none — this is the first milestone"}`;

  const fastModel = getModel(provider, "fast");
  const capableModel = getModel(provider, "capable");

  try {
    // ── Call 1: Generate task structure (fast tier) ──────────────────────────
    let taskStructureRaw = "";

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: fastModel,
        max_tokens: 3000,
        system: buildTaskStructurePrompt(complexity),
        messages: [{ role: "user", content: taskPrompt }],
      });
      taskStructureRaw = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } else {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model: fastModel,
        instructions: buildTaskStructurePrompt(complexity),
        input: taskPrompt,
      });
      taskStructureRaw = response.output_text ?? "";
    }

    const taskStructures = JSON.parse(taskStructureRaw) as Omit<
      Task,
      "prewrittenHints"
    >[];

    // ── Call 2: Generate hints for each task (capable tier) ──────────────────
    const hintsPromptInput = `Generate hints for these tasks:
${JSON.stringify(
  taskStructures.map((t, i) => ({
    taskIndex: i,
    title: t.title,
    description: t.description,
    concept: t.concept,
    doneWhen: t.doneWhen,
  })),
  null,
  2,
)}`;

    let hintsRaw = "";

    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: capableModel,
        max_tokens: 4000,
        system: buildHintsPrompt(complexity),
        messages: [{ role: "user", content: hintsPromptInput }],
      });
      hintsRaw = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");
    } else {
      const client = new OpenAI({ apiKey });
      const response = await client.responses.create({
        model: capableModel,
        instructions: buildHintsPrompt(complexity),
        input: hintsPromptInput,
      });
      hintsRaw = response.output_text ?? "";
    }

    const hints = JSON.parse(hintsRaw) as Array<{
      taskIndex: number;
      l1: string;
      l2: string;
      l3: string;
    }>;

    // ── Merge task structure + hints ─────────────────────────────────────────
    const tasks: Task[] = taskStructures.map((t, i) => {
      const taskHints = hints.find((h) => h.taskIndex === i);
      if (!taskHints)
        throw new Error(`Missing hints for task ${i}: ${t.title}`);
      return {
        ...t,
        prewrittenHints: {
          l1: taskHints.l1,
          l2: taskHints.l2,
          l3: taskHints.l3,
        },
      };
    });

    const output = Agent3OutputSchema.parse({ tasks });

    trace.update({
      output: { taskCount: tasks.length },
      metadata: { fastModel, capableModel, provider },
    });

    return output;
  } catch (err) {
    trace.update({ metadata: { error: String(err) } });
    throw err;
  } finally {
    await langfuse.flushAsync();
  }
}
```

---

### 2. `lib/orchestrator.ts`

The orchestrator is a **deterministic switch statement**. Not an LLM. Not smart. Just routing.

The `COMPLETE_TASK` branch is the only branch built in this phase. Other branches are stubbed.

```typescript
import { createServerClient } from "@/lib/supabase";

export type OrchestratorResult =
  | { type: "NEXT_TASK"; taskId: string }
  | { type: "MILESTONE_COMPLETE"; nextMilestoneId: string }
  | { type: "PROJECT_COMPLETE"; projectId: string }
  | { type: "ERROR"; message: string };

export async function handleCompleteTask(
  taskId: string,
  milestoneId: string,
  userId: string,
): Promise<OrchestratorResult> {
  const db = createServerClient();

  // 1. Mark the task as done
  await db
    .from("tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("milestone_id", milestoneId);

  // 2. Is there a next task in this milestone?
  const { data: currentTask } = await db
    .from("tasks")
    .select("order_index")
    .eq("id", taskId)
    .single();

  if (!currentTask) return { type: "ERROR", message: "Task not found" };

  const { data: nextTask } = await db
    .from("tasks")
    .select("id")
    .eq("milestone_id", milestoneId)
    .eq("order_index", currentTask.order_index + 1)
    .single();

  if (nextTask) {
    // Unlock the next task
    await db.from("tasks").update({ status: "active" }).eq("id", nextTask.id);

    return { type: "NEXT_TASK", taskId: nextTask.id };
  }

  // 3. No next task — milestone is complete
  await db
    .from("milestones")
    .update({ status: "complete" })
    .eq("id", milestoneId);

  // 4. Is there a next milestone?
  const { data: currentMilestone } = await db
    .from("milestones")
    .select("order_index, project_id")
    .eq("id", milestoneId)
    .single();

  if (!currentMilestone)
    return { type: "ERROR", message: "Milestone not found" };

  const { data: nextMilestone } = await db
    .from("milestones")
    .select("id")
    .eq("project_id", currentMilestone.project_id)
    .eq("order_index", currentMilestone.order_index + 1)
    .single();

  if (nextMilestone) {
    // Unlock the next milestone
    await db
      .from("milestones")
      .update({ status: "active" })
      .eq("id", nextMilestone.id);

    return { type: "MILESTONE_COMPLETE", nextMilestoneId: nextMilestone.id };
  }

  // 5. No next milestone — project is complete
  await db
    .from("projects")
    .update({ status: "complete" })
    .eq("id", currentMilestone.project_id);

  return { type: "PROJECT_COMPLETE", projectId: currentMilestone.project_id };
}
```

---

### 3. `actions/agents.ts` — Add `generateTasks` and `completeTask`

Add to existing `actions/agents.ts`.

```typescript
// ── generateTasks ──────────────────────────────────────────────────────────
// Called in two moments:
//   1. Eagerly — from generateMilestones() in Phase 4 immediately after Agent 2
//   2. Lazily  — from completeTask() when a milestone finishes
// In both cases: generates tasks, saves to DB, sets Task 1 as active.

export async function generateTasks(
  milestoneId: string,
  projectId: string,
): Promise<void> {
  const supabase = createAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const db = createServerClient();

  // Fetch everything Agent 3 needs
  const { data: user } = await db
    .from("users")
    .select("encrypted_api_key, api_provider, skill_level")
    .eq("id", session.user.id)
    .single();

  if (!user?.encrypted_api_key) throw new Error("No API key");

  const { data: milestone } = await db
    .from("milestones")
    .select("*")
    .eq("id", milestoneId)
    .single();

  const { data: project } = await db
    .from("projects")
    .select("*, project_idea")
    .eq("id", projectId)
    .single();

  const { data: completedMilestones } = await db
    .from("milestones")
    .select("title")
    .eq("project_id", projectId)
    .eq("status", "complete");

  if (!milestone || !project) throw new Error("Milestone or project not found");

  const apiKey = decryptApiKey(user.encrypted_api_key);
  const provider = user.api_provider as Provider;

  const output = await runTaskGenerator(
    {
      milestone: milestone,
      project: project.project_idea,
      completedMilestones: completedMilestones?.map((m) => m.title) ?? [],
      skillLevel: user.skill_level ?? "beginner",
      complexity: project.complexity,
    },
    provider,
    apiKey,
  );

  // Save tasks to DB — Task 0 is active, rest locked
  const tasksToInsert = output.tasks.map((t) => ({
    milestone_id: milestoneId,
    title: t.title,
    description: t.description,
    concept: t.concept,
    done_when: t.doneWhen,
    prewritten_hints: t.prewrittenHints,
    order_index: t.orderIndex,
    status: t.orderIndex === 0 ? "active" : "locked",
    estimated_minutes: t.estimatedMinutes,
  }));

  const { error } = await db.from("tasks").insert(tasksToInsert);
  if (error) throw new Error(`Failed to save tasks: ${error.message}`);
}

// ── completeTask ────────────────────────────────────────────────────────────
// Called when learner clicks "Mark as done" on a task.
// Runs the orchestrator COMPLETE_TASK branch.
// If milestone completes, generates tasks for next milestone in background.

export async function completeTask(
  taskId: string,
  milestoneId: string,
  projectId: string,
): Promise<OrchestratorResult> {
  const supabase = createAuthClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const result = await handleCompleteTask(taskId, milestoneId, session.user.id);

  // If milestone just completed, generate tasks for next milestone in background
  // Don't await — learner shouldn't wait for this
  if (result.type === "MILESTONE_COMPLETE") {
    generateTasks(result.nextMilestoneId, projectId).catch((err) => {
      console.error("Background task generation failed:", err);
      // Non-fatal — tasks will be generated on-demand when learner arrives
    });
  }

  return result;
}
```

---

### 4. `app/projects/[id]/milestones/[milestoneId]/page.tsx`

Replaces the Phase 4 stub. The real milestone view.

```typescript
import { createServerClient, createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { WarmupShelf } from '@/components/WarmupShelf'
import { SetupChecklist } from '@/components/SetupChecklist'
import { TaskList } from '@/components/TaskList'
import { generateTasks } from '@/actions/agents'

export default async function MilestonePage({
  params,
}: {
  params: { id: string; milestoneId: string }
}) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/')

  const db = createServerClient()

  // Fetch milestone with warmup resources and setup checklist
  const { data: milestone } = await db
    .from('milestones')
    .select('*')
    .eq('id', params.milestoneId)
    .single()

  if (!milestone) redirect(`/projects/${params.id}`)
  if (milestone.status === 'locked') redirect(`/projects/${params.id}`)

  // Fetch project for complexity signal
  const { data: project } = await db
    .from('projects')
    .select('complexity')
    .eq('id', params.id)
    .single()

  const complexity = project?.complexity ?? 'beginner'

  // Fetch tasks — if none exist yet, generate them now (fallback for eager generation failure)
  let { data: tasks } = await db
    .from('tasks')
    .select('*')
    .eq('milestone_id', params.milestoneId)
    .order('order_index')

  if (!tasks || tasks.length === 0) {
    // Eager generation missed — generate now and reload
    await generateTasks(params.milestoneId, params.id)
    const { data: freshTasks } = await db
      .from('tasks')
      .select('*')
      .eq('milestone_id', params.milestoneId)
      .order('order_index')
    tasks = freshTasks ?? []
  }

  const isFirstMilestone = milestone.order_index === 0
  const warmupResources  = milestone.warmup_resources ?? []
  const setupChecklist   = milestone.setup_checklist ?? null  // can be non-null on any milestone

  return (
    <main>
      {/* Milestone header */}
      <header>
        <h1>{milestone.title}</h1>
        <p>{milestone.description}</p>
        <div>
          {milestone.learning_objectives.map((obj: string) => (
            <p key={obj}>✓ {obj}</p>
          ))}
        </div>
      </header>

      {/* Setup checklist — shown on ANY milestone that has one, above warm-up shelf */}
      {setupChecklist && setupChecklist.length > 0 && (
        <SetupChecklist items={setupChecklist} milestoneId={params.milestoneId} />
      )}

      {/* Warm-up shelf — complexity-aware prominence */}
      {warmupResources.length > 0 && (
        <WarmupShelf
          resources={warmupResources}
          complexity={complexity}
          isFirstMilestone={isFirstMilestone}
        />
      )}

      {/* Task list */}
      <TaskList
        tasks={tasks}
        milestoneId={params.milestoneId}
        projectId={params.id}
        complexity={complexity}
      />
    </main>
  )
}
```

---

### 5. `components/SetupChecklist.tsx`

Checkable list. Milestone 1 only. Above the warm-up shelf.

```typescript
'use client'

import { useState } from 'react'
import type { SetupItem } from '@/schemas/db'

interface SetupChecklistProps {
  items: SetupItem[]
  milestoneId: string
}

export function SetupChecklist({ items, milestoneId }: SetupChecklistProps) {
  const [checked, setChecked] = useState<Record<number, boolean>>(
    Object.fromEntries(items.map((_, i) => [i, false]))
  )

  const allDone = Object.values(checked).every(Boolean)
  const doneCount = Object.values(checked).filter(Boolean).length

  return (
    <section>
      <header>
        <h2>Environment Setup</h2>
        <span>{doneCount} of {items.length} ready</span>
      </header>

      {allDone && (
        <p>Your environment is ready. Start with the warm-up resources below.</p>
      )}

      <ul>
        {items.map((item, i) => (
          <li key={i}>
            <label>
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
              />
              <span>{item.item}</span>
            </label>
            {item.command && (
              <code>{item.command}</code>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

> Checklist state is local — not saved to DB. Refreshing the page resets it. This is intentional for V1 — the checklist is a one-time prompt, not a persistent record.

---

### 6. `components/WarmupShelf.tsx`

Complexity-aware prominence. Three different presentations for three complexity levels.

```typescript
'use client'

import { useState } from 'react'
import type { WarmupResource } from '@/schemas/agents'

interface WarmupShelfProps {
  resources:        WarmupResource[]
  complexity:       'beginner' | 'intermediate' | 'challenging'
  isFirstMilestone: boolean
}

export function WarmupShelf({ resources, complexity, isFirstMilestone }: WarmupShelfProps) {
  // Beginner: expanded by default. Intermediate + Challenging: collapsed.
  const [isExpanded, setIsExpanded] = useState(complexity === 'beginner')

  // Challenging: just a minimal "References" link — no shelf at all
  if (complexity === 'challenging') {
    return (
      <details>
        <summary>References ({resources.length})</summary>
        <ul>
          {resources.map(r => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title}
              </a>
              <span>{r.concept}</span>
            </li>
          ))}
        </ul>
      </details>
    )
  }

  return (
    <section>
      <button onClick={() => setIsExpanded(prev => !prev)}>
        {complexity === 'beginner' && isFirstMilestone && !isExpanded
          ? 'Read before you start'
          : `Warm-up resources (${resources.length})`
        }
        <span>{isExpanded ? '↑' : '↓'}</span>
      </button>

      {/* Beginner prompt — only on first milestone, only when expanded */}
      {complexity === 'beginner' && isFirstMilestone && isExpanded && (
        <p>
          These cover exactly the concepts you'll encounter.
          Spend time here before writing any code.
        </p>
      )}

      {isExpanded && (
        <ul>
          {resources.map(r => (
            <li key={r.url}>
              <span>{r.type.toUpperCase()}</span>
              <div>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.title}
                </a>
                <span>{r.concept}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

---

### 7. `components/TaskList.tsx`

The task list with sequential locking, `doneWhen`, and the hints drawer (L1 → L2 → L3).

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { completeTask } from '@/actions/agents'
import type { TaskRow } from '@/schemas/db'
import type { OrchestratorResult } from '@/lib/orchestrator'

interface TaskListProps {
  tasks:       TaskRow[]
  milestoneId: string
  projectId:   string
  complexity:  string
}

export function TaskList({ tasks, milestoneId, projectId, complexity }: TaskListProps) {
  const router  = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState(tasks)

  const handleComplete = useCallback(async (taskId: string) => {
    setCompleting(taskId)
    try {
      const result = await completeTask(taskId, milestoneId, projectId)
      handleOrchestratorResult(result)
    } catch (err) {
      console.error('Failed to complete task:', err)
    } finally {
      setCompleting(null)
    }
  }, [milestoneId, projectId, router])

  const handleOrchestratorResult = (result: OrchestratorResult) => {
    if (result.type === 'NEXT_TASK') {
      // Unlock next task in UI immediately — don't wait for page reload
      setLocalTasks(prev => prev.map(t =>
        t.id === result.taskId ? { ...t, status: 'active' as const } : t
      ))
      // Mark current task done
      setLocalTasks(prev => prev.map(t =>
        t.status === 'active' && t.id !== result.taskId
          ? { ...t, status: 'done' as const }
          : t
      ))
    } else if (result.type === 'MILESTONE_COMPLETE') {
      router.push(`/projects/${projectId}/milestones/${result.nextMilestoneId}`)
    } else if (result.type === 'PROJECT_COMPLETE') {
      router.push(`/projects/${projectId}/complete`)
    }
  }

  return (
    <section>
      <h2>Tasks</h2>
      <p>Complete each task in order. Move to the next when your done-when criterion is met.</p>

      <ol>
        {localTasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            complexity={complexity}
            isCompleting={completing === task.id}
            onComplete={() => handleComplete(task.id)}
          />
        ))}
      </ol>
    </section>
  )
}

// ── Single task card with hints drawer ───────────────────────────────────────

interface TaskCardProps {
  task:         TaskRow
  index:        number
  complexity:   string
  isCompleting: boolean
  onComplete:   () => void
}

function TaskCard({ task, index, complexity, isCompleting, onComplete }: TaskCardProps) {
  // Hints state — L1 shown first, learner reveals L2, then L3
  const [hintsRevealed, setHintsRevealed] = useState(0) // 0 = none, 1 = L1, 2 = L2, 3 = L3
  const [hintsOpen, setHintsOpen]         = useState(false)

  const hints = [
    task.prewritten_hints.l1,
    task.prewritten_hints.l2,
    task.prewritten_hints.l3,
  ]

  const isLocked = task.status === 'locked'
  const isDone   = task.status === 'done'

  if (isLocked) {
    return (
      <li>
        <div>
          <span>Task {index + 1}</span>
          <span>🔒 Locked</span>
        </div>
        <h3>{task.title}</h3>
        <p>Complete the previous task to unlock this one.</p>
      </li>
    )
  }

  return (
    <li>
      {/* Task header */}
      <div>
        <span>Task {index + 1}</span>
        <span>{task.concept}</span>
        <span>{task.estimated_minutes} min</span>
        {isDone && <span>✓ Done</span>}
      </div>

      {/* Task body */}
      <h3>{task.title}</h3>
      <p>{task.description}</p>

      {/* Done when */}
      <div>
        <strong>Done when:</strong>
        <p>{task.done_when}</p>
      </div>

      {/* Hints drawer — only on active tasks */}
      {!isDone && (
        <div>
          <button onClick={() => {
            setHintsOpen(true)
            if (hintsRevealed === 0) setHintsRevealed(1)
          }}>
            {hintsOpen ? 'Hide hints' : 'Show hint'}
          </button>

          {hintsOpen && (
            <div>
              {hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i}>
                  <span>Hint {i + 1}</span>
                  <p>{hint}</p>
                </div>
              ))}

              {/* "Show next hint" — only if more hints available */}
              {hintsRevealed < 3 && (
                <button onClick={() => setHintsRevealed(prev => prev + 1)}>
                  {hintsRevealed === 0 ? 'Show hint' : 'Show next hint'}
                </button>
              )}

              {/* After L3 — link to Nudge Agent (Phase 6) */}
              {hintsRevealed === 3 && (
                <div>
                  <p>Still stuck after all three hints?</p>
                  {/* Phase 6 wires this up to the Nudge Agent */}
                  <button disabled>
                    Get a nudge from the AI — coming in Phase 6
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mark as done */}
      {!isDone && (
        <button
          onClick={onComplete}
          disabled={isCompleting}
        >
          {isCompleting ? 'Marking done...' : 'Mark as done'}
        </button>
      )}
    </li>
  )
}
```

---

### 8. `app/projects/[id]/complete/page.tsx` — Stub

Created now so `PROJECT_COMPLETE` redirect doesn't 404. Phase 8 builds this out with Agent 6.

```typescript
// STUB — replaced in Phase 8 (Agent 6 + Completion Narrator)
export default function ProjectCompletePage({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Project complete!</h1>
      <p>Completion summary and LinkedIn posts — coming in Phase 8.</p>
    </main>
  )
}
```

---

### 9. Update `generateMilestones()` in `actions/agents.ts` — Eager Task Generation

In Phase 4's `generateMilestones()`, add task generation for Milestone 1 immediately after milestones are saved. This ensures tasks exist when the learner arrives at Milestone 1 — no wait.

UPDATE:
Milestone tasks are generated lazily when a milestone page is first opened.
When a milestone is completed, the next milestone is unlocked and its tasks are proactively generated.
If proactive generation fails, the milestone page fallback still generates tasks on entry.

```typescript
// At the end of generateMilestones(), after inserting milestones:

// Eagerly generate tasks for Milestone 1 — learner should not wait
const firstMilestone = inserted?.find((m) => m.order_index === 0);
if (firstMilestone) {
  // Generate and save Milestone 1 tasks before returning
  // This adds ~5 seconds to the "Designing your roadmap" loading state
  // but eliminates the task loading wait when learner clicks into Milestone 1
  await generateTasks(firstMilestone.id, projectRow.id);
}

return firstMilestone?.id ?? inserted?.[0]?.id;
```

---

## Langfuse Trace Spec

```
Trace name:   agent_3_task_generator
userId:       <supabase user id>
input:        { milestoneTitle, complexity, skillLevel }
output:       { taskCount: N }
metadata:     { fastModel, capableModel, provider }
```

Two model calls per trace — both logged under the same trace. Langfuse will show both in the timeline.

---

## The Hints UX — Important Details

**L1 is shown immediately** when the learner opens the hints drawer — no extra click to reveal it. The first click on "Show hint" reveals L1 and opens the drawer simultaneously.

**L2 and L3 require explicit "Show next hint" clicks.** This is intentional friction — the learner must actively choose to go deeper before seeing more help.

**After L3, the "Get a nudge" button appears** — disabled in Phase 5 with a note "coming in Phase 6." This means Phase 6 just needs to enable that button and wire it up, rather than redesigning the hints area.

**Hint state is local UI state** — not saved to DB. If the learner refreshes the page, hints reset to closed. This is intentional. The pre-written hints are not nudge sessions — only Agent 4 calls are recorded in `nudge_sessions`.

---

## What NOT to Build in Phase 5

- **Nudge Agent (Agent 4)** — Phase 6. The "Get a nudge" button is visible but disabled.
- **GitHub verification** — Phase 7
- **Milestone verification UI** — Phase 7
- **Project completion summary** — Phase 8 (stub page created here, nothing more)
- **`learner_stats` updates** — Phase 8 (updated by Agent 6 at project completion)
- **Error boundaries and loading skeletons** — Phase 8
- **The "How to use this" sidebar** seen in the Phase 4 screenshot — if not already built, keep it on Milestone 1 only, make it dismissible

---

## Common Mistakes

**Generating tasks synchronously on milestone page load.** If tasks don't exist and the page waits for Agent 3 before rendering, the learner sees a blank page for 10+ seconds. The eager generation in `generateMilestones()` prevents this. The fallback in the milestone page (generate on-demand) is only for cases where eager generation failed — it should be rare.

**Task status after COMPLETE_TASK.** Exactly one task should be `active` at any time within a milestone. When Task 1 is marked done, it becomes `done` and Task 2 becomes `active`. If you find two tasks showing `active`, there's a race condition in the DB update.

**Hints revealing all at once.** L2 must only appear after the learner explicitly clicks "Show next hint" after seeing L1. L3 only after L2. Revealing all three simultaneously removes the progressive scaffolding entirely.

**`complexity` not flowing to `TaskCard`.** The hints character (explain vs redirect vs question) depends on `complexity`. If the `TaskCard` doesn't receive `complexity` and it doesn't affect the hints display, the hints will all look the same regardless of project difficulty. In Phase 5 the hints content is already baked in from Agent 3 — `complexity` in the UI is used for any complexity-specific display logic you add (e.g., different hint labels for different levels).

**Background task generation swallowing errors silently.** The `.catch()` in `completeTask()` logs the error but doesn't surface it to the learner. This is correct — the fallback in the milestone page handles it. But make sure the error is actually logged visibly in the server console so you know if it's failing consistently.

**`PROJECT_COMPLETE` redirect.** When the orchestrator returns `PROJECT_COMPLETE`, redirect to `/projects/${projectId}/complete` — the stub created in this phase. Do not try to call Agent 6 directly from the orchestrator — that's Phase 8's job.

---

## End-to-End Test — Run This Manually

1. Select a beginner project from the dashboard
2. Wait for the milestone roadmap to load (Agent 2 + Agent 3 run in sequence)
3. Click "Begin Milestone" on Milestone 1 — tasks should be there immediately, no loading
4. Verify: Task 1 is active, Tasks 2–N are locked
5. Open hints on Task 1 — see L1. Click "Show next hint" — see L2. Click again — see L3. Click — see "Get a nudge" (disabled)
6. Click "Mark as done" on Task 1 — Task 2 unlocks, Task 1 shows Done state
7. Complete all tasks in Milestone 1 — redirected to Milestone 2
8. Milestone 2 tasks are already there — no loading
9. Open Supabase: `milestones` table shows Milestone 1 `complete`, Milestone 2 `active`
10. Open Langfuse: two `agent_3_task_generator` traces visible (one for M1, one for M2)

---

## Phase 5 is Complete When

All Done When items pass and the end-to-end test completes without errors. The full learning loop — tasks → complete → unlock → milestone done → next milestone — works end to end for at least one complete project milestone.

That is Phase 5 done.

---

_Next: `phase-06-agent4.md` — Nudge Agent + stuck flow + streaming nudge response._
