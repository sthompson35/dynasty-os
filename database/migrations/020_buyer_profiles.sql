create table if not exists dynasty.buyer_profiles (
  id text primary key,
  user_id text not null references dynasty."User"(id) on delete cascade,
  name text not null,
  entity text,
  email text,
  phone text,
  buyer_type text not null default 'CASH',
  funding_verified boolean not null default false,
  funding_capacity numeric(14, 2),
  close_speed_days integer,
  deals_closed_count integer not null default 0,
  rating integer not null default 0,
  status text not null default 'ACTIVE',
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists buyer_profiles_user_id_idx on dynasty.buyer_profiles(user_id);
create index if not exists buyer_profiles_user_status_idx on dynasty.buyer_profiles(user_id, status);
create index if not exists buyer_profiles_user_type_idx on dynasty.buyer_profiles(user_id, buyer_type);

-- Supabase public schema variant:
--
-- create table public.buyer_profiles (
--   id uuid primary key default gen_random_uuid(),
--   user_id uuid references auth.users(id) on delete cascade,
--   name text not null,
--   entity text,
--   email text,
--   phone text,
--   buyer_type text default 'CASH',
--   funding_verified boolean default false,
--   funding_capacity numeric(14, 2),
--   close_speed_days integer,
--   deals_closed_count integer default 0,
--   rating integer default 0,
--   status text default 'ACTIVE',
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.buyer_profiles enable row level security;
--
-- create policy "Users can manage their own buyer profiles"
-- on public.buyer_profiles for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
