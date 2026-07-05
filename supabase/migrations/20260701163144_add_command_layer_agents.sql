-- Migration: 20260701163144_add_command_layer_agents.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

insert into ai_agents (agent_name, agent_role, status) values
('Adam', 'Executive Command Authority - resource allocation, alignment, priorities', 'active'),
('Atlas', 'Operations & Scale - systems, execution, infrastructure, org growth', 'active'),
('Trooper_Alpha', 'Long-Range Strategy - expansion pathways, market positioning', 'active'),
('Trooper_Charlie', 'Deal Intelligence & Underwriting - risk, profitability, exit strategy', 'active'),
('Edison', 'Monetization & Innovation - products, pricing, revenue streams', 'active'),
('Helix', 'Knowledge Systems - SOPs, training, onboarding, institutional memory', 'active'),
('CINA', 'Research & Intelligence - analysis, synthesis, situational awareness', 'active'),
('Watcher', 'Systems Monitoring - trends, anomalies, risk detection', 'active'),
('Listener', 'Signal Monitoring - conversations, feedback, opportunities', 'active'),
('Orchestrator', 'Cross-System Coordination - routing info between agents/teams', 'active');
