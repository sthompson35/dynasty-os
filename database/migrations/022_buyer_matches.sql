create table if not exists dynasty.buyer_matches (
  id text primary key,
  deal_id text not null references dynasty."Deal"(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  buyer_profile_id text not null references dynasty.buyer_profiles(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  match_score integer not null,
  match_reasons jsonb not null default '[]',
  status text not null default 'SUGGESTED',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists buyer_matches_deal_buyer_key on dynasty.buyer_matches(deal_id, buyer_profile_id);
create index if not exists buyer_matches_deal_id_idx on dynasty.buyer_matches(deal_id);
create index if not exists buyer_matches_property_id_idx on dynasty.buyer_matches(property_id);
create index if not exists buyer_matches_buyer_profile_id_idx on dynasty.buyer_matches(buyer_profile_id);
create index if not exists buyer_matches_user_id_idx on dynasty.buyer_matches(user_id);
create index if not exists buyer_matches_user_status_idx on dynasty.buyer_matches(user_id, status);
create index if not exists buyer_matches_user_score_idx on dynasty.buyer_matches(user_id, match_score);

-- Supabase public schema variant:
--
-- create table public.buyer_matches (
--   id uuid primary key default gen_random_uuid(),
--   deal_id uuid not null references public.deals(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   match_score integer not null,
--   match_reasons jsonb default '[]',
--   status text default 'SUGGESTED',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (deal_id, buyer_profile_id)
-- );
--
-- alter table public.buyer_matches enable row level security;
--
-- create policy "Users can manage their own buyer matches"
-- on public.buyer_matches for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
