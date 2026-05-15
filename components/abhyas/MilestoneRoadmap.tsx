'use client'

import { useState } from 'react'
import Link from 'next/link'

type WarmupResource = {
  title: string
  url: string
  concept: string
  type: 'docs' | 'video' | 'article' | 'interactive'
}

type SetupItem = {
  item: string
  command: string | null
  done: boolean
}

type MilestoneRow = {
  id: string
  project_id: string
  title: string
  description: string
  learning_objectives: string[]
  concepts_introduced: string[]
  warmup_resources: WarmupResource[]
  order_index: number
  status: 'locked' | 'active' | 'complete'
  verification_type: 'verified' | 'self' | null
  verified_at: string | null
  setup_checklist: SetupItem[] | null
  created_at: string
}

const RESOURCE_TYPE_LABELS: Record<WarmupResource['type'], string> = {
  docs:        'Docs',
  video:       'Video',
  article:     'Article',
  interactive: 'Interactive',
}

const RESOURCE_TYPE_COLORS: Record<WarmupResource['type'], { bg: string; text: string }> = {
  docs:        { bg: '#f0f7f3', text: '#3d6b4f' },
  video:       { bg: '#fef2f2', text: '#991b1b' },
  article:     { bg: '#fefce8', text: '#854d0e' },
  interactive: { bg: '#eff6ff', text: '#1e40af' },
}

