# Security Audit Policy

## Scope

This policy records dependency advisories that are temporarily accepted due to upstream framework compatibility constraints, along with required re-check triggers.

## Current Accepted Residual Advisory

- Package: `starlette`
- Installed version: `0.49.1`
- Advisory ID: `PYSEC-2026-161`
- Reported fixed version: `starlette==1.0.1`
- Status: Accepted temporarily

## Acceptance Rationale

Current backend framework compatibility is pinned to FastAPI releases that do not yet support Starlette 1.x in this project baseline. Forcing `starlette==1.0.1` now would introduce dependency incompatibility risk.

## Auto-Remediation Trigger

Auto-remediate this advisory immediately when both conditions are true:

1. A stable FastAPI release in use by this repository supports Starlette 1.x.
2. Full project verification passes after upgrade:
   - `scripts\\verify_all.bat`
   - `scripts\\verify_all.ps1`
   - `python -m pip_audit`

## Remediation Procedure

1. Update `backend/requirements.txt` to a FastAPI version that supports Starlette 1.x.
2. Set `starlette==1.0.1` (or newer fixed version).
3. Reinstall dependencies.
4. Run project verification scripts and `pip_audit`.
5. Remove this accepted residual entry once audit is clean.

## Ownership and Review

- Owner: Backend maintainers
- Review cadence: On every dependency upgrade and at least once per release cycle
- Last reviewed: 2026-05-30
