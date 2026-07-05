# Migration history notes

`001_dynasty_propertyos_schema.sql` through `007_property_intelligence.sql` predate
this project's use of Supabase's migration tracking. They were applied directly
against the remote database and are not recorded in
`supabase_migrations.schema_migrations`, unlike everything from
`20260701141415_seed_dynasty_os_agents.sql` onward, which uses the CLI's
`YYYYMMDDHHMMSS_name.sql` convention and matches the remote ledger exactly.

If you're provisioning a fresh environment or restoring from scratch, run
`001`–`007` first, manually, before `supabase db push` — they define the core
`properties`/`leads`/`deals`/`investors`/`projects`/`buyers` schema everything
else depends on.
