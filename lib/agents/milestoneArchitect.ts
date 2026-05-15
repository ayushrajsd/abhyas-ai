import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import { Agent2InputSchema, Agent2OutputSchema, type Milestone } from '@/schemas/agents'

function buildSystemPrompt(): string {
  return `You are the Milestone Architect for Abhyas AI, a Gurukul-philosophy learning platform.

Your job: Given a project idea and learner context, design a milestone roadmap that guides the learner through building it independently.

PLATFORM CONTEXT:
- Learners build on their own machine and push to GitHub
- The teacher never gives the answer — only the next question, the next step, the next context
- Milestones must be independently verifiable (something concrete the learner can check themselves)
- V1 topic is RAG; stack is Next.js 14 + Supabase + pgvector

OUTPUT RULES:
- Generate 4–6 milestones, strictly ordered
- Milestone 1 MUST be achievable in 2–4 hours maximum — first win matters
- Each milestone must end with something testable: a working feature, a passing test, a visible output
- conceptsIntroduced: list ONLY concepts that are NEW in this milestone — never repeat a concept from a prior milestone
- warmupResources: exactly one resource per concept in conceptsIntroduced (same length). Each resource must be a real, specific URL (official docs, a canonical article, or a high-quality video). Not generic — link to the specific section that covers this concept.
- learningObjectives: 2–3 concrete, observable outcomes ("can implement X", "understands why Y", "can debug Z")

MILESTONE 1 SPECIAL RULES:
- Must include a setup_checklist: a list of environment setup steps the learner needs before coding
- Each checklist item: { item: "description", command: "shell command or null", done: false }
- Examples: install deps, create .env.local, run database migration, start dev server
- 4–8 checklist items max

MILESTONES 2+ RULES:
- setup_checklist must be null (only Milestone 1 has it)
- Build incrementally on previous milestones — no repetition of already-introduced concepts
- Each milestone should take 2–8 hours depending on complexity

CONCEPT PROGRESSION:
- Spread concepts across milestones naturally — don't front-load everything into Milestone 1
- Later milestones can reference earlier concepts but must not re-introduce them
- Advanced projects can have more complex concepts per milestone

RESOURCE QUALITY:
- Anthropic docs: https://docs.anthropic.com
- Supabase docs: https://supabase.com/docs
- pgvector: https://github.com/pgvector/pgvector
- OpenAI embeddings: https://platform.openai.com/docs/guides/embeddings
- Next.js: https://nextjs.org/docs
- Prefer official docs over tutorials. Prefer specific sections over homepages.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object. No preamble. No markdown fences.

{
  "milestones": [
    {
      "title": "...",
      "description": "2-3 sentences on what the learner builds and why it matters",
      "learningObjectives": ["can implement...", "understands...", "can debug..."],
      "conceptsIntroduced": ["chunking strategy", "pgvector setup"],
      "warmupResources": [
        {
          "title": "specific resource title",
          "url": "https://...",
          "concept": "chunking strategy",
          "type": "docs"
        }
      ],
      "orderIndex": 0,
      "setupChecklist": [
        { "item": "Install dependencies", "command": "npm install", "done": false }
      ]
    }
  ]
}`
}

export async function runMilestoneArchitect(
  input: unknown,
  provider: Provider,
  apiKey: string,
  userId?: string,
): Promise<Milestone[]> {
  const validated = Agent2InputSchema.parse(input)

  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'agent_2_milestone_architect',
    userId,
    input: validated,
  })

  const prompt = `Project: ${validated.project.title}
Description: ${validated.project.description}
Complexity: ${validated.project.complexity}
Topic: ${validated.topic}
Skill level: ${validated.skillLevel}
Estimated hours: ${validated.project.estimatedHours}
Concepts the learner will encounter: ${validated.project.conceptsEncountered.join(', ')}
Skills they will build: ${validated.project.skillsBuilt.join(', ')}

Design a milestone roadmap for this project.`

  const model = getModel(provider, 'capable')
  let fullResponse = ''
  const startTime = Date.now()

  const generation = trace.generation({
    name: 'agent_2_milestone_architect_generation',
    model,
    input: [{ role: 'user', content: prompt }],
    modelParameters: { max_tokens: 4096 },
  })

  let generationEnded = false

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey })
      const msg = await client.messages.create({
        model,
        max_tokens: 4096,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      })
      fullResponse = msg.content[0].type === 'text' ? msg.content[0].text : ''

      try {
        generation.end({
          output: fullResponse,
          usage: { input: msg.usage.input_tokens, output: msg.usage.output_tokens },
        })
        generationEnded = true
      } catch { /* non-critical */ }

    } else {
      const client = new OpenAI({ apiKey })
      const resp = await client.responses.create({
        model,
        instructions: buildSystemPrompt(),
        input: prompt,
      })
      fullResponse = (resp as { output_text?: string }).output_text ?? ''

      try {
        const usage = (resp as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
        generation.end({
          output: fullResponse,
          usage: { input: usage?.input_tokens ?? 0, output: usage?.output_tokens ?? 0 },
        })
        generationEnded = true
      } catch { /* non-critical */ }
    }

    const parsed = JSON.parse(fullResponse)
    const validated_output = Agent2OutputSchema.parse(parsed)

    try {
      trace.update({
        output: { milestoneCount: validated_output.milestones.length },
        metadata: {
          model,
          provider,
          responseLength: fullResponse.length,
          latencyMs: Date.now() - startTime,
        },
      })
    } catch { /* non-critical */ }

    return validated_output.milestones

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
