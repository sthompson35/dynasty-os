create table if not exists dynasty.closing_tracker (
  id text primary key,
  deal_id text not null references dynasty."Deal"(id) on delete cascade,
  assignment_pipeline_id text not null references dynasty.assignment_pipeline(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  closing_date timestamp(3),
  title_company text,
  status text not null default 'SCHEDULED',
  final_amount numeric(14, 2),
  funds_received_date timestamp(3),
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists closing_tracker_deal_id_idx on dynasty.closing_tracker(deal_id);
create index if not exists closing_tracker_assignment_pipeline_id_idx on dynasty.closing_tracker(assignment_pipeline_id);
create index if not exists closing_tracker_user_id_idx on dynasty.closing_tracker(user_id);
create index if not exists closing_tracker_user_status_idx on dynasty.closing_tracker(user_id, status);

-- Supabase public schema variant:
--
-- create table public.closing_tracker (
--   id uuid primary key default gen_random_uuid(),
--   deal_id uuid not null references public.deals(id) on delete cascade,
--   assignment_pipeline_id uuid not null references public.assignment_pipeline(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   closing_date timestamptz,
--   title_company text,
--   status text default 'SCHEDULED',
--   final_amount numeric(14, 2),
--   funds_received_date timestamptz,
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.closing_tracker enable row level security;
--
-- create policy "Users can manage their own closing tracker"
-- on public.closing_tracker for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
