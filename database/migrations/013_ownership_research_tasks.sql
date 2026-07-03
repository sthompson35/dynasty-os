create table if not exists dynasty.ownership_research_tasks (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  skip_trace_queue_id text not null references dynasty.skip_trace_export_queue(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  property_address text not null,
  mailing_address text,
  county text,
  source_priority integer not null default 50,
  research_status text not null default 'READY',
  research_reason text not null,
  recommended_source text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists ownership_research_tasks_user_property_key on dynasty.ownership_research_tasks(user_id, property_id);
create index if not exists ownership_research_tasks_property_id_idx on dynasty.ownership_research_tasks(property_id);
create index if not exists ownership_research_tasks_skip_trace_queue_id_idx on dynasty.ownership_research_tasks(skip_trace_queue_id);
create index if not exists ownership_research_tasks_user_id_idx on dynasty.ownership_research_tasks(user_id);
create index if not exists ownership_research_tasks_user_county_idx on dynasty.ownership_research_tasks(user_id, county);
create index if not exists ownership_research_tasks_user_status_idx on dynasty.ownership_research_tasks(user_id, research_status);
create index if not exists ownership_research_tasks_user_priority_idx on dynasty.ownership_research_tasks(user_id, source_priority);

-- Supabase public schema variant:
--
-- create table public.ownership_research_tasks (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   skip_trace_queue_id uuid not null references public.skip_trace_export_queue(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   property_address text not null,
--   mailing_address text,
--   county text,
--   source_priority integer default 50,
--   research_status text default 'READY',
--   research_reason text not null,
--   recommended_source text not null,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (user_id, property_id)
-- );
--
-- alter table public.ownership_research_tasks enable row level security;
--
-- create policy "Users can manage their own ownership research tasks"
-- on public.ownership_research_tasks for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
