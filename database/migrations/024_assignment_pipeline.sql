create table if not exists dynasty.assignment_pipeline (
  id text primary key,
  deal_id text not null references dynasty."Deal"(id) on delete cascade,
  package_id text not null references dynasty.disposition_packages(id) on delete cascade,
  buyer_profile_id text not null references dynasty.buyer_profiles(id) on delete cascade,
  buyer_match_id text references dynasty.buyer_matches(id) on delete set null,
  user_id text not null references dynasty."User"(id) on delete cascade,
  stage text not null default 'CONTRACT_SENT',
  assignment_fee numeric(14, 2),
  contract_date timestamp(3),
  due_diligence_deadline timestamp(3),
  emd_received boolean not null default false,
  notes text,
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists assignment_pipeline_deal_id_idx on dynasty.assignment_pipeline(deal_id);
create index if not exists assignment_pipeline_package_id_idx on dynasty.assignment_pipeline(package_id);
create index if not exists assignment_pipeline_buyer_profile_id_idx on dynasty.assignment_pipeline(buyer_profile_id);
create index if not exists assignment_pipeline_buyer_match_id_idx on dynasty.assignment_pipeline(buyer_match_id);
create index if not exists assignment_pipeline_user_id_idx on dynasty.assignment_pipeline(user_id);
create index if not exists assignment_pipeline_user_stage_idx on dynasty.assignment_pipeline(user_id, stage);

-- Supabase public schema variant:
--
-- create table public.assignment_pipeline (
--   id uuid primary key default gen_random_uuid(),
--   deal_id uuid not null references public.deals(id) on delete cascade,
--   package_id uuid not null references public.disposition_packages(id) on delete cascade,
--   buyer_profile_id uuid not null references public.buyer_profiles(id) on delete cascade,
--   buyer_match_id uuid references public.buyer_matches(id) on delete set null,
--   user_id uuid references auth.users(id) on delete cascade,
--   stage text default 'CONTRACT_SENT',
--   assignment_fee numeric(14, 2),
--   contract_date timestamptz,
--   due_diligence_deadline timestamptz,
--   emd_received boolean default false,
--   notes text,
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.assignment_pipeline enable row level security;
--
-- create policy "Users can manage their own assignment pipeline"
-- on public.assignment_pipeline for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
