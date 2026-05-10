'use client'

import { saveApiKey } from '@/actions/auth'
import { useState } from 'react'

export default function ApiKeyForm() {
  const [key, setKey] = useState('')
  const [pending, setPending] = useState(false)

  const provider = key.startsWith('sk-ant-')
    ? 'anthropic'
    : key.startsWith('sk-')
    ? 'openai'
    : null

  async function handleSubmit(formData: FormData) {
    setPending(true)
    await saveApiKey(formData)
    // redirect happens inside the action — no reset needed
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="apiKey" className="text-sm font-medium text-zinc-300">
          API Key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-... or sk-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
        />
        {provider && (
          <p className="text-xs text-emerald-400 font-medium">
            {provider === 'anthropic' ? '✓ Anthropic key detected' : '✓ OpenAI key detected'}
          </p>
        )}
        {key.length > 5 && !provider && (
          <p className="text-xs text-amber-400">
            Key format not recognised — expected sk-ant-... (Anthropic) or sk-... (OpenAI)
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || !provider}
        className="w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : 'Continue'}
      </button>
    </form>
  )
}
