-- Migration: 028_property_activity.sql
-- Investment Intelligence Slice 3 ("what changed that I need to pay
-- attention to?"). A small, user-facing activity stream - not an audit log,
-- not event sourcing. Only records changes that affect an acquisition
-- decision, not every CRUD write.

create table if not exists dynasty.property_activity (
  id text primary key,
  property_id text not null references dynasty."Property"(id) on delete cascade,
  user_id text not null references dynasty."User"(id) on delete cascade,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamp(3) not null default current_timestamp
);

create index if not exists property_activity_user_id_idx on dynasty.property_activity(user_id);
create index if not exists property_activity_user_id_created_at_idx on dynasty.property_activity(user_id, created_at);
create index if not exists property_activity_property_id_idx on dynasty.property_activity(property_id);
