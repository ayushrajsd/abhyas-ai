'use client'

import { useState } from 'react'

interface TopicEntryProps {
  onSubmit: (topic: string, skillLevel: string) => void
  isLoading: boolean
}

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const

export function TopicEntry({ onSubmit, isLoading }: TopicEntryProps) {
  const [topic, setTopic] = useState('')
  const [skillLevel, setSkillLevel] = useState<string>('beginner')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && topic.trim() && !isLoading) {
      onSubmit(topic.trim(), skillLevel)
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <label
          htmlFor="topic-input"
          className="block font-serif text-2xl font-semibold"
          style={{ color: '#1c1c1c' }}
        >
          What do you want to build?
        </label>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          Abhyas V1 is built for RAG projects on Next.js + Supabase.
        </p>
      </div>

      <input
        id="topic-input"
        type="text"
        placeholder="e.g. RAG, embeddings, semantic search"
        value={topic}
        onChange={e => setTopic(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="w-full px-4 py-3 rounded-lg border text-base outline-none transition-colors"
        style={{
          borderColor: '#ddd8cf',
          backgroundColor: '#ffffff',
          color: '#1c1c1c',
        }}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium" style={{ color: '#6b6b6b' }}>
          Your current level
        </legend>
        <div className="flex gap-3">
          {SKILL_LEVELS.map(level => (
            <label
              key={level}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors"
              style={{
                borderColor: skillLevel === level ? '#3d6b4f' : '#ddd8cf',
                backgroundColor: skillLevel === level ? '#f0f7f3' : '#ffffff',
                color: skillLevel === level ? '#3d6b4f' : '#1c1c1c',
              }}
            >
              <input
                type="radio"
                name="skillLevel"
                value={level}
                checked={skillLevel === level}
                onChange={() => setSkillLevel(level)}
                disabled={isLoading}
                className="sr-only"
              />
              <span className="text-sm font-medium capitalize">{level}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button
        onClick={() => topic.trim() && !isLoading && onSubmit(topic.trim(), skillLevel)}
        disabled={isLoading || !topic.trim()}
        className="px-6 py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
        style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
      >
        {isLoading ? 'Finding projects...' : 'Show me projects'}
      </button>
    </div>
  )
}
