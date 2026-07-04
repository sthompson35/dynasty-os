create table if not exists dynasty.campaign_batches (
  id text primary key,
  user_id text not null references dynasty."User"(id) on delete cascade,
  name text not null,
  campaign_type text not null,
  status text not null default 'DRAFT',
  scheduled_date timestamp(3),
  total_items integer not null default 0,
  completed_items integer not null default 0,
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create table if not exists dynasty.campaign_items (
  id text primary key,
  batch_id text not null references dynasty.campaign_batches(id) on delete cascade,
  queue_item_id text not null references dynasty.lead_action_queue(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  campaign_type text not null,
  status text not null default 'READY',
  priority integer not null,
  artifact jsonb not null default '{}',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists campaign_batches_user_id_idx on dynasty.campaign_batches(user_id);
create index if not exists campaign_batches_user_campaign_type_idx on dynasty.campaign_batches(user_id, campaign_type);
create index if not exists campaign_batches_user_status_idx on dynasty.campaign_batches(user_id, status);
create index if not exists campaign_batches_user_scheduled_date_idx on dynasty.campaign_batches(user_id, scheduled_date);

create unique index if not exists campaign_items_batch_queue_item_key on dynasty.campaign_items(batch_id, queue_item_id);
create index if not exists campaign_items_batch_id_idx on dynasty.campaign_items(batch_id);
create index if not exists campaign_items_queue_item_id_idx on dynasty.campaign_items(queue_item_id);
create index if not exists campaign_items_property_id_idx on dynasty.campaign_items(property_id);
create index if not exists campaign_items_user_id_idx on dynasty.campaign_items(user_id);
create index if not exists campaign_items_user_campaign_type_idx on dynasty.campaign_items(user_id, campaign_type);
create index if not exists campaign_items_user_status_idx on dynasty.campaign_items(user_id, status);

-- Supabase public schema variant:
--
-- create table public.campaign_batches (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid references auth.users(id) on delete cascade,
--   name text not null,
--   campaign_type text not null,
--   status text not null default 'DRAFT',
--   scheduled_date timestamptz,
--   total_items integer not null default 0,
--   completed_items integer not null default 0,
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- create table public.campaign_items (
--   id uuid primary key default gen_random_uuid(),
--   batch_id uuid not null references public.campaign_batches(id) on delete cascade,
--   queue_item_id uuid not null references public.lead_action_queue(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   campaign_type text not null,
--   status text not null default 'READY',
--   priority integer not null,
--   artifact jsonb not null default '{}',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (batch_id, queue_item_id)
-- );
--
-- alter table public.campaign_batches enable row level security;
-- alter table public.campaign_items enable row level security;
--
-- create policy "Users can manage their own campaign batches"
-- on public.campaign_batches for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
--
-- create policy "Users can manage their own campaign items"
-- on public.campaign_items for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
