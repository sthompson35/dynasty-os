create table if not exists dynasty.disposition_packages (
  id text primary key,
  deal_id text not null references dynasty."Deal"(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  package_type text not null default 'WHOLESALE_ASSIGNMENT',
  asking_price numeric(14, 2),
  assignment_fee numeric(14, 2),
  description text,
  status text not null default 'DRAFT',
  distributed_at timestamp(3),
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists disposition_packages_user_deal_key on dynasty.disposition_packages(user_id, deal_id);
create index if not exists disposition_packages_deal_id_idx on dynasty.disposition_packages(deal_id);
create index if not exists disposition_packages_property_id_idx on dynasty.disposition_packages(property_id);
create index if not exists disposition_packages_user_id_idx on dynasty.disposition_packages(user_id);
create index if not exists disposition_packages_user_status_idx on dynasty.disposition_packages(user_id, status);

-- Supabase public schema variant:
--
-- create table public.disposition_packages (
--   id uuid primary key default gen_random_uuid(),
--   deal_id uuid not null references public.deals(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   package_type text default 'WHOLESALE_ASSIGNMENT',
--   asking_price numeric(14, 2),
--   assignment_fee numeric(14, 2),
--   description text,
--   status text default 'DRAFT',
--   distributed_at timestamptz,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (user_id, deal_id)
-- );
--
-- alter table public.disposition_packages enable row level security;
--
-- create policy "Users can manage their own disposition packages"
-- on public.disposition_packages for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
