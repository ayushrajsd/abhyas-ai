import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import { Agent1InputSchema, Agent1OutputSchema, type ProjectIdea } from '@/schemas/agents'

function buildSystemPrompt(): string {
  return `You are the Project Ideator for Abhyas AI, a Gurukul-philosophy learning platform where learners build real projects that integrate AI.

Your job: Given a topic the learner cares about, generate project ideas that build something real in that domain — with AI meaningfully integrated into it.

PLATFORM CONTEXT:
- Fixed stack: Next.js 14 (App Router) + Supabase + Anthropic SDK or OpenAI SDK
- AI calls go through the provider SDK directly — Anthropic SDK for Claude models, OpenAI SDK for GPT models
- Add pgvector when the project needs semantic/vector search; omit otherwise
- Learner brings their own Anthropic or OpenAI API key
- Projects are built on the learner's own machine, pushed to GitHub

THE CORE RULE — AI MUST BE INTEGRAL, NOT DECORATIVE:
Every project must use AI in a way that is central to the value it delivers. Not a chatbot bolted on. Not a "summarise this" button added to an otherwise static app. The AI should be the reason the app is interesting — it does something that would be impossible or deeply tedious without it.

Good AI integration examples by domain:
- E-commerce: AI that interprets vague search queries ("something cozy for winter under $50") into filtered results
- Healthcare: AI that extracts structured data from unstructured clinical notes
- Education: AI tutor that adapts explanation depth based on where the learner's confusion actually is
- Finance: AI that categorises messy transaction descriptions and flags anomalies
- Productivity: AI that turns a raw brain dump into a structured action plan with priorities
- Legal: AI that reads a contract and surfaces clauses that deviate from standard templates
- Fitness: AI that reads a workout log in plain English and tracks progressive overload

THE TOPIC IS THE DOMAIN. AI IS THE TOOL:
- The learner's topic tells you what domain they want to build in
- AI is always present — it is what makes the project worth building on this platform
- If someone says "e-commerce", generate e-commerce apps that are genuinely smarter because of AI
- If someone says "Next.js", generate Next.js apps where AI is core to the product
- If someone says "RAG", generate projects where retrieval-augmented generation is the central mechanism
- Never generate a project where removing the AI leaves a perfectly fine app

WHAT TO GENERATE:
Generate 5–7 distinct project ideas. Each must be genuinely buildable within the estimated hours. No toy examples. No "hello world" variants. Real projects a developer would be proud to show.

FOR EACH PROJECT, provide:
- title: specific and descriptive ("AI-Powered Recipe Substitution Engine" not "Recipe App with AI")
- description: 2–3 sentences. What it does, why AI makes it interesting, and what challenge the learner will work through. Forward-looking and curious — "you will tackle", "the interesting challenge is". Never discouraging. Learner finishes reading and wants to start immediately.
- complexity: match to skill level
- estimatedHours: beginner 8–20hrs, intermediate 15–35hrs, challenging 25–60hrs
- conceptsEncountered: the specific AI/engineering concepts they will encounter. 4–6 items. Name them precisely ("structured output extraction", "semantic similarity scoring", "streaming token generation") not vaguely ("AI", "machine learning")
- skillsBuilt: practical skills built (e.g. "prompt engineering for structured JSON output", "Next.js Server Actions with streaming", "Supabase real-time subscriptions"). 3–5 items.

RECOMMENDED FLAG:
Exactly one project must have "recommended": true — the best fit for their skill level with the clearest learning arc. All others omit the field entirely.

WHAT NOT TO INCLUDE:
- No prerequisites. conceptsEncountered is a map of what they will meet, not a gate.
- No warmupResources. Those live on milestones, not project cards.
- No "you need to know X before starting" language anywhere

COMPLEXITY DISTRIBUTION — follow exactly:
- beginner skill level:     5 beginner projects, 1 intermediate, 0 challenging
- intermediate skill level: 1 beginner, 4 intermediate, 2 challenging
- advanced skill level:     0 beginner, 2 intermediate, 5 challenging

Do not deviate from these counts. The learner chose a skill level and expects to see projects at that level.

SKILL LEVEL CALIBRATION:
- beginner: clear, bounded scope. No open-ended architecture decisions.
- intermediate: requires real design choices. Some ambiguity is intentional.
- challenging: consequential architectural decisions with real trade-offs.

VARIETY:
Generate meaningfully different projects: different use cases, different complexity levels, different conceptual challenges. Do not generate 5 versions of the same idea.

OUTPUT FORMAT:
Respond with ONLY a valid JSON array. No preamble. No explanation. No markdown fences.
The array must be parseable by JSON.parse() with no preprocessing.

[
  {
    "id": "unique-id-1",
    "title": "...",
    "description": "...",
    "complexity": "beginner|intermediate|challenging",
    "estimatedHours": 12,
    "conceptsEncountered": ["...", "..."],
    "skillsBuilt": ["...", "..."],
    "recommended": true
  }
]`
}

