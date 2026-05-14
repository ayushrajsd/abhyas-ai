'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopicEntry } from '@/components/abhyas/TopicEntry'
import { ProjectIdeaCard } from '@/components/abhyas/ProjectIdeaCard'
import { generateProjectIdeas, selectProject } from '@/actions/agents'
import type { ProjectIdea } from '@/schemas/agents'

export function DashboardClient() {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [projects, setProjects] = useState<ProjectIdea[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (submittedTopic: string, skillLevel: string) => {
    setIsLoading(true)
    setProjects([])
    setError(null)
    setTopic(submittedTopic)

    try {
      const stream = await generateProjectIdeas(submittedTopic, skillLevel)
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const project = JSON.parse(line) as ProjectIdea
            setProjects(prev => [...prev, project])
          } catch {
            // malformed line — skip
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (message.includes('onboarding')) {
        router.push('/onboarding')
      } else {
        setError(message)
      }
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const handleSelect = useCallback(async (project: ProjectIdea) => {
    setIsSelecting(true)
    try {
      const projectId = await selectProject(project, topic)
      router.push(`/projects/${projectId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start project')
      setIsSelecting(false)
    }
  }, [router, topic])

  return (
    <div className="space-y-12">
      <TopicEntry onSubmit={handleSubmit} isLoading={isLoading} />

      {error && (
        <div
          role="alert"
          className="px-4 py-3 rounded-lg text-sm border"
          style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}
        >
          {error}
        </div>
      )}

      {isLoading && projects.length === 0 && (
        <div className="text-sm" style={{ color: '#6b6b6b' }}>
          Finding projects for you...
        </div>
      )}

      {projects.length > 0 && (
        <section className="space-y-6">
          <h2 className="font-serif text-xl font-semibold" style={{ color: '#1c1c1c' }}>
            {isLoading
              ? `Finding projects… (${projects.length} so far)`
              : `${projects.length} project${projects.length === 1 ? '' : 's'} for you`
            }
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map(project => (
              <ProjectIdeaCard
                key={project.id}
                project={project}
                onSelect={handleSelect}
                isSelecting={isSelecting}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
