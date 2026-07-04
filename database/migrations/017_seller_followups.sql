create table if not exists dynasty.seller_followups (
  id text primary key,
  conversation_id text not null references dynasty.seller_conversations(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  followup_date timestamp(3) not null,
  followup_type text not null default 'CALL',
  assigned_to text,
  status text not null default 'OPEN',
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists seller_followups_conversation_id_idx on dynasty.seller_followups(conversation_id);
create index if not exists seller_followups_property_id_idx on dynasty.seller_followups(property_id);
create index if not exists seller_followups_user_id_idx on dynasty.seller_followups(user_id);
create index if not exists seller_followups_user_status_idx on dynasty.seller_followups(user_id, status);
create index if not exists seller_followups_user_date_idx on dynasty.seller_followups(user_id, followup_date);

-- Supabase public schema variant:
--
-- create table public.seller_followups (
--   id uuid primary key default gen_random_uuid(),
--   conversation_id uuid not null references public.seller_conversations(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   followup_date timestamptz not null,
--   followup_type text default 'CALL',
--   assigned_to text,
--   status text default 'OPEN',
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.seller_followups enable row level security;
--
-- create policy "Users can manage their own seller followups"
-- on public.seller_followups for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
