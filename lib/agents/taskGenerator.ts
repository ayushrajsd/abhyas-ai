import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { Langfuse } from 'langfuse'
import { getModel, type Provider } from '@/lib/model-config'
import { Agent3InputSchema, Agent3OutputSchema, type Task } from '@/schemas/agents'

function buildSystemPrompt(): string {
  return `You are the Task Generator for Abhyas AI, a Gurukul-philosophy learning platform.

Your job: Break down a milestone into 3–5 concrete, ordered tasks. Each task includes pre-written hints and concept resources so learners always have something to reach for when stuck.

PLATFORM CONTEXT:
- Learners build on their own machine, NOT in a browser IDE
- The teacher never gives the answer — only the next question, the next step, the next context
- Tasks are strictly ordered — cannot start N+1 before N is done
- Stack: Next.js 14 + Supabase + TypeScript as the base; pgvector only when the project uses vector storage
- Topic can be anything AI/ML related — adapt tasks to what the milestone actually covers

TASK RULES:
- Generate 3–5 tasks per milestone, strictly ordered
- title: imperative verb + specific object ("Create the embedding function", "Set up pgvector extension")
- description: 2–3 sentences — what the learner builds and why it matters for the overall project
- concept: single primary concept this task exercises (e.g., "OpenAI Embeddings API", "pgvector similarity search")
- doneWhen: CONCRETE and TESTABLE — something the learner can verify themselves
  GOOD: "You can call your function with a test string and see an array of 1536 numbers logged to the console"
  GOOD: "Running SELECT * FROM documents returns at least one row with a non-null embedding column"
  BAD: "You understand how embeddings work"
  BAD: "The function works correctly"
  Always a specific observable: terminal output, visible UI element, passing query, logged value
- estimatedMinutes: 15–90 minutes. Be honest — don't over-promise.

PRE-WRITTEN HINTS — 3 LEVELS (generated at task creation time, not at nudge time):

L1 (conceptual): Reframes the problem. Points to the right mental model. No implementation details. No function names. Pure concept.
  Example: "Embeddings convert text into a numerical fingerprint. Before writing the API call, think about what your function should receive (a string) and return (an array of numbers). Then read the embeddings guide to understand the response shape."

L2 (directional): Points at the right part of the problem. May reference a specific function, API method, or library. Still no complete code.
  Example: "The embeddings endpoint takes a model name and an input string. The response nests the vector under data[0].embedding. Look at the API reference for the exact request object shape — the model name matters."

L3 (concrete): Names the exact issue. Describes the shape of the solution without filling it in. Still no complete, runnable code.
  Example: "You need to call the embeddings create method with an object containing model and input fields. The response gives you a data array; the first item's embedding property is your vector. Look at the SDK TypeScript types for each field name before writing anything."

ABSOLUTE HINT RULE: Never write working code in any hint. No complete function bodies. No copy-pasteable implementation. If a hint contains a line that would run as-is, rewrite it as a description instead.

CONCEPT RESOURCES — 1–2 per task:
Link to the specific documentation section for the task's concept — not the homepage.

RESOURCE QUALITY:
- Anthropic docs: https://docs.anthropic.com
- OpenAI docs: https://platform.openai.com/docs
- Supabase docs: https://supabase.com/docs
- pgvector: https://github.com/pgvector/pgvector (only if task involves vectors)
- Next.js: https://nextjs.org/docs
- LangChain JS: https://js.langchain.com/docs
- Vercel AI SDK: https://sdk.vercel.ai/docs
- Link to the specific section that covers the concept. Prefer official docs over tutorials.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object. No preamble. No markdown fences. No trailing commas.

{
  "tasks": [
    {
      "title": "Create the document embedding function",
      "description": "Write the function that calls the embeddings API and returns a vector for any text input. This becomes the single embedding utility your entire RAG pipeline depends on.",
      "concept": "OpenAI Embeddings API",
      "doneWhen": "You can call your function with a test string and see an array of 1536 numbers logged to the console",
      "prewrittenHints": {
        "l1": "Embeddings convert text into a numerical fingerprint. Before writing the API call, think about what your function should receive (a string) and what it should return (an array of numbers). Then read the embeddings guide to understand the response shape.",
        "l2": "The embeddings endpoint takes a model name and an input string. The response nests the vector under data[0].embedding. Look at the API reference for the exact request shape — pay attention to which model name you use.",
        "l3": "You need the embeddings create method with model and input fields in the request object. The returned object has a data array, and the first element has an embedding property which is your vector. Type it out from the TypeScript types rather than copying — each field name matters."
      },
      "conceptResources": [
        {
          "title": "OpenAI Embeddings Guide",
          "url": "https://platform.openai.com/docs/guides/embeddings",
          "concept": "OpenAI Embeddings API",
          "type": "docs"
        }
      ],
      "orderIndex": 0,
      "estimatedMinutes": 30
    }
  ]
}`
}

export async function runTaskGenerator(
  input: unknown,
  provider: Provider,
  apiKey: string,
  userId?: string,
): Promise<Task[]> {
  const validated = Agent3InputSchema.parse(input)

  const langfuse = new Langfuse()
  const trace = langfuse.trace({
    name: 'agent_3_task_generator',
    userId,
    input: validated,
  })

  const completedContext = validated.completedMilestones.length > 0
    ? `\nCompleted milestones (concepts already introduced): ${validated.completedMilestones.join(', ')}`
    : '\nThis is the first milestone — no prior concepts introduced.'

  const prompt = `Project: ${validated.project.title}
Description: ${validated.project.description}
Complexity: ${validated.project.complexity}
Skill level: ${validated.skillLevel}
${completedContext}

Milestone to break into tasks: ${validated.milestone.title}
Milestone description: ${validated.milestone.description}
Concepts introduced in this milestone: ${validated.milestone.conceptsIntroduced.join(', ')}
Learning objectives: ${validated.milestone.learningObjectives.join('; ')}

Generate 3–5 tasks for this milestone.`

  const model = getModel(provider, 'capable')
  let fullResponse = ''
  const startTime = Date.now()

  const generation = trace.generation({
    name: 'agent_3_task_generator_generation',
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

    const stripped = fullResponse
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim()
    const parsed = JSON.parse(stripped)
    const validatedOutput = Agent3OutputSchema.parse(parsed)

    try {
      trace.update({
        output: { taskCount: validatedOutput.tasks.length },
        metadata: {
          model,
          provider,
          responseLength: fullResponse.length,
          latencyMs: Date.now() - startTime,
        },
      })
    } catch { /* non-critical */ }

    return validatedOutput.tasks

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
