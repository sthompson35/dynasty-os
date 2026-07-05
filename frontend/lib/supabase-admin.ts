import { createClient } from '@supabase/supabase-js'

// Server-only client for the separate Supabase project that hosts the ATLAS
// agent/engine/strike-team tables (ai_agents, engines, strike_teams) - a
// different database from the frontend's own Postgres (accessed via Prisma).
// Uses the service role key to bypass RLS, since these tables have RLS
// enabled with no policies defined (default-deny for anon/authenticated).
// Never import this from a client component - the service role key must
// never reach the browser bundle.
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured.')
  }

  client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
