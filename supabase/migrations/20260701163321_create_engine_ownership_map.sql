-- Migration: 20260701163321_create_engine_ownership_map.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

create table engines (
  id uuid primary key default gen_random_uuid(),
  engine_name text not null unique,
  owner_agent_id uuid references ai_agents(id),
  supporting_agent_names text[] default '{}',
  description text,
  status text not null default 'building' check (status in ('planning','building','live','blocked')),
  created_at timestamptz default now()
);
alter table engines enable row level security;

insert into engines (engine_name, owner_agent_id, supporting_agent_names, description, status)
select 'Lead Engine', id, array['CINA','Watcher'], 'Sourcing seller leads, distressed assets, wholesale and land opportunities.', 'live' from ai_agents where agent_name='DealHawk'
union all
select 'Deal Engine', id, array['DealHawk','Trooper_Alpha'], 'Underwriting, risk analysis, profitability scoring before capital commitment.', 'live' from ai_agents where agent_name='Trooper_Charlie'
union all
select 'Capital Engine', id, array['Edison','ChainCore','CineFrame'], 'Capital formation, investor-facing performance reporting, fundraising readiness.', 'building' from ai_agents where agent_name='LedgerMind'
union all
select 'Operations Engine', id, array['LedgerMind','AutoForge'], 'Turning working processes into repeatable, scaled systems across all divisions.', 'live' from ai_agents where agent_name='Atlas'
union all
select 'Build Engine', id, array['Atlas','KhakiOps'], 'Automation of workflows, integrations, n8n pipelines, technical execution.', 'building' from ai_agents where agent_name='AutoForge'
union all
select 'Investor Engine', id, array['LedgerMind','Edison'], 'Investor presentations, cinematic storytelling, property showcase assets.', 'building' from ai_agents where agent_name='CineFrame'
union all
select 'Disposition Engine', id, array['DealHawk'], 'Exit strategy execution - flips, wholesale assignment, land disposition.', 'planning' from ai_agents where agent_name='Trooper_Charlie'
union all
select 'Marketing Engine', id, array['CineFrame','Edison'], 'Brand amplification, campaign reach, music and content promotion.', 'live' from ai_agents where agent_name='HypeRep'
union all
select 'Web3 Engine', id, array['AutoForge','CINA'], 'stllcweb3 contract suite, tokenization infrastructure, security audits.', 'blocked' from ai_agents where agent_name='ChainCore'
union all
select 'Intelligence Engine', id, array['Trooper_Alpha','Trooper_Charlie','Edison'], 'Research synthesis and situational awareness feeding strategy and deals.', 'live' from ai_agents where agent_name='CINA';
