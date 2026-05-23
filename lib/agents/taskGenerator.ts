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
- Fixed stack: Next.js 14 (App Router) + Vercel AI SDK + Supabase + TypeScript
- Vercel AI SDK handles AI calls: streamText, generateText, useChat, useCompletion, tool calling — use this, not raw provider SDKs
- Add pgvector only when the milestone involves vector storage
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
      "title": "Wire up the first streaming AI response",
      "description": "Set up a Server Action that calls the AI model using the Vercel AI SDK and streams the response back to the client. This is the core pattern every AI feature in the project will build on.",
      "concept": "Vercel AI SDK streamText",
      "doneWhen": "You can submit a prompt in the UI and see the AI response appear word-by-word in the browser without a full page reload",
      "prewrittenHints": {
        "l1": "Streaming means the response arrives in chunks rather than all at once. Before writing any code, understand what the server needs to return (a stream) and what the client needs to do with it (read chunks and append them to the UI).",
        "l2": "The Vercel AI SDK's streamText function returns a result with a toDataStreamResponse() method. On the client, the useChat or useCompletion hook handles reading the stream and updating state automatically.",
        "l3": "Your Server Action should call streamText with the model and messages, then return result.toDataStreamResponse(). The client hook needs an api path pointing to that action. Look at the SDK quickstart for the exact shape of both sides."
      },
      "conceptResources": [
        {
          "title": "Vercel AI SDK: Streaming Text",
          "url": "https://sdk.vercel.ai/docs/ai-sdk-core/generating-text",
          "concept": "Vercel AI SDK streamText",
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
