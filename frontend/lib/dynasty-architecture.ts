import { getSupabaseAdmin } from './supabase-admin'

export type AgentArchitectureEntry = {
  id: string
  agentName: string
  agentRole: string
  status: string
  ownedEngines: string[]
}

type AiAgentRow = {
  id: string
  agent_name: string
  agent_role: string
  status: string
}

type EngineRow = {
  engine_name: string
  owner_agent_id: string | null
}

// Pulls the real ATLAS agent roster and engine ownership from the Supabase
// project that hosts ai_agents/engines (a separate database from the
// frontend's own Postgres). Returns [] on any failure so a Supabase outage
// or misconfiguration degrades this one card, not the whole page.
export async function getAgentArchitecture(): Promise<AgentArchitectureEntry[]> {
  try {
    const supabase = getSupabaseAdmin()
    const [agentsResult, enginesResult] = await Promise.all([
      supabase.from('ai_agents').select('id, agent_name, agent_role, status').order('agent_name'),
      supabase.from('engines').select('engine_name, owner_agent_id'),
    ])

    if (agentsResult.error) throw agentsResult.error
    if (enginesResult.error) throw enginesResult.error

    const agents = (agentsResult.data ?? []) as AiAgentRow[]
    const engines = (enginesResult.data ?? []) as EngineRow[]

    const enginesByAgentId = new Map<string, string[]>()
    for (const engine of engines) {
      if (!engine.owner_agent_id) continue
      const existing = enginesByAgentId.get(engine.owner_agent_id) ?? []
      existing.push(engine.engine_name)
      enginesByAgentId.set(engine.owner_agent_id, existing)
    }

    return agents.map((agent) => ({
      id: agent.id,
      agentName: agent.agent_name,
      agentRole: agent.agent_role,
      status: agent.status,
      ownedEngines: enginesByAgentId.get(agent.id) ?? [],
    }))
  } catch (error: unknown) {
    console.error('Unable to load agent architecture from Supabase', error)
    return []
  }
}
