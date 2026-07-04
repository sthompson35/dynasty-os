create table if not exists dynasty.skip_trace_export_queue (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  owner_artifact_id text not null references dynasty.owner_intelligence_artifacts(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  property_address text not null,
  mailing_address text,
  absentee_owner boolean not null default false,
  vacancy_signal boolean not null default false,
  equity_signal decimal(14,2),
  priority integer not null,
  recommended_channel text not null,
  status text not null default 'READY',
  evidence jsonb not null default '{}',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists skip_trace_export_queue_user_property_key on dynasty.skip_trace_export_queue(user_id, property_id);
create index if not exists skip_trace_export_queue_property_id_idx on dynasty.skip_trace_export_queue(property_id);
create index if not exists skip_trace_export_queue_owner_artifact_id_idx on dynasty.skip_trace_export_queue(owner_artifact_id);
create index if not exists skip_trace_export_queue_user_id_idx on dynasty.skip_trace_export_queue(user_id);
create index if not exists skip_trace_export_queue_user_channel_idx on dynasty.skip_trace_export_queue(user_id, recommended_channel);
create index if not exists skip_trace_export_queue_user_status_idx on dynasty.skip_trace_export_queue(user_id, status);
create index if not exists skip_trace_export_queue_user_priority_idx on dynasty.skip_trace_export_queue(user_id, priority);

-- Supabase public schema variant:
--
-- create table public.skip_trace_export_queue (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   owner_artifact_id uuid not null references public.owner_intelligence_artifacts(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   property_address text not null,
--   mailing_address text,
--   absentee_owner boolean default false,
--   vacancy_signal boolean default false,
--   equity_signal numeric,
--   priority integer not null,
--   recommended_channel text not null,
--   status text default 'READY',
--   evidence jsonb default '{}',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (user_id, property_id)
-- );
--
-- alter table public.skip_trace_export_queue enable row level security;
--
-- create policy "Users can manage their own skip trace export queue"
-- on public.skip_trace_export_queue for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
