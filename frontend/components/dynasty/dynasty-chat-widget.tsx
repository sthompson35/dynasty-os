'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Send, X, Minimize2, Loader2, MessageSquare } from 'lucide-react'
import { sendDynastyAIMessage } from '@/lib/dynasty-ai-chat'

type Message = {
  id: string
  role: 'user' | 'assistant'
  text: string
  ts: number
}

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export function DynastyChatWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hey - this is ATLAS. Ask me to analyze a deal, score the pipeline, generate a campaign, show capital risk, or route owner research.",
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(generateId())
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open && !minimized) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open, minimized])

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, minimized])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { id: generateId(), role: 'user', text, ts: Date.now() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const reply = await sendDynastyAIMessage(text, sessionId.current)
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', text: reply, ts: Date.now() }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'assistant', text: 'Unable to reach the Dynasty AI. Make sure the n8n workflow is active.', ts: Date.now() },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Dynasty AI chat"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dynasty-navy)] text-[var(--dynasty-gold)] shadow-lg transition-all hover:scale-105 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dynasty-gold)] focus-visible:ring-offset-2"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-2xl bg-[#F8F7F2] shadow-2xl ring-1 ring-black/8 transition-all duration-200 ${
            minimized ? 'h-14 w-72' : 'h-[520px] w-[360px]'
          }`}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between bg-[var(--dynasty-navy)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dynasty-gold)]/20">
                <Bot className="h-4 w-4 text-[var(--dynasty-gold)]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F8F7F2]">Dynasty AI</p>
                {!minimized && <p className="text-[10px] text-[#F8F7F2]/60">Powered by n8n · ATLAS status</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMinimized((v) => !v)}
                aria-label={minimized ? 'Expand chat' : 'Minimize chat'}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#F8F7F2]/60 hover:bg-white/10 hover:text-[#F8F7F2]"
              >
                {minimized ? <MessageSquare className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#F8F7F2]/60 hover:bg-white/10 hover:text-[#F8F7F2]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="mr-2 mt-1 flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--dynasty-navy)]">
                          <Bot className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-tr-sm bg-[var(--dynasty-navy)] text-[#F8F7F2]'
                          : 'rounded-tl-sm bg-white text-[var(--dynasty-black)] shadow-sm ring-1 ring-black/5'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="mr-2 mt-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--dynasty-navy)]">
                        <Bot className="h-3.5 w-3.5 text-[var(--dynasty-gold)]" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-3.5 py-3 shadow-sm ring-1 ring-black/5">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--dynasty-navy)]/40 [animation-delay:0ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--dynasty-navy)]/40 [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--dynasty-navy)]/40 [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 border-t border-black/8 bg-white px-3 py-3">
                <div className="flex items-center gap-2 rounded-xl bg-[#F8F7F2] px-3 py-2 ring-1 ring-black/8 focus-within:ring-2 focus-within:ring-[var(--dynasty-navy)]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about a deal, market, or portfolio…"
                    disabled={loading}
                    className="min-w-0 flex-1 bg-transparent text-sm text-[var(--dynasty-black)] placeholder-[var(--dynasty-black)]/40 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--dynasty-navy)] text-[var(--dynasty-gold)] transition hover:bg-[var(--dynasty-black)] disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1.5 text-center text-[10px] text-[var(--dynasty-black)]/30">Dynasty AI · n8n status link</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