function WarmupShelf({ resources }: { resources: WarmupResource[] }) {
  const [collapsed, setCollapsed] = useState(false)

  if (resources.length === 0) return null

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: '#e8e3da', backgroundColor: '#fdfcfa' }}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{ color: '#1c1c1c' }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          Warm-up shelf · {resources.length} resource{resources.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs" style={{ color: '#9b9b9b' }}>
          {collapsed ? 'expand' : 'collapse'}
        </span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid #f0ece6' }}>
          <p className="text-xs pt-3" style={{ color: '#9b9b9b' }}>
            Read these before you start. They cover exactly what you will need.
          </p>
          <div className="space-y-2">
            {resources.map((r, i) => {
              const style = RESOURCE_TYPE_COLORS[r.type]
              return (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border group transition-colors"
                  style={{
                    borderColor: '#e8e3da',
                    backgroundColor: '#ffffff',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3d6b4f'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#e8e3da'
                  }}
                >
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {RESOURCE_TYPE_LABELS[r.type]}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug" style={{ color: '#1c1c1c' }}>
                      {r.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#9b9b9b' }}>
                      {r.concept}
                    </p>
                  </div>
                  <svg
                    className="ml-auto shrink-0 mt-0.5 opacity-40 group-hover:opacity-80 transition-opacity"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function SetupChecklist({ items }: { items: SetupItem[] }) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
        Setup checklist
      </p>
      <div className="space-y-1.5">
        {items.map((item, i) => {
          const checked = checkedItems.has(i)
          return (
            <div
              key={i}
              className="flex items-start gap-3 cursor-pointer select-none"
              onClick={() => toggle(i)}
            >
              <div
                className="mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors"
                style={{
                  borderColor: checked ? '#3d6b4f' : '#c5bfb5',
                  backgroundColor: checked ? '#3d6b4f' : 'transparent',
                }}
              >
                {checked && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm leading-snug"
                  style={{ color: checked ? '#9b9b9b' : '#1c1c1c', textDecoration: checked ? 'line-through' : 'none' }}
                >
                  {item.item}
                </p>
                {item.command && (
                  <code
                    className="text-xs px-2 py-0.5 rounded mt-1 inline-block font-mono"
                    style={{ backgroundColor: '#f0ece6', color: '#4b4b4b' }}
                  >
                    {item.command}
                  </code>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActiveMilestoneCard({ milestone, projectId }: { milestone: MilestoneRow; projectId: string }) {
  return (
    <div
      className="rounded-2xl border-2 p-6 space-y-5"
      style={{ borderColor: '#3d6b4f', backgroundColor: '#ffffff', boxShadow: '0 4px 24px 0 rgba(61,107,79,0.08)' }}
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#f0f7f3', color: '#3d6b4f' }}
          >
            Active
          </span>
          <span className="text-xs" style={{ color: '#9b9b9b' }}>Milestone {milestone.order_index + 1}</span>
        </div>
        <h3 className="font-serif text-lg font-semibold" style={{ color: '#1c1c1c' }}>
          {milestone.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b' }}>
          {milestone.description}
        </p>
      </div>

      {/* Learning objectives */}
      {milestone.learning_objectives.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
            By the end of this milestone you will
          </p>
          <ul className="space-y-1">
            {milestone.learning_objectives.map((obj, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: '#4b4b4b' }}>
                <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#3d6b4f' }} />
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Concepts introduced */}
      {milestone.concepts_introduced.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
            Concepts introduced
          </p>
          <div className="flex flex-wrap gap-1.5">
            {milestone.concepts_introduced.map(c => (
              <span
                key={c}
                className="text-xs px-2.5 py-1 rounded-full border"
                style={{ backgroundColor: '#f7f4ef', borderColor: '#ddd8cf', color: '#4b4b4b' }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warm-up shelf */}
      {milestone.warmup_resources.length > 0 && (
        <WarmupShelf resources={milestone.warmup_resources} />
      )}

      {/* Setup checklist (Milestone 1 only) */}
      {milestone.setup_checklist && milestone.setup_checklist.length > 0 && (
        <div
          className="rounded-xl p-4"
          style={{ backgroundColor: '#f7f4ef', border: '1px solid #e8e3da' }}
        >
          <SetupChecklist items={milestone.setup_checklist} />
        </div>
      )}

      {/* CTA — stub for Phase 5 */}
      <div className="pt-1">
        <Link
          href={`/projects/${projectId}/milestones/${milestone.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity"
          style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
        >
          Begin Milestone
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}

function LockedMilestoneCard({ milestone }: { milestone: MilestoneRow }) {
  return (
    <div
      className="rounded-xl border p-4 flex gap-4 items-start"
      style={{ borderColor: '#e8e3da', backgroundColor: '#fafaf8', opacity: 0.75 }}
    >
      <div
        className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5"
        style={{ borderColor: '#c5bfb5', backgroundColor: '#f0ece6' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-xs" style={{ color: '#9b9b9b' }}>Milestone {milestone.order_index + 1}</p>
        </div>
        <p className="text-sm font-medium" style={{ color: '#6b6b6b' }}>{milestone.title}</p>
        <p className="text-xs leading-relaxed" style={{ color: '#9b9b9b' }}>{milestone.description}</p>
        {milestone.concepts_introduced.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {milestone.concepts_introduced.map(c => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#f0ece6', color: '#9b9b9b' }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CompleteMilestoneCard({ milestone }: { milestone: MilestoneRow }) {
  return (
    <div
      className="rounded-xl border p-4 flex gap-4 items-start"
      style={{ borderColor: '#b8d9c5', backgroundColor: '#f0f7f3' }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: '#3d6b4f' }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs" style={{ color: '#3d6b4f' }}>
          Milestone {milestone.order_index + 1} · Complete
          {milestone.verification_type === 'verified' && ' · Verified'}
          {milestone.verification_type === 'self' && ' · Self-verified'}
        </p>
        <p className="text-sm font-medium" style={{ color: '#3d6b4f' }}>{milestone.title}</p>
      </div>
    </div>
  )
}

export function MilestoneRoadmap({
  milestones,
  projectId,
}: {
  milestones: MilestoneRow[]
  projectId: string
}) {
  return (
    <div className="space-y-3">
      {milestones.map((m) => {
        if (m.status === 'complete') {
          return <CompleteMilestoneCard key={m.id} milestone={m} />
        }
        if (m.status === 'active') {
          return <ActiveMilestoneCard key={m.id} milestone={m} projectId={projectId} />
        }
        return <LockedMilestoneCard key={m.id} milestone={m} />
      })}
    </div>
  )
}
