'use client'

import { saveApiKey } from '@/actions/auth'
import { useState } from 'react'

type Provider = 'anthropic' | 'openai' | null

export default function ApiKeyForm() {
  const [selected, setSelected] = useState<Provider>(null)
  const [key, setKey] = useState('')
  const [pending, setPending] = useState(false)

  // Auto-detect from key prefix, but let manual selection override
  const detectedProvider: Provider = key.startsWith('sk-ant-')
    ? 'anthropic'
    : key.startsWith('sk-')
    ? 'openai'
    : null

  const provider = detectedProvider ?? selected
  const mismatch = detectedProvider && selected && detectedProvider !== selected

  async function handleSubmit(formData: FormData) {
    setPending(true)
    await saveApiKey(formData)
  }

  const providers = [
    {
      id: 'anthropic' as Provider,
      name: 'Anthropic',
      model: 'Claude Sonnet & Haiku',
      prefix: 'sk-ant-...',
      docsUrl: 'https://console.anthropic.com/settings/keys',
      color: 'violet',
    },
    {
      id: 'openai' as Provider,
      name: 'OpenAI',
      model: 'GPT-5.4 Mini & Nano',
      prefix: 'sk-...',
      docsUrl: 'https://platform.openai.com/api-keys',
      color: 'emerald',
    },
  ]

  const activeProvider = providers.find(p => p.id === provider)

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Provider selection */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-charcoal">Which AI provider do you have a key for?</p>
        <div className="grid grid-cols-2 gap-3">
          {providers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`text-left rounded-xl border-2 px-4 py-4 transition-all ${
                provider === p.id
                  ? p.color === 'violet'
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-emerald-500 bg-emerald-50'
                  : 'border-border bg-white hover:border-charcoal/30'
              }`}
            >
              <p className="font-medium text-sm text-charcoal">{p.name}</p>
              <p className="text-xs text-muted mt-0.5">{p.model}</p>
              <p className="text-xs text-muted font-mono mt-1 opacity-70">{p.prefix}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Key input: only shown after provider selected */}
      {provider && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="apiKey" className="text-sm font-medium text-charcoal">
              {activeProvider?.name} API Key
            </label>
            <a
              href={activeProvider?.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-forest hover:underline"
            >
              Get your key →
            </a>
          </div>
          <input
            id="apiKey"
            name="apiKey"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder={activeProvider?.prefix}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            className="w-full bg-white border border-border rounded-lg px-4 py-3 text-sm font-mono text-charcoal placeholder-muted focus:outline-none focus:border-forest transition-colors"
          />
          {mismatch && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              This key looks like an {detectedProvider === 'anthropic' ? 'Anthropic' : 'OpenAI'} key. Switching provider.
            </p>
          )}
          {key.length > 5 && !detectedProvider && (
            <p className="text-xs text-amber-700">
              Key format not recognised. Expected {activeProvider?.prefix}
            </p>
          )}
          <p className="text-xs text-muted">
            Encrypted with AES-256-GCM on submit. Never stored in plaintext. Decrypted only during agent calls.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !provider || !key.trim()}
        className="w-full font-medium py-3 px-6 rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: '#3d6b4f', color: '#ffffff' }}
      >
        {pending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Encrypting and storing securely…
          </>
        ) : provider ? (
          `Continue with ${activeProvider?.name}`
        ) : (
          'Select a provider above'
        )}
      </button>
    </form>
  )
}
