'use client'

import { ListChecks } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type TopDecisionItem = {
  propertyId: string
  address: string
  city: string
  state: string
  dealScore: number
  riskScore: number
  decision: string
  scoreBucket: string
  strategy: string
  reasons: string[]
  nextAction: string
  updatedAt: string
}

function scoreTone(score: number): string {
  if (score >= 72) return 'bg-emerald-100 text-emerald-800'
  if (score >= 45) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function decisionTone(decision: string): string {
  if (decision === 'GO') return 'bg-emerald-100 text-emerald-800'
  if (decision === 'RENEGOTIATE') return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function buildPrompt(item: TopDecisionItem): string {
  const signal = item.reasons[0] ? ` Key signal: ${item.reasons[0]}.` : ''
  return `Analyze this deal: ${item.address}, ${item.city} ${item.state}. Deal score: ${item.dealScore}/100, Decision: ${item.decision}, Strategy: ${item.strategy}. Recommended next action: ${item.nextAction}.${signal} What should I do?`
}

export function AtlasDecisionsPanel({
  decisions,
  onDiscuss,
}: {
  decisions: TopDecisionItem[]
  onDiscuss: (prompt: string) => void
}) {
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 font-display text-xl text-[var(--dynasty-navy)]">
            <ListChecks className="h-5 w-5 text-[var(--dynasty-gold)]" /> Acquisition Deal Queue
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--dynasty-black)]/45">{today}</span>
            <Badge className="border-0 bg-[var(--dynasty-navy)] text-[#F8F7F2]">{decisions.length} deals</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {decisions.length === 0 ? (
          <p className="rounded-lg bg-[#F8F7F2] px-4 py-4 text-sm text-[var(--dynasty-black)]/60">
            No scored deals yet — run portfolio scoring to populate.
          </p>
        ) : (
          <div className="grid gap-2">
            {decisions.map((item, index) => (
              <div
                key={item.propertyId}
                className="flex flex-col gap-3 rounded-lg bg-[#F8F7F2] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-[var(--dynasty-navy)]">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[var(--dynasty-navy)]">{item.address}</p>
                    <p className="text-xs text-[var(--dynasty-black)]/50">
                      {item.city}, {item.state} · {item.strategy}
                    </p>
                    <p className="mt-1 text-xs text-[var(--dynasty-black)]/65">{item.nextAction}</p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge className={`border-0 text-xs ${scoreTone(item.dealScore)}`}>
                    {item.dealScore}/100
                  </Badge>
                  <Badge className={`border-0 text-xs ${decisionTone(item.decision)}`}>
                    {item.decision}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onDiscuss(buildPrompt(item))}
                    className="bg-[var(--dynasty-navy)] text-[#F8F7F2] hover:bg-[var(--dynasty-navy)]/85"
                  >
                    Discuss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
