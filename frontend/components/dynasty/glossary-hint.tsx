'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { findGlossaryTerm } from '@/lib/learning-center'

/**
 * Inline "?" affordance that teaches Dynasty terminology where people
 * actually encounter it - next to a field label or KPI - instead of
 * making them go find the Learning Center on their own. Hover for the
 * definition, click to jump to the full glossary entry.
 */
export function GlossaryHint({ term, className = '' }: { term: string; className?: string }) {
  const entry = findGlossaryTerm(term)
  if (!entry) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={`/learning-center?term=${encodeURIComponent(entry.term)}`}
          className={`inline-flex align-middle text-[var(--dynasty-navy)]/35 transition-colors hover:text-[var(--dynasty-gold)] ${className}`}
          aria-label={`Learn about ${entry.term}`}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        <p className="mb-1 font-semibold">{entry.term}</p>
        <p className="text-popover-foreground/80">{entry.definition}</p>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--dynasty-gold)]">Click for full glossary entry →</p>
      </TooltipContent>
    </Tooltip>
  )
}
