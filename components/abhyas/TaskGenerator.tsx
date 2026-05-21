'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { generateAndSaveTasks } from '@/actions/agents'

export function TaskGenerator({ milestoneId }: { milestoneId: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  async function generate() {
    setError(null)
    setRetrying(true)
    try {
      await generateAndSaveTasks(milestoneId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setRetrying(false)
    }
  }

  useEffect(() => {
    generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [milestoneId])

  if (error) {
    return (
      <div
        className="rounded-xl p-6 text-center space-y-3"
        style={{ backgroundColor: '#fff8f0', border: '1px solid #f5d9b8' }}
      >
        <p className="text-sm" style={{ color: '#7c3f00' }}>
          Failed to generate tasks: {error}
        </p>
        <button
          onClick={generate}
          disabled={retrying}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: '#1c1c1c', color: '#f7f4ef' }}
        >
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-8 text-center space-y-4"
      style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da' }}
    >
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor: '#c8a96e',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium" style={{ color: '#4b4b4b' }}>
        Designing your tasks…
      </p>
      <p className="text-xs" style={{ color: '#9b9b9b' }}>
        Generating concrete tasks with pre-written hints and learning resources
      </p>
    </div>
  )
}
