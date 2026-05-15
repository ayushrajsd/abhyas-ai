'use client'

import type { ProjectIdea } from '@/schemas/agents'

interface ProjectIdeaCardProps {
  project: ProjectIdea
  index: number
  isBookmarked: boolean
  onBookmark: (project: ProjectIdea) => void
  onSelect: (project: ProjectIdea) => void
  isSelecting: boolean
}

const COMPLEXITY_STYLES: Record<
  ProjectIdea['complexity'],
  { bg: string; text: string; border: string }
> = {
  beginner:     { bg: '#f0f7f3', text: '#3d6b4f', border: '#b8d9c5' },
  intermediate: { bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  challenging:  { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function ProjectIdeaCard({
  project, index, isBookmarked, onBookmark, onSelect, isSelecting,
}: ProjectIdeaCardProps) {
  const badge = COMPLEXITY_STYLES[project.complexity]
  const delay = `${index * 80}ms`

  return (
    <div
      className="card-enter relative rounded-2xl border flex flex-col overflow-hidden"
      style={{
        animationDelay: delay,
        borderColor: project.recommended ? '#3d6b4f' : '#ddd8cf',
        backgroundColor: '#ffffff',
        boxShadow: project.recommended
          ? '0 4px 24px 0 rgba(61,107,79,0.10)'
          : '0 1px 4px 0 rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px 0 rgba(0,0,0,0.10)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = project.recommended
          ? '0 4px 24px 0 rgba(61,107,79,0.10)'
          : '0 1px 4px 0 rgba(0,0,0,0.04)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Recommended banner */}
      {project.recommended && (
        <div
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold"
          style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
        >
          <span>★</span>
          <span>Recommended for your level</span>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1 space-y-4">
        {/* Zone 1: Identity */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-serif text-base font-semibold leading-snug" style={{ color: '#1c1c1c' }}>
              {project.title}
            </h2>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-full border capitalize"
                style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
              >
                {project.complexity}
              </span>
              <button
                onClick={() => onBookmark(project)}
                title={isBookmarked ? 'Remove from saved' : 'Save for later'}
                className="p-1 rounded transition-colors"
                style={{ color: isBookmarked ? '#3d6b4f' : '#c5bfb5' }}
              >
                <BookmarkIcon filled={isBookmarked} />
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b' }}>
            {project.description}
          </p>
          <p className="text-xs" style={{ color: '#9b9b9b' }}>
            ~{project.estimatedHours} hours
          </p>
        </div>

        {/* Zone 2: Concepts + Skills */}
        <div
          className="grid grid-cols-2 gap-4 pt-3"
          style={{ borderTop: '1px solid #f0ece6' }}
        >
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9b9b9b' }}>
              Concepts
            </h3>
            <ul className="space-y-1">
              {project.conceptsEncountered.map(c => (
                <li key={c} className="text-xs flex items-start gap-1.5" style={{ color: '#4b4b4b' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: '#3d6b4f' }}>·</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9b9b9b' }}>
              Skills
            </h3>
            <ul className="space-y-1">
              {project.skillsBuilt.map(s => (
                <li key={s} className="text-xs flex items-start gap-1.5" style={{ color: '#4b4b4b' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: '#3d6b4f' }}>·</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Zone 3: CTA */}
        <div className="pt-1 mt-auto">
          <button
            onClick={() => onSelect(project)}
            disabled={isSelecting}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{
              backgroundColor: project.recommended ? '#3d6b4f' : 'transparent',
              color: project.recommended ? '#ffffff' : '#3d6b4f',
              border: '1.5px solid #3d6b4f',
            }}
          >
            {isSelecting ? 'Starting…' : 'Start Project'}
          </button>
        </div>
      </div>
    </div>
  )
}
