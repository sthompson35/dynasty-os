# Dynasty PropertyOS Product Vision

## Vision

Dynasty PropertyOS is the all-in-one operating system for real estate agents, investors, builders, lenders, appraisers, and property operators. The platform should give a user the best tools they could reasonably have at their disposal: property intelligence, strategy selection, blueprint generation, digital-twin presentation, financial analysis, deal execution, and operations management in one connected web app.

The core idea is simple: take any property, plan, or investment strategy and turn it into a visual, financial, and operational decision system that can be used from anywhere.

## North Star

A user should be able to upload an existing blueprint, import property data, or start from a blank development idea, then generate a structured property model with Blender and Python scripting. From that model, the platform should produce an interactive virtual presentation, investor analysis, lender packet, contractor scope, appraisal support, and ongoing property management workflows.

## Product Pillars

### 1. Property Intelligence

- Import leads, owner data, parcel records, comps, taxes, zoning, and market signals.
- Score deals for investor strategy fit.
- Track owner outreach, negotiations, notes, documents, and follow-ups.
- Support agents, wholesalers, land investors, buy-and-hold investors, and developers.

### 2. Blueprint And Digital Twin Engine

- Accept existing blueprints and structured room data.
- Generate new building concepts from templates and user inputs.
- Use Blender Python scripts as the modeling engine.
- Export GLB, walkthrough manifests, renders, schedules, and model metadata.
- Keep rooms, doors, windows, utilities, materials, and cost codes connected to the database.

### 3. Virtual Presentation Web App

- Present a property from anywhere through a browser-based walkthrough.
- Show investor, lender, contractor, appraiser, client, and property manager views.
- Support option packages, material swaps, room-by-room notes, and guided tours.
- Make the model useful for real conversations, not just visualization.

### 4. Strategy And Finance Engines

- Support land flipping, wholesaling, buy-and-hold, BRRRR, fix-and-flip, build-to-rent, new construction, multifamily, and commercial development.
- Generate underwriting outputs: purchase offer, rehab budget, construction budget, ARV, rent roll, DSCR, LTV, LTC, cash-on-cash, IRR, draw schedule, and exit scenarios.
- Connect financial assumptions to actual model quantities and scope items.

### 5. Execution And Operations

- Convert property strategy into task lists, contractor scopes, timelines, and draw packages.
- Track construction status, inspection items, maintenance, leases, and asset performance.
- Maintain a full property passport with source files, versions, model exports, decisions, financial assumptions, and operating history.

## Core User Journeys

1. Agent imports a lead list, scores opportunities, and prepares a buyer or seller presentation.
2. Investor uploads a property or parcel, selects a strategy, and receives underwriting plus a visual deal summary.
3. Builder starts from a template, generates a Blender model, exports a walkthrough, and produces contractor scopes.
4. Lender reviews a project package with budget, draw schedule, collateral model, and risk summary.
5. Property manager uses the digital twin to track rooms, systems, maintenance, leases, and asset condition.

## MVP Direction

The immediate product target should be one complete end-to-end flow:

1. Start with the USDA 1-bedroom prototype.
2. Keep the JSON room/building schema as the source of truth.
3. Generate the Blender model and GLB export.
4. Publish the walkthrough in the web app.
5. Attach investor underwriting and lender packet data.
6. Add role-specific views for investor, lender, contractor, appraiser, and property manager.

After that flow works cleanly, expand the same pipeline to land deals, duplexes, 4-plexes, apartment projects, commercial shells, and custom blueprint imports.

## Non-Negotiables

- The web app must be useful before it is flashy.
- Every model object should carry structured metadata.
- Every financial output should state its assumptions.
- Every generated package should be versioned and traceable.
- Blender is the visual engine, but the database schema is the source of truth.
- The platform should support real decisions: buy, hold, sell, build, refinance, lend, repair, manage, or walk away.

