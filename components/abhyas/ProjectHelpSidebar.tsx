'use client'

import { useState } from 'react'

const STEPS = [
  {
    label: 'Warm up first',
    detail: 'Expand the warm-up shelf and read the linked resources before writing any code. They cover exactly the concepts you will encounter in this milestone.',
  },
  {
    label: 'Begin the milestone',
    detail: 'Click "Begin Milestone" to see the task breakdown. Each milestone has 3 to 5 tasks. You cannot start the next task until the current one is done.',
  },
  {
    label: 'When you get stuck',
    detail: 'Each task has 3 pre-written hints. Try those first. If still stuck, the Nudge AI gives you a directional push. It will never write the code for you.',
  },
  {
    label: 'Mark tasks done',
    detail: 'A task is done when you meet its "done when" criterion. Something concrete and checkable. Completing all tasks unlocks the next milestone.',
  },
]

function HelpContent() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          How your roadmap was designed
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#4b4b4b', lineHeight: '1.65' }}>
          The AI analyzed your project, its scope, complexity, and the concepts you will encounter. It designed milestones that build on each other. Each one ends with something testable so you always know when you are done.
        </p>
      </div>

      <div style={{ borderTop: '1px solid #e8e3da' }} />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
          How to work through it
        </p>
        <div className="space-y-4 pt-1">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ backgroundColor: '#f0f7f3', color: '#3d6b4f', border: '1.5px solid #b8d9c5' }}
                >
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px mt-1.5" style={{ backgroundColor: '#e8e3da', height: '100%', minHeight: '20px' }} />
                )}
              </div>
              <div className="pb-1 min-w-0">
                <p className="text-xs font-semibold mb-1" style={{ color: '#1c1c1c' }}>
                  {step.label}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: '#6b6b6b', lineHeight: '1.6' }}>
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e8e3da' }} />

      <p className="text-xs leading-relaxed italic" style={{ color: '#9b9b9b', lineHeight: '1.6' }}>
        The teacher illuminates the path, not walks it for you. You build it. That is why it stays.
      </p>
    </div>
  )
}

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

export function DesktopHelpSidebar() {
  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div
        className="sticky top-8 p-5 rounded-2xl"
        style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <p className="font-serif text-sm font-semibold mb-4" style={{ color: '#1c1c1c' }}>
          How to use this
        </p>
        <HelpContent />
      </div>
    </aside>
  )
}
