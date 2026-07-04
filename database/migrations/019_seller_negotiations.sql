create table if not exists dynasty.seller_negotiations (
  id text primary key,
  offer_id text not null references dynasty.seller_offers(id) on delete cascade,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  counter_amount numeric(14, 2),
  seller_response text,
  negotiation_stage text not null default 'OPEN',
  resolution text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists seller_negotiations_offer_id_idx on dynasty.seller_negotiations(offer_id);
create index if not exists seller_negotiations_property_id_idx on dynasty.seller_negotiations(property_id);
create index if not exists seller_negotiations_user_id_idx on dynasty.seller_negotiations(user_id);
create index if not exists seller_negotiations_user_stage_idx on dynasty.seller_negotiations(user_id, negotiation_stage);

-- Supabase public schema variant:
--
-- create table public.seller_negotiations (
--   id uuid primary key default gen_random_uuid(),
--   offer_id uuid not null references public.seller_offers(id) on delete cascade,
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   counter_amount numeric(14, 2),
--   seller_response text,
--   negotiation_stage text default 'OPEN',
--   resolution text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.seller_negotiations enable row level security;
--
-- create policy "Users can manage their own seller negotiations"
-- on public.seller_negotiations for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
