// Shared client for the Dynasty AI / ATLAS n8n chat webhook. Used by the
// floating chat widget and the ATLAS command chat on /engines/ai so both
// send requests the same way and parse the reply the same way.

const N8N_CHAT_URL = 'https://ultimate-dynasty-os.app.n8n.cloud/webhook/dynasty-chat'

export class DynastyAIUnreachableError extends Error {}

export function generateSessionId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function describeReply(data: unknown): string {
  if (typeof (data as { output?: unknown })?.output === 'string') {
    return (data as { output: string }).output
  }
  const manifestReply = data as { status?: string; agent?: string; message?: string } | null
  if (manifestReply?.status === 'online' && manifestReply?.agent) {
    return `${manifestReply.agent} is online. ${manifestReply.message ?? ''}`.trim()
  }
  return JSON.stringify(data)
}

export async function sendDynastyAIMessage(text: string, sessionId: string): Promise<string> {
  const response = await fetch(N8N_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sendMessage', chatInput: text, sessionId }),
  })
  if (!response.ok) {
    throw new DynastyAIUnreachableError(`n8n returned ${response.status}`)
  }
  const data = await response.json()
  return describeReply(data)
}
