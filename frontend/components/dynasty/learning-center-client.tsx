'use client'

import { useMemo, useState } from 'react'
import {
  GraduationCap, Sprout, Handshake, Hammer, Repeat, Building2,
  BookOpenText, Clock, ChevronDown, ChevronUp, Search, Tag, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn } from '@/components/ui/animate'
import type { Strategy, StrategyId, ModuleLevel, GlossaryTerm } from '@/lib/learning-center/types'

const STRATEGY_ICONS: Record<StrategyId, typeof Sprout> = {
  'land-flips': Sprout,
  wholesale: Handshake,
  'fix-and-flip': Hammer,
  brrrr: Repeat,
  development: Building2,
}

const LEVEL_CONFIG: Record<ModuleLevel, { label: string; tone: string; activeTone: string }> = {
  beginner: { label: 'Beginner', tone: 'text-emerald-700 border-emerald-200 bg-emerald-50', activeTone: 'bg-emerald-600 text-white border-emerald-600' },
  intermediate: { label: 'Intermediate', tone: 'text-amber-700 border-amber-200 bg-amber-50', activeTone: 'bg-amber-600 text-white border-amber-600' },
  advanced: { label: 'Advanced', tone: 'text-rose-700 border-rose-200 bg-rose-50', activeTone: 'bg-rose-600 text-white border-rose-600' },
}

const LEVEL_ORDER: ModuleLevel[] = ['beginner', 'intermediate', 'advanced']

type TrackSelection = StrategyId | 'glossary'

