create table if not exists dynasty.lead_action_queue (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  deal_score_id text not null references dynasty.deal_scores(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  action_type text not null,
  priority integer not null,
  status text not null default 'OPEN',
  assigned_to text,
  next_action_date timestamp(3),
  reason text not null,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists lead_action_queue_user_property_key on dynasty.lead_action_queue(user_id, property_id);
create index if not exists lead_action_queue_property_id_idx on dynasty.lead_action_queue(property_id);
create index if not exists lead_action_queue_deal_score_id_idx on dynasty.lead_action_queue(deal_score_id);
create index if not exists lead_action_queue_user_id_idx on dynasty.lead_action_queue(user_id);
create index if not exists lead_action_queue_user_action_type_idx on dynasty.lead_action_queue(user_id, action_type);
create index if not exists lead_action_queue_user_status_idx on dynasty.lead_action_queue(user_id, status);
create index if not exists lead_action_queue_user_priority_idx on dynasty.lead_action_queue(user_id, priority);
create index if not exists lead_action_queue_user_next_action_date_idx on dynasty.lead_action_queue(user_id, next_action_date);

-- Supabase public schema variant:
--
-- create table public.lead_action_queue (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   deal_score_id uuid not null references public.deal_scores(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   action_type text not null,
--   priority integer not null,
--   status text not null default 'OPEN',
--   assigned_to text,
--   next_action_date timestamptz,
--   reason text not null,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (user_id, property_id)
-- );
--
-- alter table public.lead_action_queue enable row level security;
--
-- create policy "Users can manage their own lead action queue"
-- on public.lead_action_queue for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
