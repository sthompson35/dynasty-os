create table if not exists dynasty.seller_conversations (
  id text primary key,
  lead_intake_id text not null references dynasty.lead_intake_artifacts(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  conversation_type text not null default 'CALL',
  summary text not null,
  objections text[] not null default '{}',
  motivation_changes text,
  next_step text,
  recorded_at timestamp(3) not null default current_timestamp,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists seller_conversations_lead_intake_id_idx on dynasty.seller_conversations(lead_intake_id);
create index if not exists seller_conversations_property_id_idx on dynasty.seller_conversations(property_id);
create index if not exists seller_conversations_user_id_idx on dynasty.seller_conversations(user_id);
create index if not exists seller_conversations_user_type_idx on dynasty.seller_conversations(user_id, conversation_type);
create index if not exists seller_conversations_user_recorded_idx on dynasty.seller_conversations(user_id, recorded_at);

-- Supabase public schema variant:
--
-- create table public.seller_conversations (
--   id uuid primary key default gen_random_uuid(),
--   lead_intake_id uuid not null references public.lead_intake_artifacts(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   conversation_type text default 'CALL',
--   summary text not null,
--   objections text[] default '{}',
--   motivation_changes text,
--   next_step text,
--   recorded_at timestamptz default now(),
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.seller_conversations enable row level security;
--
-- create policy "Users can manage their own seller conversations"
-- on public.seller_conversations for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