export function LearningCenterClient({ strategies, glossary }: { strategies: Strategy[]; glossary: GlossaryTerm[] }) {
  const [activeTrack, setActiveTrack] = useState<TrackSelection>(strategies[0]?.id ?? 'glossary')
  const [activeLevel, setActiveLevel] = useState<ModuleLevel>('beginner')
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null)
  const [glossarySearch, setGlossarySearch] = useState('')
  const [glossaryFilter, setGlossaryFilter] = useState<StrategyId | 'all'>('all')

  const totalModules = strategies.reduce((sum, s) => sum + s.modules.length, 0)

  const activeStrategy = strategies.find((s) => s.id === activeTrack) ?? null
  const modulesForLevel = activeStrategy?.modules.filter((m) => m.level === activeLevel) ?? []

  function selectTrack(track: TrackSelection) {
    setActiveTrack(track)
    setActiveLevel('beginner')
    setExpandedModuleId(null)
  }

  function jumpToGlossary(term: string) {
    setGlossarySearch(term.split(' (')[0])
    setGlossaryFilter('all')
    setActiveTrack('glossary')
  }

  const filteredGlossary = useMemo(() => {
    const query = glossarySearch.trim().toLowerCase()
    return glossary
      .filter((g) => glossaryFilter === 'all' || g.strategies === 'all' || g.strategies.includes(glossaryFilter))
      .filter((g) => !query || g.term.toLowerCase().includes(query) || g.definition.toLowerCase().includes(query))
      .sort((a, b) => a.term.localeCompare(b.term))
  }, [glossary, glossarySearch, glossaryFilter])

  return (
    <div className="mx-auto w-[calc(100%-1.5rem)] max-w-[1200px] py-8">
      <FadeIn>
        <div className="mb-8 rounded-xl bg-[var(--dynasty-navy)] p-7 text-[#F8F7F2] shadow-xl">
          <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[var(--dynasty-gold)]">
            <GraduationCap className="h-3.5 w-3.5" /> Dynasty OS · Learning Center
          </div>
          <h1 className="mt-3 font-display text-3xl font-black tracking-tight md:text-4xl">Learning Center</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#F8F7F2]/70">
            Every strategy Dynasty underwrites, taught from first principles to advanced portfolio management -
            for operators running deals and capital partners funding them.
          </p>
          <div className="mt-5 flex flex-wrap gap-6 border-t border-white/10 pt-5">
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{strategies.length}</p><p className="text-xs text-[#F8F7F2]/60">Strategy Tracks</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{totalModules}</p><p className="text-xs text-[#F8F7F2]/60">Modules</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">{glossary.length}</p><p className="text-xs text-[#F8F7F2]/60">Terms Defined</p></div>
            <div><p className="font-display text-2xl font-black text-[var(--dynasty-gold)]">Beginner → Advanced</p><p className="text-xs text-[#F8F7F2]/60">Every Track</p></div>
          </div>
        </div>
      </FadeIn>

      {/* Track selector */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {strategies.map((strategy) => {
          const Icon = STRATEGY_ICONS[strategy.id]
          const active = activeTrack === strategy.id
          return (
            <button
              key={strategy.id}
              onClick={() => selectTrack(strategy.id)}
              className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors ${active
                ? 'border-[var(--dynasty-navy)] bg-[var(--dynasty-navy)] text-[#F8F7F2]'
                : 'border-transparent bg-[#F8F7F2] text-[var(--dynasty-navy)] hover:border-[var(--dynasty-gold)]/40'}`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-navy)]/70'}`} />
              <span className="text-sm font-bold leading-tight">{strategy.shortName}</span>
            </button>
          )
        })}
        <button
          onClick={() => selectTrack('glossary')}
          className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-sm transition-colors ${activeTrack === 'glossary'
            ? 'border-[var(--dynasty-navy)] bg-[var(--dynasty-navy)] text-[#F8F7F2]'
            : 'border-transparent bg-[#F8F7F2] text-[var(--dynasty-navy)] hover:border-[var(--dynasty-gold)]/40'}`}
        >
          <BookOpenText className={`h-5 w-5 ${activeTrack === 'glossary' ? 'text-[var(--dynasty-gold)]' : 'text-[var(--dynasty-navy)]/70'}`} />
          <span className="text-sm font-bold leading-tight">Glossary</span>
        </button>
      </div>

      {/* Strategy track view */}
      {activeStrategy && (
        <div>
          <Card className="mb-6 border-0 bg-[#F8F7F2] shadow-md">
            <CardContent className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-black text-[var(--dynasty-navy)]">{activeStrategy.name}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-[var(--dynasty-black)]/65">{activeStrategy.tagline}</p>
                </div>
                <Badge className="border-0 bg-[var(--dynasty-gold)]/20 text-xs font-semibold text-[var(--dynasty-navy)]">{activeStrategy.minBar}</Badge>
              </div>
              <p className="mt-3 border-t border-[var(--dynasty-navy)]/10 pt-3 text-xs leading-relaxed text-[var(--dynasty-black)]/50">
                <span className="font-semibold text-[var(--dynasty-navy)]/70">In the flywheel: </span>
                {activeStrategy.flywheelStage}
              </p>
            </CardContent>
          </Card>

          {/* Level tabs */}
          <div className="mb-4 flex flex-wrap gap-2">
            {LEVEL_ORDER.map((level) => {
              const config = LEVEL_CONFIG[level]
              const active = activeLevel === level
              const count = activeStrategy.modules.filter((m) => m.level === level).length
              return (
                <button
                  key={level}
                  onClick={() => { setActiveLevel(level); setExpandedModuleId(null) }}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-colors ${active ? config.activeTone : config.tone}`}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Modules for the selected level */}
          <div className="space-y-3">
            {modulesForLevel.length === 0 ? (
              <Card className="border-0 bg-[#F8F7F2] shadow-sm">
                <CardContent className="py-10 text-center text-sm text-[var(--dynasty-black)]/50">No modules at this level yet.</CardContent>
              </Card>
            ) : (
              modulesForLevel.map((mod) => {
                const expanded = expandedModuleId === mod.id
                return (
                  <Card key={mod.id} className="border-0 bg-[#F8F7F2] shadow-md">
                    <button
                      onClick={() => setExpandedModuleId(expanded ? null : mod.id)}
                      className="flex w-full items-start justify-between gap-3 p-5 text-left"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[var(--dynasty-navy)]">{mod.title}</h3>
                          <Badge className={`border-0 text-[10px] ${LEVEL_CONFIG[mod.level].tone}`}>{LEVEL_CONFIG[mod.level].label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-[var(--dynasty-black)]/60">{mod.summary}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--dynasty-black)]/40">
                          <Clock className="h-3 w-3" /> {mod.readTime} read
                        </p>
                      </div>
                      {expanded ? <ChevronUp className="h-5 w-5 flex-shrink-0 text-[var(--dynasty-navy)]/50" /> : <ChevronDown className="h-5 w-5 flex-shrink-0 text-[var(--dynasty-navy)]/50" />}
                    </button>

                    {expanded && (
                      <CardContent className="space-y-5 border-t border-[var(--dynasty-navy)]/8 pt-5">
                        {mod.sections.map((section) => (
                          <div key={section.heading}>
                            <h4 className="mb-2 text-sm font-bold text-[var(--dynasty-navy)]">{section.heading}</h4>
                            <div className="space-y-2">
                              {section.body.map((paragraph, i) => (
                                <p key={i} className="text-sm leading-relaxed text-[var(--dynasty-black)]/70">{paragraph}</p>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="rounded-lg bg-[var(--dynasty-gold)]/10 p-4">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--dynasty-navy)]/70">Key takeaways</p>
                          <ul className="space-y-1.5">
                            {mod.keyTakeaways.map((takeaway, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[var(--dynasty-black)]/75">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--dynasty-gold)]" />
                                {takeaway}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--dynasty-navy)]/70">
                            <Tag className="h-3 w-3" /> Related terms
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {mod.terms.map((term) => (
                              <button
                                key={term}
                                onClick={() => jumpToGlossary(term)}
                                className="rounded-full border border-[var(--dynasty-navy)]/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--dynasty-navy)] transition-colors hover:border-[var(--dynasty-gold)] hover:bg-[var(--dynasty-gold)]/10"
                              >
                                {term}
                              </button>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Glossary view */}
      {activeTrack === 'glossary' && (
        <div>
          <Card className="mb-4 border-0 bg-[#F8F7F2] shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg text-[var(--dynasty-navy)]">
                <BookOpenText className="h-5 w-5 text-[var(--dynasty-gold)]" /> Terminology Glossary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dynasty-black)]/35" />
                <Input
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  placeholder="Search terms or definitions..."
                  className="pl-9"
                />
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setGlossaryFilter('all')}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${glossaryFilter === 'all' ? 'border-[var(--dynasty-navy)] bg-[var(--dynasty-navy)] text-white' : 'border-[var(--dynasty-navy)]/15 text-[var(--dynasty-navy)]/70'}`}
                >
                  All
                </button>
                {strategies.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setGlossaryFilter(s.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${glossaryFilter === s.id ? 'border-[var(--dynasty-navy)] bg-[var(--dynasty-navy)] text-white' : 'border-[var(--dynasty-navy)]/15 text-[var(--dynasty-navy)]/70'}`}
                  >
                    {s.shortName}
                  </button>
                ))}
              </div>
              <p className="mb-3 text-xs text-[var(--dynasty-black)]/45">{filteredGlossary.length} of {glossary.length} terms</p>
              <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                {filteredGlossary.length === 0 ? (
                  <p className="py-10 text-center text-sm text-[var(--dynasty-black)]/50">No terms match your search.</p>
                ) : (
                  filteredGlossary.map((g) => (
                    <div key={g.term} className="rounded-lg bg-white/70 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-[var(--dynasty-navy)]">{g.term}</p>
                        {g.strategies !== 'all' && g.strategies.map((sid) => (
                          <Badge key={sid} className="border-0 bg-[var(--dynasty-navy)]/8 text-[10px] text-[var(--dynasty-navy)]/70">
                            {strategies.find((s) => s.id === sid)?.shortName ?? sid}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--dynasty-black)]/65">{g.definition}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
