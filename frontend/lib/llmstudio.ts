// Sends a chat completion request to the LM Studio OpenAI-compatible API
// (LLMSTUDIO_BASE_URL) and parses the assistant's reply as JSON. Used for
// document-extraction features (e.g. PDF property import) where no other
// LLM integration exists in this codebase yet.

const COMPLETION_TIMEOUT_MS = 90_000

export class LLMStudioError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LLMStudioError'
  }
}

function getBaseUrl(): string {
  return (process.env.LLMSTUDIO_BASE_URL || 'http://127.0.0.1:1234').replace(/\/$/, '')
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return fenced ? fenced[1].trim() : trimmed
}

// Requests a chat completion from LM Studio and parses the response content
// as JSON. Throws LLMStudioError with a user-facing message on any failure
// (unreachable server, timeout, or a non-JSON reply).
export async function requestJsonCompletion(params: {
  systemPrompt: string
  userPrompt: string
}): Promise<Record<string, unknown>> {
  const baseUrl = getBaseUrl()
  const model = process.env.LLMSTUDIO_DEFAULT_MODEL || ''
  const apiKey = process.env.LLMSTUDIO_API_KEY || ''

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), COMPLETION_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: model || undefined,
        temperature: 0,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
      signal: controller.signal,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LLMStudioError(
        `LM Studio at ${baseUrl} did not respond within ${COMPLETION_TIMEOUT_MS / 1000}s. Make sure LM Studio is running with a model loaded.`
      )
    }
    throw new LLMStudioError(
      `Could not reach LM Studio at ${baseUrl}. Make sure LM Studio is running and reachable from this environment.`
    )
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new LLMStudioError(`LM Studio returned ${response.status}: ${body.slice(0, 300) || 'no details'}`)
  }

  const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null
  const content = payload?.choices?.[0]?.message?.content ?? ''
  if (!content) {
    throw new LLMStudioError('LM Studio returned an empty response.')
  }

  try {
    return JSON.parse(stripCodeFence(content)) as Record<string, unknown>
  } catch {
    throw new LLMStudioError('LM Studio did not return valid JSON. Try again or enter the details manually.')
  }
}
