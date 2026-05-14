import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import { Agent1InputSchema, Agent1OutputSchema, type ProjectIdea } from '@/schemas/agents'

function buildSystemPrompt(): string {
  return `You are the Project Ideator for Abhyas AI — a Gurukul-philosophy learning platform for AI developers.

Your job: Generate project ideas for a learner who wants to build with AI.

PLATFORM CONTEXT:
- V1 supports one topic: RAG (Retrieval-Augmented Generation)
- V1 stack is fixed: Next.js 14 + Supabase + pgvector
- Learner brings their own Anthropic or OpenAI API key
- Projects are built on the learner's own machine, pushed to GitHub

WHAT TO GENERATE:
Generate 5–7 distinct project ideas. Each must be genuinely buildable in the stated stack within the estimated hours. No toy examples. No "hello world" variants. Real projects that a developer would be proud to show.

FOR EACH PROJECT, provide:
- title: specific and descriptive (e.g. "Codebase Q&A Assistant" not "RAG App")
- description: 2–3 sentences. What it does, why it's interesting, what makes it non-trivial.
- complexity: match to the learner's skill level. beginner → mostly beginner projects, a couple intermediate. intermediate → mix of intermediate and challenging.
- estimatedHours: realistic total hours. beginner 8–20hrs, intermediate 15–35hrs, challenging 25–60hrs.
- conceptsEncountered: the AI/RAG concepts the learner will actually use (e.g. "chunking strategy", "vector similarity search", "embedding models", "context window management"). 4–6 items.
- skillsBuilt: practical engineering skills (e.g. "building streaming APIs", "Supabase pgvector setup", "Next.js Server Actions"). 3–5 items.

WHAT NOT TO INCLUDE:
- No prerequisites — conceptsEncountered is a map of what they'll meet, not a gate
- No warmupResources — those live on milestones, not project cards
- No "you need to know X before starting" language anywhere

SKILL LEVEL CALIBRATION:
- beginner: favour projects with clear, bounded scope. Avoid open-ended architecture decisions.
- intermediate: projects that require real design choices. Some ambiguity is intentional.
- challenging: projects where the learner must make consequential architectural decisions with real trade-offs.

VARIETY:
Generate meaningfully different projects — different use cases, different complexity levels, different conceptual challenges. Do not generate 5 versions of the same idea.

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
    "skillsBuilt": ["...", "..."]
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
      // Incomplete object — stop, retry on next chunk
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
      ? `\nAlready built: ${validated.existingProjects.join(', ')} — generate different projects`
      : ''
  }`

  const model = getModel(provider, 'fast')
  let fullResponse = ''
  const yieldedCount = { value: 0 }

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
    } else {
      const client = new OpenAI({ apiKey })
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
      }
    }

    // Final validation of complete output
    const parsed = JSON.parse(fullResponse)
    Agent1OutputSchema.parse({ projects: parsed })

    trace.update({
      output: { projectCount: parsed.length },
      metadata: { model, provider, responseLength: fullResponse.length },
    })
  } catch (err) {
    trace.update({ metadata: { error: String(err) } })
    throw err
  } finally {
    await langfuse.flushAsync()
  }
}
