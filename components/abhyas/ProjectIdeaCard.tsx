'use client'

import type { ProjectIdea } from '@/schemas/agents'

interface ProjectIdeaCardProps {
  project: ProjectIdea
  onSelect: (project: ProjectIdea) => void
  isSelecting: boolean
}

const COMPLEXITY_STYLES: Record<ProjectIdea['complexity'], { label: string; bg: string; text: string; border: string }> = {
  beginner:     { label: 'Beginner',     bg: '#f0f7f3', text: '#3d6b4f', border: '#b8d9c5' },
  intermediate: { label: 'Intermediate', bg: '#fefce8', text: '#854d0e', border: '#fde68a' },
  challenging:  { label: 'Challenging',  bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
}

export function ProjectIdeaCard({ project, onSelect, isSelecting }: ProjectIdeaCardProps) {
  const badge = COMPLEXITY_STYLES[project.complexity]

  return (
    <div
      className="rounded-xl border p-6 space-y-5 transition-shadow hover:shadow-md"
      style={{ borderColor: '#ddd8cf', backgroundColor: '#ffffff' }}
    >
      {/* Zone 1 — Identity */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold leading-snug" style={{ color: '#1c1c1c' }}>
            {project.title}
          </h2>
          <span
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
          >
            {badge.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b' }}>
          {project.description}
        </p>
        <p className="text-xs" style={{ color: '#9b9b9b' }}>
          ~{project.estimatedHours} hours
        </p>
      </div>

      {/* Zone 2 — What the learner will encounter and build */}
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
            Concepts you'll encounter
          </h3>
          <ul className="space-y-1">
            {project.conceptsEncountered.map(c => (
              <li key={c} className="text-xs flex items-start gap-1.5" style={{ color: '#4b4b4b' }}>
                <span style={{ color: '#3d6b4f' }}>·</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b6b6b' }}>
            Skills you'll build
          </h3>
          <ul className="space-y-1">
            {project.skillsBuilt.map(s => (
              <li key={s} className="text-xs flex items-start gap-1.5" style={{ color: '#4b4b4b' }}>
                <span style={{ color: '#3d6b4f' }}>·</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Zone 3 — Action */}
      <div className="pt-1">
        <button
          onClick={() => onSelect(project)}
          disabled={isSelecting}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
        >
          {isSelecting ? 'Starting...' : 'Start Project'}
        </button>
      </div>
    </div>
  )
}