// Extracts complete JSON objects from a partial JSON array string.
// Uses a local yieldedCount to avoid duplicates within one invocation.
function* extractCompleteProjects(
  partial: string,
  yieldedCount: { value: number },
): Generator<ProjectIdea> {
  const matches = Array.from(partial.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/g))
  for (let i = yieldedCount.value; i < matches.length; i++) {
    try {
      const obj = JSON.parse(matches[i][0]) as ProjectIdea
      yieldedCount.value = i + 1
      yield obj
    } catch {
      // Incomplete object: stop, retry on next chunk
      break
    }
  }
}

export async function* runProjectIdeator(
  input: unknown,
  provider: Provider,
  apiKey: string,
  userId?: string,
): AsyncGenerator<ProjectIdea> {
  const validated = Agent1InputSchema.parse(input)

  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'agent_1_project_ideator',
    userId,
    input: validated,
  })

  const prompt = `Topic: ${validated.topic}
Skill level: ${validated.skillLevel}${
    validated.existingProjects.length > 0
      ? `\nAlready built: ${validated.existingProjects.join(', ')}. Generate different projects.`
      : ''
  }`

  const model = getModel(provider, 'fast')
  let fullResponse = ''
  const yieldedCount = { value: 0 }
  const startTime = Date.now()

  const generation = trace.generation({
    name: 'agent_1_project_ideator_generation',
    model,
    input: [{ role: 'user', content: prompt }],
    modelParameters: { max_tokens: 4096 },
  })

  let generationEnded = false

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      const stream = client.messages.stream({
        model,
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      })

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullResponse += chunk.delta.text
          yield* extractCompleteProjects(fullResponse, yieldedCount)
        }
      }

      try {
        const finalMsg = await stream.finalMessage()
        generation.end({
          output: fullResponse,
          usage: {
            input:  finalMsg.usage.input_tokens,
            output: finalMsg.usage.output_tokens,
          },
        })
        generationEnded = true
      } catch { /* Langfuse usage capture failed — streaming was successful */ }

    } else {
      const client = new OpenAI({ apiKey })
      let inputTokens = 0
      let outputTokens = 0

      const stream = await client.responses.create({
        model,
        stream: true,
        instructions: buildSystemPrompt(),
        input: prompt,
      })

      for await (const chunk of stream) {
        if (chunk.type === 'response.output_text.delta') {
          fullResponse += chunk.delta
          yield* extractCompleteProjects(fullResponse, yieldedCount)
        }
        if (chunk.type === 'response.completed') {
          inputTokens  = (chunk.response as { usage?: { input_tokens?: number } }).usage?.input_tokens  ?? 0
          outputTokens = (chunk.response as { usage?: { output_tokens?: number } }).usage?.output_tokens ?? 0
        }
      }

      try {
        generation.end({
          output: fullResponse,
          usage: { input: inputTokens, output: outputTokens },
        })
        generationEnded = true
      } catch { /* Langfuse usage capture failed — streaming was successful */ }
    }

    // Final validation of complete output
    const parsed = JSON.parse(fullResponse)
    Agent1OutputSchema.parse({ projects: parsed })

    try {
      trace.update({
        output: { projectCount: parsed.length },
        metadata: {
          model,
          provider,
          responseLength: fullResponse.length,
          latencyMs: Date.now() - startTime,
        },
      })
    } catch { /* non-critical */ }

  } catch (err) {
    if (!generationEnded) {
      try { generation.end({ output: String(err) }) } catch { /* ignore */ }
    }
    try { trace.update({ metadata: { error: String(err) } }) } catch { /* ignore */ }
    throw err
  } finally {
    try { await langfuse.flushAsync() } catch { /* ignore */ }
  }
}
