'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSaveMilestones } from '@/actions/agents'

export function MilestoneGenerator({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    generateAndSaveMilestones(projectId)
      .then(() => router.refresh())
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to generate milestones')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  if (error) {
    return (
      <div
        role="alert"
        className="px-4 py-3 rounded-lg text-sm border"
        style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}
      >
        {error}
        <button
          onClick={() => {
            setError(null)
            generateAndSaveMilestones(projectId)
              .then(() => router.refresh())
              .catch(err => setError(err instanceof Error ? err.message : 'Failed to generate milestones'))
          }}
          className="ml-3 underline underline-offset-2"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 py-8">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: '#3d6b4f',
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          Designing your learning roadmap…
        </p>
      </div>
      <p className="text-xs" style={{ color: '#9b9b9b' }}>
        Breaking the project into milestones you can tackle one at a time.
      </p>
    </div>
  )
}
