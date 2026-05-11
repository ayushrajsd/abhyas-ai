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
  }

  return (
    <form action={handleSubmit} className="space-y-6">

      {/* Provider selector — visual only, actual detection is from key prefix */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
          provider === 'anthropic'
            ? 'border-violet-500 bg-violet-500/10 text-violet-300'
            : 'border-zinc-800 text-zinc-500'
        }`}>
          <p className="font-medium">Anthropic</p>
          <p className="text-xs mt-0.5 opacity-70">starts with sk-ant-</p>
        </div>
        <div className={`rounded-lg border px-4 py-3 text-sm transition-colors ${
          provider === 'openai'
            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
            : 'border-zinc-800 text-zinc-500'
        }`}>
          <p className="font-medium">OpenAI</p>
          <p className="text-xs mt-0.5 opacity-70">starts with sk-</p>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="apiKey" className="text-sm font-medium text-zinc-300">
          API Key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your key here"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
        />
        {key.length > 5 && !provider && (
          <p className="text-xs text-amber-400">
            Key format not recognised — expected sk-ant-... (Anthropic) or sk-... (OpenAI)
          </p>
        )}
        <p className="text-xs text-zinc-600">
          Encrypted with AES-256-GCM. Decrypted only during agent calls on the server. Never stored in plaintext.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending || !provider}
        className="w-full bg-white text-black font-medium py-3 px-6 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Saving…' : provider ? `Continue with ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'}` : 'Continue'}
      </button>
    </form>
  )
}
