# Database Module - Dynasty PropertyOS

Database schemas, migrations, seed data, and reporting artifacts for Dynasty PropertyOS.

## Purpose

The database module defines the shared data backbone for platform workflows, including property operations, investor analysis, and supporting business processes.

## Key Folders

- `migrations/` schema migrations
- `seeds/` seed data
- `schemas/` schema references
- `reports/` generated reporting artifacts
- `backups/` backup files

## Current Migration and Seed

- Migration: `migrations/001_dynasty_propertyos_schema.sql`
- Seed: `seeds/seed_usda_1bedroom.sql`

## Using Supabase CLI

From repository root:

```bash
supabase db reset
```

This applies migrations and seed files in the expected order.

## Manual SQL Application

You can also run SQL files directly in Supabase SQL Editor or PostgreSQL tooling:

1. Apply migration file first.
2. Apply seed file second.

## Notes

- Keep migrations additive and versioned.
- Avoid editing historical migration files after shared usage.
- Prefer new migration files for changes to preserve reproducibility.
