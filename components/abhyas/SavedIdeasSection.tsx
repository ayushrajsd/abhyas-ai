'use client'

import type { SavedIdea } from '@/actions/agents'

interface SavedIdeasSectionProps {
  ideas: SavedIdea[]
  startingId: string | null
  onStart: (idea: SavedIdea) => void
  onRemove: (idea: SavedIdea) => void
}

const COMPLEXITY_DOT: Record<string, string> = {
  beginner:     '#3d6b4f',
  intermediate: '#854d0e',
  challenging:  '#991b1b',
}

export function SavedIdeasSection({ ideas, startingId, onStart, onRemove }: SavedIdeasSectionProps) {
  if (ideas.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9b9b9b' }}>
        Saved for later
      </h2>
      <ul className="space-y-2">
        {ideas.map(idea => (
          <li
            key={idea.id}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
            style={{ backgroundColor: '#ffffff', borderColor: '#ddd8cf' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="shrink-0 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: COMPLEXITY_DOT[idea.complexity] ?? '#9b9b9b' }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1c1c1c' }}>
                  {idea.title}
                </p>
                <p className="text-xs truncate" style={{ color: '#9b9b9b' }}>
                  {idea.topic}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onStart(idea)}
                disabled={startingId === idea.id}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
              >
                {startingId === idea.id ? 'Starting…' : 'Start'}
              </button>
              <button
                onClick={() => onRemove(idea)}
                className="text-xs px-2 py-1.5 rounded-lg transition-colors"
                style={{ color: '#9b9b9b' }}
                title="Remove from saved"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
