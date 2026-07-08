import { LAND_FLIPS } from './strategies/land-flips'
import { WHOLESALE } from './strategies/wholesale'
import { FIX_AND_FLIP } from './strategies/fix-and-flip'
import { BRRRR } from './strategies/brrrr'
import { DEVELOPMENT } from './strategies/development'
import { GLOSSARY } from './glossary'

export const STRATEGIES = [LAND_FLIPS, WHOLESALE, FIX_AND_FLIP, BRRRR, DEVELOPMENT]

export { GLOSSARY }
export * from './types'

/**
 * Looks up a glossary term for contextual in-app help. Matches on the
 * term's name with its parenthetical spelled-out form stripped (so
 * "ARV" matches the entry titled "ARV (After Repair Value)"), falling
 * back to a substring match so callers can pass loose labels.
 */
export function findGlossaryTerm(query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return undefined
  const stripped = (term: string) => term.split(' (')[0].trim().toLowerCase()
  return (
    GLOSSARY.find((g) => stripped(g.term) === needle) ??
    GLOSSARY.find((g) => g.term.toLowerCase() === needle) ??
    GLOSSARY.find((g) => stripped(g.term).includes(needle) || needle.includes(stripped(g.term)))
  )
}
