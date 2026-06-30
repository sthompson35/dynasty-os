# Frontend - Dynasty PropertyOS

Next.js application for the Dynasty PropertyOS command center, role portals, and 3D walkthrough views.

## Purpose

The frontend provides:

- Command center landing page
- Role-specific portal routes (investor, appraiser, contractor, lender, property manager)
- 3D model and walkthrough views via React Three Fiber

Main app entrypoint: `app/page.tsx`

## Stack

- Node.js 22+
- Next.js
- React
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei

Dependencies and scripts are defined in `package.json`.

## Setup

From repository root:

```bash
cd frontend
npm install
```

## Run (Development)

```bash
npm run dev
```

Default local URL:

- `http://127.0.0.1:3000`

## Build and Type Check

- Type check (configured as lint script):

```bash
npm run lint
```

- Production build:

```bash
npm run build
```

- Production start:

```bash
npm run start
```

## Environment

Frontend uses `frontend/.env.local`.

Important keys:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Routes

Current primary routes:

- `/`
- `/investor`
- `/appraiser`
- `/contractor`
- `/lender`
- `/property-manager`
- `/walkthrough`

## Verify With Full Workspace Checks

From repo root:

```powershell
./scripts/verify_all.ps1
```

or

```bat
scripts\verify_all.bat
```
