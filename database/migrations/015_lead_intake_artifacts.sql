create table if not exists dynasty.lead_intake_artifacts (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  deal_id text references dynasty."Deal"(id) on delete set null,
  owner_name text,
  contact_name text,
  phone text,
  email text,
  contact_date timestamp(3),
  lead_source text not null default 'CALL_CAMPAIGN',
  motivation_score integer not null default 0,
  asking_price numeric(14, 2),
  occupancy_status text,
  timeline text,
  pain_points text[] not null default '{}',
  notes text,
  status text not null default 'NEW',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create index if not exists lead_intake_artifacts_property_id_idx on dynasty.lead_intake_artifacts(property_id);
create index if not exists lead_intake_artifacts_user_id_idx on dynasty.lead_intake_artifacts(user_id);
create index if not exists lead_intake_artifacts_deal_id_idx on dynasty.lead_intake_artifacts(deal_id);
create index if not exists lead_intake_artifacts_user_status_idx on dynasty.lead_intake_artifacts(user_id, status);
create index if not exists lead_intake_artifacts_user_motivation_idx on dynasty.lead_intake_artifacts(user_id, motivation_score);
create index if not exists lead_intake_artifacts_user_contact_date_idx on dynasty.lead_intake_artifacts(user_id, contact_date);

-- Supabase public schema variant:
--
-- create table public.lead_intake_artifacts (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   deal_id uuid references public.deals(id) on delete set null,
--   owner_name text,
--   contact_name text,
--   phone text,
--   email text,
--   contact_date timestamptz,
--   lead_source text default 'CALL_CAMPAIGN',
--   motivation_score integer default 0,
--   asking_price numeric(14, 2),
--   occupancy_status text,
--   timeline text,
--   pain_points text[] default '{}',
--   notes text,
--   status text default 'NEW',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now()
-- );
--
-- alter table public.lead_intake_artifacts enable row level security;
--
-- create policy "Users can manage their own lead intake artifacts"
-- on public.lead_intake_artifacts for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
