-- Migration: 20260701141426_create_dynasty_os_agent_boards.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

create table agent_board_items (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references ai_agents(id) on delete cascade,
  category text not null check (category in ('task','deploy','infra')),
  platform text check (platform in ('github','railway','docker','supabase','n8n','notion','shopify','other')),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','blocked','deployed','healthy','degraded','down','done')),
  priority text default 'medium' check (priority in ('low','medium','high','critical')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agent_board_items_agent on agent_board_items(agent_id);
create index idx_agent_board_items_category on agent_board_items(category);

-- seed one infra-monitoring row per agent per surface so every board opens with the full pipeline visible
insert into agent_board_items (agent_id, category, platform, title, status, priority)
select id, 'infra', 'github', agent_name || ' - repo/CI status', 'todo', 'medium' from ai_agents
union all
select id, 'infra', 'railway', agent_name || ' - Railway deploy status', 'todo', 'medium' from ai_agents
union all
select id, 'infra', 'docker', agent_name || ' - Container health', 'todo', 'medium' from ai_agents
union all
select id, 'infra', 'supabase', agent_name || ' - Live data health', 'healthy', 'medium' from ai_agents;
