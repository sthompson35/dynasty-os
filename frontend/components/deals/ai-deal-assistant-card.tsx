'use client'

import { useState } from 'react'
import { Bot, Send, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const N8N_CHAT_URL = 'https://ultimate-dynasty-os.app.n8n.cloud/webhook/eb99c858-ecfc-429b-81ee-8f57e932681f/chat'

type Message = { id: string; role: 'user' | 'assistant'; text: string }

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

// Inline, deal-scoped variant of DynastyChatWidget's floating global chat —
// same n8n webhook, but every message is prefixed with the deal_id so the
// agent has context on which deal is being discussed.
export function AIDealAssistantCard({ dealId }: { dealId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { id: generateId(), role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch(N8N_CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendMessage',
          chatInput: `[Deal ${dealId}] ${text}`,
          sessionId: `deal-${dealId}`,
        }),
      })
      if (!res.ok) throw new Error(`n8n returned ${res.status}`)
      const data = await res.json()
      const reply = typeof data?.output === 'string' ? data.output : JSON.stringify(data)
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', text: reply }])
    } catch {
      setMessages(prev => [
        ...prev,
        { id: generateId(), role: 'assistant', text: 'Unable to reach the Dynasty AI. Make sure the n8n workflow is active.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <Card className="mb-6 border-0 bg-[var(--dynasty-navy)] shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-sm text-[#F8F7F2]">
          <Bot className="h-4 w-4 text-[var(--dynasty-gold)]" /> Ask Charlie about this deal
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length > 0 && (
          <div className="mb-3 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-white/5 p-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-white/10 text-[#F8F7F2]' : 'bg-[var(--dynasty-gold)]/10 text-[#F8F7F2]/90'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/10 focus-within:ring-[var(--dynasty-gold)]">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="e.g. Why did this deal get GO_WITH_CONDITIONS?"
            disabled={loading}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#F8F7F2] placeholder-[#F8F7F2]/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || loading}
            aria-label="Send message"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--dynasty-gold)] text-[var(--dynasty-navy)] transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
