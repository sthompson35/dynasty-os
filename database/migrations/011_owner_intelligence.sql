create table if not exists dynasty.owner_intelligence_artifacts (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  owner_name text,
  mailing_address text,
  owner_type text not null default 'UNKNOWN',
  absentee_owner boolean not null default false,
  years_owned double precision,
  equity_estimate decimal(14,2),
  vacancy_indicator boolean not null default false,
  contact_confidence integer not null default 0,
  phones jsonb not null default '[]',
  emails jsonb not null default '[]',
  source text not null default 'PROPERTY_NOTES',
  evidence jsonb not null default '{}',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3) not null default current_timestamp
);

create unique index if not exists owner_intelligence_user_property_key on dynasty.owner_intelligence_artifacts(user_id, property_id);
create index if not exists owner_intelligence_property_id_idx on dynasty.owner_intelligence_artifacts(property_id);
create index if not exists owner_intelligence_user_id_idx on dynasty.owner_intelligence_artifacts(user_id);
create index if not exists owner_intelligence_user_absentee_idx on dynasty.owner_intelligence_artifacts(user_id, absentee_owner);
create index if not exists owner_intelligence_user_vacancy_idx on dynasty.owner_intelligence_artifacts(user_id, vacancy_indicator);
create index if not exists owner_intelligence_user_confidence_idx on dynasty.owner_intelligence_artifacts(user_id, contact_confidence);

-- Supabase public schema variant:
--
-- create table public.owner_intelligence_artifacts (
--   id uuid primary key default gen_random_uuid(),
--   property_id uuid not null references public.properties(id) on delete cascade,
--   user_id uuid references auth.users(id) on delete cascade,
--   owner_name text,
--   mailing_address text,
--   owner_type text default 'UNKNOWN',
--   absentee_owner boolean default false,
--   years_owned numeric,
--   equity_estimate numeric,
--   vacancy_indicator boolean default false,
--   contact_confidence integer default 0,
--   phones jsonb default '[]',
--   emails jsonb default '[]',
--   source text default 'PROPERTY_NOTES',
--   evidence jsonb default '{}',
--   created_at timestamptz default now(),
--   updated_at timestamptz default now(),
--   unique (user_id, property_id)
-- );
--
-- alter table public.owner_intelligence_artifacts enable row level security;
--
-- create policy "Users can manage their own owner intelligence artifacts"
-- on public.owner_intelligence_artifacts for all
-- using (auth.uid() = user_id)
-- with check (auth.uid() = user_id);
