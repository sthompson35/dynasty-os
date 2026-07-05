-- Migration: 20260701141415_seed_dynasty_os_agents.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

insert into ai_agents (agent_name, agent_role, status) values
('DealHawk', 'Real Estate - Deal Sourcing (Wholesaling/Fix-Flip/Land)', 'active'),
('LedgerMind', 'Real Estate/KhakiSol - Bookkeeping & Financial Analysis', 'active'),
('KhakiOps', 'KhakiSol - Shopify Catalog & Fulfillment Ops', 'active'),
('AutoForge', 'KhakiSol - n8n Automation & Backend Orchestration', 'active'),
('HypeRep', 'Music - Promotion & Content Growth (Cassidy)', 'active'),
('ChainCore', 'Web3 - stllcweb3 Smart Contracts & Deployment', 'active'),
('CineFrame', 'Film - Production Packages & AI Video Workflow', 'active');
