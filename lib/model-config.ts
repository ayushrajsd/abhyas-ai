export type Provider = 'anthropic' | 'openai'
export type ModelTier = 'fast' | 'capable'

export const MODEL_CONFIG: Record<Provider, Record<ModelTier, string>> = {
  anthropic: {
    fast:    'claude-haiku-4-5',
    capable: 'claude-sonnet-4-5',
  },
  openai: {
    fast:    'gpt-5.4-nano',  // $0.20/MTok in — cheapest GPT-5.4 class, 400K context
    capable: 'gpt-5.4-mini',  // $0.75/MTok in — strong reasoning, coding, agentic tasks
  },
}

export function getModel(provider: Provider, tier: ModelTier): string {
  return MODEL_CONFIG[provider][tier]
}
