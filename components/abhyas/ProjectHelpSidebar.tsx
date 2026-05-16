'use client'

import { useState } from 'react'

const STEPS = [
  {
    label: 'Warm up first',
    detail: 'Expand the warm-up shelf on your active milestone and read the linked resources before writing any code. They cover exactly the concepts you will encounter.',
  },
  {
    label: 'Begin the milestone',
    detail: 'Click "Begin Milestone" to see the task breakdown. Each milestone has 3–5 tasks, strictly ordered — you cannot start the next until the current one is done.',
  },
  {
    label: 'When you get stuck',
    detail: 'Each task has 3 pre-written hints (L1 → L2 → L3). Try those first. If you are still stuck, the Nudge AI gives you a directional push — it will never write the code for you.',
  },
  {
    label: 'Mark tasks done',
    detail: 'A task is done when you meet its "done when" criterion — something concrete and checkable. Completing all tasks in a milestone unlocks the next one.',
  },
]

function HelpContent() {
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          How this roadmap was built
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#4b4b4b' }}>
          The AI analyzed your project — its scope, complexity, and the concepts you will encounter — and broke it into milestones that build on each other. Each milestone ends with something testable so you always know when you are done.
        </p>
      </div>

      <div style={{ borderTop: '1px solid #e8e3da' }} />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          What to do
        </p>
        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{ backgroundColor: '#f0f7f3', color: '#3d6b4f', border: '1.5px solid #b8d9c5' }}
                >
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px mt-1" style={{ backgroundColor: '#e8e3da', height: '100%', minHeight: '16px' }} />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <p className="text-xs font-semibold mb-0.5" style={{ color: '#1c1c1c' }}>
                  {step.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#6b6b6b' }}>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e8e3da' }} />

      <p className="text-xs leading-relaxed italic" style={{ color: '#9b9b9b' }}>
        The teacher illuminates the path, not walks it for you. You build it. That is why it stays.
      </p>
    </div>
  )
}

// Renders only on mobile (lg:hidden) — collapsible banner inline with the main column
export function MobileHelpBanner() {
  const [open, setOpen] = useState(false)

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
        style={{ backgroundColor: '#f0f7f3', border: '1px solid #b8d9c5' }}
      >
        <span className="text-xs font-semibold" style={{ color: '#3d6b4f' }}>
          How does this work?
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="#3d6b4f" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          className="mt-2 p-4 rounded-xl"
          style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da' }}
        >
          <HelpContent />
        </div>
      )}
    </div>
  )
}

// Renders only on desktop (hidden lg:block) — sticky sidebar
export function DesktopHelpSidebar() {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div
        className="sticky top-8 p-5 rounded-2xl space-y-4"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da' }}
      >
        <p className="font-serif text-sm font-semibold" style={{ color: '#1c1c1c' }}>
          How to use this
        </p>
        <HelpContent />
      </div>
    </aside>
  )
}
