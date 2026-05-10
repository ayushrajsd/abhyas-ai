export type Provider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'capable'

export const MODEL_CONFIG: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    fast:    'claude-haiku-4-5',
    capable: 'claude-sonnet-4-5',
  },
  openai: {
    fast:    'gpt-4.1-mini',  // fast, cheap — directional equivalent to haiku tier
    capable: 'gpt-4.1',       // strong reasoning, coding, agentic tasks
  },
}

export function getModel(provider: Provider, tier: ModelTier): string {
  return MODEL_CONFIG[provider][tier]
}
