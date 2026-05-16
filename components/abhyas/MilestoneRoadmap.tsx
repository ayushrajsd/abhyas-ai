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
  // Start expanded — reading these is the first thing a learner should do
  const [collapsed, setCollapsed] = useState(false)

  if (resources.length === 0) return null

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1.5px solid #b8d9c5', backgroundColor: '#f8fbf9' }}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '13px' }}>📖</span>
          <span className="text-xs font-semibold" style={{ color: '#3d6b4f' }}>
            Read before you start
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#e0f0e8', color: '#3d6b4f' }}
          >
            {resources.length} {resources.length === 1 ? 'resource' : 'resources'}
          </span>
        </div>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="#3d6b4f" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2.5" style={{ borderTop: '1px solid #d4eadc' }}>
          <p className="text-xs pt-3" style={{ color: '#5a8a6a' }}>
            These cover exactly the concepts you will encounter. Spend time here before writing any code.
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
                  className="flex items-start gap-3 p-3 rounded-lg border group transition-all"
                  style={{ borderColor: '#ddeee4', backgroundColor: '#ffffff' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#3d6b4f'
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 8px rgba(61,107,79,0.1)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ddeee4'
                    ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
                  }}
                >
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {RESOURCE_TYPE_LABELS[r.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug" style={{ color: '#1c1c1c' }}>
                      {r.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#7a9e8a' }}>
                      {r.concept}
                    </p>
                  </div>
                  <svg
                    className="shrink-0 mt-0.5 transition-opacity"
                    style={{ opacity: 0.35 }}
                    width="12" height="12" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"
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

  const doneCount = checkedItems.size

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          Environment setup
        </p>
        {doneCount > 0 && (
          <span className="text-xs" style={{ color: '#3d6b4f' }}>
            {doneCount} of {items.length} done
          </span>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const checked = checkedItems.has(i)
          return (
            <div
              key={i}
              className="flex items-start gap-3 cursor-pointer select-none group"
              onClick={() => toggle(i)}
            >
              <div
                className="mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all"
                style={{
                  borderColor: checked ? '#3d6b4f' : '#c5bfb5',
                  backgroundColor: checked ? '#3d6b4f' : 'transparent',
                }}
              >
                {checked && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm leading-snug transition-colors"
                  style={{ color: checked ? '#9b9b9b' : '#2c2c2c', textDecoration: checked ? 'line-through' : 'none' }}
                >
                  {item.item}
                </p>
                {item.command && (
                  <code
                    className="text-xs px-2 py-0.5 rounded mt-1 inline-block font-mono"
                    style={{ backgroundColor: '#1c1c1c', color: '#a8d8b8' }}
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

function ActiveMilestoneCard({ milestone, projectId, total }: { milestone: MilestoneRow; projectId: string; total: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: '2px solid #3d6b4f',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 32px rgba(61,107,79,0.12)',
      }}
    >
      {/* Green header stripe */}
      <div
        className="px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: '#3d6b4f' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
          >
            Active
          </span>
          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Milestone {milestone.order_index + 1} of {total}
          </span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Start here
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Title + description */}
        <div className="space-y-2">
          <h3 className="font-serif text-xl font-semibold leading-snug" style={{ color: '#1c1c1c' }}>
            {milestone.title}
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b', lineHeight: '1.7' }}>
            {milestone.description}
          </p>
        </div>

        {/* Learning objectives */}
        {milestone.learning_objectives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#3d6b4f' }}>
              What you will achieve
            </p>
            <ul className="space-y-1.5">
              {milestone.learning_objectives.map((obj, i) => (
                <li key={i} className="text-sm flex items-start gap-2.5" style={{ color: '#3c3c3c' }}>
                  <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3d6b4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concepts introduced */}
        {milestone.concepts_introduced.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6b6b' }}>
              Concepts you will work with
            </p>
            <div className="flex flex-wrap gap-1.5">
              {milestone.concepts_introduced.map(c => (
                <span
                  key={c}
                  className="text-xs px-3 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#f0f7f3', border: '1px solid #b8d9c5', color: '#3d6b4f' }}
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

        {/* Setup checklist */}
        {milestone.setup_checklist && milestone.setup_checklist.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#f7f4ef', border: '1px solid #e8e3da' }}
          >
            <SetupChecklist items={milestone.setup_checklist} />
          </div>
        )}

        {/* CTA */}
        <div className="pt-1 flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/milestones/${milestone.id}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: '#3d6b4f', color: '#ffffff', boxShadow: '0 2px 8px rgba(61,107,79,0.3)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#2d5a3f'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 4px 16px rgba(61,107,79,0.4)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#3d6b4f'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 2px 8px rgba(61,107,79,0.3)'
            }}
          >
            Begin Milestone
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <span className="text-xs" style={{ color: '#9b9b9b' }}>
            Warm up first, then dive in
          </span>
        </div>
      </div>
    </div>
  )
}

function LockedMilestoneCard({ milestone, isNext }: { milestone: MilestoneRow; isNext: boolean }) {
  return (
    <div
      className="rounded-xl border p-4 flex gap-4 items-start transition-all"
      style={{
        borderColor: isNext ? '#ddd8cf' : '#ede9e2',
        backgroundColor: isNext ? '#fdfcfa' : '#fafaf8',
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
        style={{
          backgroundColor: isNext ? '#f0ece6' : '#f5f2ee',
          color: isNext ? '#6b6b6b' : '#9b9b9b',
          border: `1.5px solid ${isNext ? '#c5bfb5' : '#ddd8cf'}`,
        }}
      >
        {milestone.order_index + 1}
      </div>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {isNext && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0ece6', color: '#8b7b6b' }}>
              Up next
            </span>
          )}
        </div>
        <p className="text-sm font-semibold" style={{ color: isNext ? '#3c3c3c' : '#7b7b7b' }}>
          {milestone.title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: isNext ? '#6b6b6b' : '#9b9b9b' }}>
          {milestone.description}
        </p>
        {milestone.concepts_introduced.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {milestone.concepts_introduced.map(c => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: isNext ? '#f0ece6' : '#f5f2ee',
                  color: isNext ? '#7b6b5b' : '#9b9b9b',
                }}
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
      className="rounded-xl border p-4 flex gap-4 items-center"
      style={{ borderColor: '#b8d9c5', backgroundColor: '#f0f7f3' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#3d6b4f' }}
      >
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#3d6b4f' }}>{milestone.title}</p>
        <p className="text-xs mt-0.5" style={{ color: '#5a8a6a' }}>
          Milestone {milestone.order_index + 1} complete
          {milestone.verification_type === 'verified' && ' · Verified'}
          {milestone.verification_type === 'self' && ' · Self-verified'}
        </p>
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
  const total = milestones.length
  const completedCount = milestones.filter(m => m.status === 'complete').length
  const activeIndex = milestones.findIndex(m => m.status === 'active')

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center gap-3">
        <div className="flex-1 rounded-full overflow-hidden" style={{ height: '4px', backgroundColor: '#e8e3da' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(completedCount / total) * 100}%`, backgroundColor: '#3d6b4f' }}
          />
        </div>
        <span className="text-xs font-medium shrink-0" style={{ color: '#6b6b6b' }}>
          {completedCount === 0 ? `${total} milestones ahead` : `${completedCount} of ${total} complete`}
        </span>
      </div>

      {/* Milestone cards */}
      <div className="space-y-3">
        {milestones.map((m, i) => {
          if (m.status === 'complete') {
            return <CompleteMilestoneCard key={m.id} milestone={m} />
          }
          if (m.status === 'active') {
            return <ActiveMilestoneCard key={m.id} milestone={m} projectId={projectId} total={total} />
          }
          const isNext = i === activeIndex + 1
          return <LockedMilestoneCard key={m.id} milestone={m} isNext={isNext} />
        })}
      </div>
    </div>
  )
}
