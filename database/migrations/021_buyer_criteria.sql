create table if not exists dynasty.buyer_criteria (
  id text primary key,
  buyer_profile_id text not null references dynasty.buyer_profiles(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  property_types text[] not null default '{}',
  exit_strategies text[] not null default '{}',
  markets text[] not null default '{}',
  min_price numeric(14, 2),
  max_price numeric(14, 2),
  min_arv numeric(14, 2),
  max_capital numeric(14, 2),
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists buyer_criteria_buyer_profile_id_idx on dynasty.buyer_criteria(buyer_profile_id);
create index if not exists buyer_criteria_user_id_idx on dynasty.buyer_criteria(user_id);

-- Supabase public schema variant:
--
-- create table public.buyer_criteria (
--   id uuid primary key default gen_random_uuid(),
--   buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   property_types text[] default '{}',
--   exit_strategies text[] default '{}',
--   markets text[] default '{}',
--   min_price numeric(14, 2),
--   max_price numeric(14, 2),
--   min_arv numeric(14, 2),
--   max_capital numeric(14, 2),
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.buyer_criteria enable row level security;
--
-- create policy "Users can manage their own buyer criteria"
-- on public.buyer_criteria for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
