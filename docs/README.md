# Dynasty PropertyOS: Supabase + Blender Starter Kit

This starter kit contains:

## Product direction

- [Product vision](PRODUCT_VISION.md)
- [Master build plan](PROPERTYOS_MASTER_BUILD_PLAN.md)
- [Security audit policy](SECURITY_AUDIT_POLICY.md)
- [Acquisition Intelligence + Underwriting Integrity baseline](ACQUISITION_INTELLIGENCE_BASELINE.md) — verified state as of `v1.3.0`

1. `supabase/migrations/001_dynasty_propertyos_schema.sql`  
   Full database foundation for properties, plans, digital twins, rooms, components, materials, MEP, rehab, investor analytics, accounting, lender/appraiser/PM workflows, Web3 passports, and AI agent runs.

2. `blender/scripts/propertyos_blender_starter.py`  
   Blender Python script that creates a functional starter digital twin: rooms, floors, walls, gable roof, starter doors/windows, labels, camera, and light.

3. `blender/scripts/material_swap_from_db_export.py`  
   Applies material changes from a JSON export, simulating what Supabase will send to Blender.

4. `blender/scripts/export_glb.py`  
   Exports the Blender scene to GLB for web viewers.

## Suggested Supabase install

```bash
supabase db reset
# or run the SQL migration in the Supabase SQL editor
```

## Suggested Blender run

```bash
blender --python blender/scripts/propertyos_blender_starter.py
```

## Production path

Phase 1: migrate schema and generate reference Blender model.  
Phase 2: connect Supabase records to Blender through a Python service.  
Phase 3: export GLB to web app with Three.js viewer.  
Phase 4: connect accounting/job costing and investor report generation.  
Phase 5: add optional Web3 property passport hashes.
