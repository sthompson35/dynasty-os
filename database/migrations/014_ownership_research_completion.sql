alter table dynasty.ownership_research_tasks
  add column if not exists recovered_owner_name text,
  add column if not exists confidence integer,
  add column if not exists source_url text,
  add column if not exists research_notes text,
  add column if not exists completed_at timestamp(3);

-- Supabase public schema variant:
--
-- alter table public.ownership_research_tasks
--   add column if not exists recovered_owner_name text,
--   add column if not exists confidence integer,
--   add column if not exists source_url text,
--   add column if not exists research_notes text,
--   add column if not exists completed_at timestamptz;
