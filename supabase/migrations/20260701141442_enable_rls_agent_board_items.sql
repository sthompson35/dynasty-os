-- Migration: 20260701141442_enable_rls_agent_board_items.sql
-- Reconstructed from supabase_migrations.schema_migrations (already applied to
-- the remote project) to close migration-history drift; not a new schema change.

alter table agent_board_items enable row level security;
