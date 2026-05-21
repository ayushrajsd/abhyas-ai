'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { completeTask } from '@/actions/agents'
import type { TaskRow, WarmupResource } from '@/schemas/db'

// ─── Concept resource shelf ───────────────────────────────────────────────────

function ConceptResourceShelf({ resources, concept }: { resources: WarmupResource[]; concept: string }) {
  const [open, setOpen] = useState(false)
  if (resources.length === 0) return null

  const TYPE_ICONS: Record<string, string> = {
    docs:        '📄',
    video:       '▶',
    article:     '✦',
    interactive: '⚡',
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #e0dcd4' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
        style={{ backgroundColor: '#faf8f4' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6b6b' }}>
          Learn this concept: {concept}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#9b9b9b', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-2 space-y-2" style={{ backgroundColor: '#faf8f4', borderTop: '1px solid #e8e3da' }}>
          {resources.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm rounded-md px-3 py-2 transition-colors hover:bg-black/[0.04]"
              style={{ color: '#1c1c1c' }}
            >
              <span className="text-base">{TYPE_ICONS[r.type] ?? '→'}</span>
              <span className="font-medium">{r.title}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto shrink-0" style={{ color: '#9b9b9b' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Prewritten hints ─────────────────────────────────────────────────────────

function HintShelf({ hints }: { hints: { l1: string; l2: string; l3: string } }) {
  const [revealedLevel, setRevealedLevel] = useState(0)

  if (revealedLevel === 0) {
    return (
      <button
        onClick={() => setRevealedLevel(1)}
        className="text-xs font-medium px-3 py-1.5 rounded-md transition-opacity hover:opacity-70"
        style={{ backgroundColor: '#f0ebe2', color: '#6b4f2a' }}
      >
        I&apos;m stuck, show a hint
      </button>
    )
  }

  const HINT_LABELS = ['', 'Hint 1: Conceptual', 'Hint 2: Directional', 'Hint 3: Concrete']
  const HINT_VALUES = ['', hints.l1, hints.l2, hints.l3]

  return (
    <div className="space-y-2">
      {Array.from({ length: revealedLevel }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg px-4 py-3 space-y-1"
          style={{ backgroundColor: '#f9f5ee', border: '1px solid #e8e0ce' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9b6e2e' }}>
            {HINT_LABELS[i + 1]}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#3d3020', lineHeight: '1.65' }}>
            {HINT_VALUES[i + 1]}
          </p>
        </div>
      ))}
      {revealedLevel < 3 && (
        <button
          onClick={() => setRevealedLevel(v => v + 1)}
          className="text-xs font-medium px-3 py-1.5 rounded-md transition-opacity hover:opacity-70"
          style={{ backgroundColor: '#f0ebe2', color: '#6b4f2a' }}
        >
          Still stuck, next hint
        </button>
      )}
    </div>
  )
}

// ─── Individual task cards ────────────────────────────────────────────────────

function ActiveTaskCard({
  task,
  onComplete,
  completing,
}: {
  task: TaskRow
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onComplete: () => any
  completing: boolean
}) {
  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{ backgroundColor: '#ffffff', border: '2px solid #c8a96e', boxShadow: '0 2px 12px rgba(200,169,110,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
          style={{ backgroundColor: '#c8a96e', color: '#ffffff' }}
        >
          {task.order_index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ backgroundColor: '#fff8ed', color: '#9b6e2e' }}
            >
              Active
            </span>
            {task.estimated_minutes && (
              <span className="text-xs" style={{ color: '#9b9b9b' }}>
                ~{task.estimated_minutes} min
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug" style={{ color: '#1c1c1c' }}>
            {task.title}
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b', lineHeight: '1.7' }}>
        {task.description}
      </p>

      {/* Concept resource shelf */}
      <ConceptResourceShelf
        resources={task.concept_resources as WarmupResource[]}
        concept={task.concept}
      />

      {/* Done when */}
      <div
        className="rounded-lg px-4 py-3 space-y-1"
        style={{ backgroundColor: '#f0f7f3', border: '1px solid #b8d9c5' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3d6b4f' }}>
          Done when
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#1c4731', lineHeight: '1.65' }}>
          {task.done_when}
        </p>
      </div>

      {/* Hints */}
      <HintShelf hints={task.prewritten_hints as { l1: string; l2: string; l3: string }} />

      {/* Complete button */}
      <div className="pt-1">
        <button
          onClick={onComplete}
          disabled={completing}
          className="font-medium text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: '#1c1c1c', color: '#f7f4ef' }}
        >
          {completing ? 'Saving…' : 'Mark as complete →'}
        </button>
      </div>
    </div>
  )
}

function DoneTaskCard({ task }: { task: TaskRow }) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center gap-3"
      style={{ backgroundColor: '#f0f7f3', border: '1px solid #b8d9c5' }}
    >
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-sm font-medium line-through" style={{ color: '#5a8a6b' }}>
        {task.title}
      </span>
    </div>
  )
}

function LockedTaskCard({ task }: { task: TaskRow }) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center gap-3"
      style={{ backgroundColor: '#f7f4ef', border: '1px solid #e8e3da' }}
    >
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: '#e8e3da', color: '#9b9b9b' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-sm" style={{ color: '#9b9b9b' }}>
          {task.order_index + 1}. {task.title}
        </span>
      </div>
      {task.estimated_minutes && (
        <span className="text-xs shrink-0" style={{ color: '#b8b3ab' }}>
          ~{task.estimated_minutes} min
        </span>
      )}
    </div>
  )
}

// ─── Milestone complete banner ────────────────────────────────────────────────

function MilestoneCompleteBanner({
  nextMilestoneId,
  projectId,
}: {
  nextMilestoneId?: string
  projectId: string
}) {
  return (
    <div
      className="rounded-xl p-6 text-center space-y-4"
      style={{ backgroundColor: '#f0f7f3', border: '1px solid #b8d9c5' }}
    >
      <div className="text-3xl">🎉</div>
      <div>
        <p className="font-semibold text-base" style={{ color: '#1c4731' }}>
          Milestone complete
        </p>
        <p className="text-sm mt-1" style={{ color: '#5a8a6b' }}>
          {nextMilestoneId ? 'You unlocked the next milestone.' : 'You finished the project.'}
        </p>
      </div>
      {nextMilestoneId ? (
        <a
          href={`/projects/${projectId}/milestones/${nextMilestoneId}`}
          className="inline-flex items-center gap-2 font-medium text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1c1c1c', color: '#f7f4ef' }}
        >
          Begin next milestone
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>
      ) : (
        <a
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 font-medium text-sm px-5 py-2.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#1c1c1c', color: '#f7f4ef' }}
        >
          View project summary
        </a>
      )}
    </div>
  )
}

// ─── Main TaskList ────────────────────────────────────────────────────────────

export function TaskList({
  tasks: initialTasks,
}: {
  tasks: TaskRow[]
  milestoneId: string
  projectId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)
  const [completionResult, setCompletionResult] = useState<
    | { outcome: 'next_milestone'; milestoneId: string; projectId: string }
    | { outcome: 'project_complete'; projectId: string }
    | null
  >(null)

  async function handleComplete(taskId: string) {
    setCompletingTaskId(taskId)
    startTransition(async () => {
      try {
        const result = await completeTask(taskId)
        if (result.outcome === 'next_task') {
          router.refresh()
        } else {
          setCompletionResult(result as typeof completionResult)
        }
      } catch (err) {
        console.error('Failed to complete task:', err)
      } finally {
        setCompletingTaskId(null)
      }
    })
  }

  if (completionResult) {
    return (
      <MilestoneCompleteBanner
        nextMilestoneId={completionResult.outcome === 'next_milestone' ? completionResult.milestoneId : undefined}
        projectId={completionResult.projectId}
      />
    )
  }

  return (
    <div className="space-y-3">
      {initialTasks.map(task => {
        if (task.status === 'done') return <DoneTaskCard key={task.id} task={task} />
        if (task.status === 'active') return (
          <ActiveTaskCard
            key={task.id}
            task={task}
            onComplete={() => handleComplete(task.id)}
            completing={isPending && completingTaskId === task.id}
          />
        )
        return <LockedTaskCard key={task.id} task={task} />
      })}
    </div>
  )
}
