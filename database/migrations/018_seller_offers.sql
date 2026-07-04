create table if not exists dynasty.seller_offers (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  deal_id text not null references dynasty."Deal"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  offer_amount numeric(14, 2) not null,
  offer_type text not null default 'CASH',
  sent_date timestamp(3),
  expiration_date timestamp(3),
  status text not null default 'DRAFT',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists seller_offers_property_id_idx on dynasty.seller_offers(property_id);
create index if not exists seller_offers_deal_id_idx on dynasty.seller_offers(deal_id);
create index if not exists seller_offers_user_id_idx on dynasty.seller_offers(user_id);
create index if not exists seller_offers_user_status_idx on dynasty.seller_offers(user_id, status);
create index if not exists seller_offers_user_sent_idx on dynasty.seller_offers(user_id, sent_date);

-- Supabase public schema variant:
--
-- create table public.seller_offers (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   deal_id uuid not null references public.deals(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   offer_amount numeric(14, 2) not null,
--   offer_type text default 'CASH',
--   sent_date timestamptz,
--   expiration_date timestamptz,
--   status text default 'DRAFT',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.seller_offers enable row level security;
--
-- create policy "Users can manage their own seller offers"
-- on public.seller_offers for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
