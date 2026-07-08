export type ModuleLevel = 'beginner' | 'intermediate' | 'advanced'

export type Audience = 'operator' | 'investor' | 'both'

export type ModuleSection = {
  heading: string
  body: string[]
}

export type LearningModule = {
  id: string
  level: ModuleLevel
  audience: Audience
  title: string
  summary: string
  readTime: string
  sections: ModuleSection[]
  keyTakeaways: string[]
  terms: string[]
}

export type StrategyId = 'land-flips' | 'wholesale' | 'fix-and-flip' | 'brrrr' | 'development'

export type Strategy = {
  id: StrategyId
  name: string
  shortName: string
  tagline: string
  flywheelStage: string
  minBar: string
  modules: LearningModule[]
}

export type GlossaryTerm = {
  term: string
  definition: string
  strategies: StrategyId[] | 'all'
}
