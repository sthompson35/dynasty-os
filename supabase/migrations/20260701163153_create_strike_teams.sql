-- Migration: 20260701163153_create_strike_teams.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

create table strike_teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null unique,
  mission text,
  member_agent_names text[] not null,
  created_at timestamptz default now()
);
alter table strike_teams enable row level security;

insert into strike_teams (team_name, mission, member_agent_names) values
('Real Estate Strike Team', 'Acquire, analyze, finance, improve, and profit from assets.', array['DealHawk','Trooper_Charlie','Atlas','LedgerMind']),
('Capital Formation Team', 'Attract capital, demonstrate performance, and scale investment capacity.', array['LedgerMind','Edison','ChainCore','CineFrame']),
('KhakiSol Growth Team', 'Build a profitable and scalable commerce engine.', array['KhakiOps','AutoForge','Edison','HypeRep']),
('Web3 Development Team', 'Build the decentralized infrastructure layer for future Dynasty initiatives.', array['ChainCore','AutoForge','CINA']),
('Media & Influence Team', 'Control attention through compelling content and storytelling.', array['CineFrame','HypeRep','Edison']);

-- give every command-layer agent an infra board row too, matching the pattern set for the original 7
insert into agent_board_items (agent_id, category, platform, title, status, priority)
select id, 'task', 'other', agent_name || ' - onboarded to Dynasty OS command structure', 'done', 'low'
from ai_agents
where agent_name in ('Adam','Atlas','Trooper_Alpha','Trooper_Charlie','Edison','Helix','CINA','Watcher','Listener','Orchestrator');
