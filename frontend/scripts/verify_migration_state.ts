// Migration Governance Gate.
//
// Confirms that every engine built this session is actually deployed, not just
// written: SQL migration exists -> Prisma schema declares it -> the table exists
// in Postgres -> its API route fails auth cleanly (proving it loads without a
// runtime crash) -> its dashboard query executes against real data.
//
// This exists because migrations 014-025 were written as SQL files, added to
// prisma/schema.prisma, and coded against in API routes/UI for an entire session
// before anyone noticed they had never been applied to the database. `prisma
// generate` only reads schema.prisma — it does not touch Postgres — so that gap
// was invisible until someone ran a query against a live connection.
//
// Usage:
//   npx tsx scripts/verify_migration_state.ts
//   npx tsx scripts/verify_migration_state.ts --base-url=http://localhost:3000
//
//   Production Migration Gate — run before any Railway deploy, against a
//   known-good local/CI DATABASE_URL with production as the read-only
//   comparison target. Never writes to --compare-url (see assertSelectOnly):
//   npx tsx scripts/verify_migration_state.ts --compare-url="$PROD_DATABASE_URL" --readonly
//
// Exit code is non-zero if any registered engine fails a gate, OR (when
// --compare-url is given) if the compare database is missing anything
// schema.prisma expects.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load .env.local first (Next.js dev convention), then .env as a fallback for
// anything still unset. dotenv never overrides a variable already in
// process.env, so a real CI-provided DATABASE_URL always wins over either file.
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");
const MIGRATIONS_DIR = path.join(__dirname, "..", "..", "database", "migrations");

// ─── Prisma schema parsing (lightweight, not a full grammar) ────────────────

type FieldInfo = { name: string; dbName: string };
type ModelInfo = { name: string; tableName: string; schemaName: string; fields: FieldInfo[]; indexGroups: string[][] };

function parseSchema(schemaPath: string): ModelInfo[] {
  const lines = fs.readFileSync(schemaPath, "utf8").split("\n");

  const modelNames = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^model\s+(\w+)\s*\{/);
    if (match) modelNames.add(match[1]);
  }

  const models: ModelInfo[] = [];
  let current: { name: string; body: string[] } | null = null;
  let depth = 0;

  for (const line of lines) {
    if (!current) {
      const match = line.match(/^model\s+(\w+)\s*\{/);
      if (match) {
        current = { name: match[1], body: [] };
        depth = 1;
      }
      continue;
    }
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth += opens - closes;
    if (depth <= 0) {
      models.push(buildModel(current, modelNames));
      current = null;
      continue;
    }
    current.body.push(line);
  }

  return models;
}

function buildModel(raw: { name: string; body: string[] }, modelNames: Set<string>): ModelInfo {
  let tableName = raw.name; // Prisma default (no @@map): table name is the model name, verbatim
  let schemaName = "dynasty";
  const fields: FieldInfo[] = [];
  const indexGroups: string[][] = [];

  for (const rawLine of raw.body) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;

    const mapMatch = line.match(/^@@map\("([^"]+)"\)/);
    if (mapMatch) { tableName = mapMatch[1]; continue; }

    const schemaMatch = line.match(/^@@schema\("([^"]+)"\)/);
    if (schemaMatch) { schemaName = schemaMatch[1]; continue; }

    const indexMatch = line.match(/^@@(?:index|unique)\(\[([^\]]+)\]/);
    if (indexMatch) {
      indexGroups.push(indexMatch[1].split(",").map((part) => part.trim()));
      continue;
    }

    if (line.startsWith("@@")) continue;

    const fieldMatch = line.match(/^(\w+)\s+([\w.[\]?]+)(.*)$/);
    if (!fieldMatch) continue;
    const [, fieldName, rawType, rest] = fieldMatch;
    const baseType = rawType.replace(/[[\]?]/g, "");
    if (modelNames.has(baseType)) continue; // relation field, no column of its own

    const dbMapMatch = rest.match(/@map\("([^"]+)"\)/);
    fields.push({ name: fieldName, dbName: dbMapMatch ? dbMapMatch[1] : fieldName });
  }

  return { name: raw.name, tableName, schemaName, fields, indexGroups };
}

// ─── DB introspection ────────────────────────────────────────────────────────

// This script must never mutate a database it inspects — that guarantee
// matters most when --compare-url points at production. Every raw query goes
// through this assertion rather than trusting call sites to only ever pass
// SELECTs.
function assertSelectOnly(sql: string) {
  if (!/^\s*select\b/i.test(sql)) {
    throw new Error(`Refusing to run a non-SELECT statement in a read-only introspection helper: ${sql}`);
  }
}

async function runSelect<T>(client: PrismaClient, sql: string, ...params: unknown[]): Promise<T> {
  assertSelectOnly(sql);
  return client.$queryRawUnsafe<T>(sql, ...params);
}

async function tableExists(client: PrismaClient, schema: string, table: string): Promise<boolean> {
  const rows = await runSelect<{ table_name: string }[]>(
    client,
    `select table_name from information_schema.tables where table_schema = $1 and table_name = $2`,
    schema,
    table,
  );
  return rows.length > 0;
}

async function existingColumns(client: PrismaClient, schema: string, table: string): Promise<Set<string>> {
  const rows = await runSelect<{ column_name: string }[]>(
    client,
    `select column_name from information_schema.columns where table_schema = $1 and table_name = $2`,
    schema,
    table,
  );
  return new Set(rows.map((row) => row.column_name));
}

async function indexDefs(client: PrismaClient, schema: string, table: string): Promise<string[]> {
  const rows = await runSelect<{ indexdef: string }[]>(
    client,
    `select indexdef from pg_indexes where schemaname = $1 and tablename = $2`,
    schema,
    table,
  );
  return rows.map((row) => row.indexdef);
}

function indexCovers(defs: string[], dbColumns: string[]): boolean {
  return defs.some((def) => dbColumns.every((col) => def.includes(`"${col}"`) || def.includes(col)));
}

// ─── Migration file parsing (which tables does each .sql file create?) ──────

function tablesCreatedBy(sql: string): string[] {
  const matches = [...sql.matchAll(/create table if not exists\s+([a-zA-Z0-9_."]+)/gi)];
  return matches.map((match) => match[1].replace(/"/g, "").split(".").pop() as string);
}

// ─── Engine registry: the 5-gate checklist per engine ───────────────────────

type EngineEntry = {
  name: string;
  migrationFiles: string[];
  models: string[];
  apiRoutes: string[];
  dashboardCheck: (client: PrismaClient, userId: string) => Promise<void>;
};

const ENGINE_REGISTRY: EngineEntry[] = [
  {
    name: "Portfolio Scoring",
    migrationFiles: ["008_deal_scores.sql"],
    models: ["DealScore"],
    apiRoutes: ["/api/portfolio-scores"],
    dashboardCheck: async (client, userId) => { await client.dealScore.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Lead Action Queue",
    migrationFiles: ["009_lead_action_queue.sql"],
    models: ["LeadActionQueue"],
    apiRoutes: ["/api/lead-action-queue"],
    dashboardCheck: async (client, userId) => { await client.leadActionQueue.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Campaign Engine",
    migrationFiles: ["010_campaign_engine.sql"],
    models: ["CampaignBatch", "CampaignItem"],
    apiRoutes: ["/api/campaign-batches"],
    dashboardCheck: async (client, userId) => { await client.campaignBatch.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Owner Intelligence",
    migrationFiles: ["011_owner_intelligence.sql"],
    models: ["OwnerIntelligenceArtifact"],
    apiRoutes: ["/api/owner-intelligence"],
    dashboardCheck: async (client, userId) => { await client.ownerIntelligenceArtifact.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Skip Trace Export Queue",
    migrationFiles: ["012_skip_trace_export_queue.sql"],
    models: ["SkipTraceExportQueue"],
    apiRoutes: ["/api/skip-trace-export-queue"],
    dashboardCheck: async (client, userId) => { await client.skipTraceExportQueue.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Ownership Research",
    migrationFiles: ["013_ownership_research_tasks.sql", "014_ownership_research_completion.sql"],
    models: ["OwnershipResearchTask"],
    apiRoutes: ["/api/ownership-research-tasks"],
    dashboardCheck: async (client, userId) => { await client.ownershipResearchTask.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Deal Intake Engine",
    migrationFiles: ["015_lead_intake_artifacts.sql"],
    models: ["LeadIntakeArtifact"],
    apiRoutes: ["/api/lead-intake-artifacts"],
    dashboardCheck: async (client, userId) => { await client.leadIntakeArtifact.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Seller Conversations",
    migrationFiles: ["016_seller_conversations.sql"],
    models: ["SellerConversation"],
    apiRoutes: ["/api/seller-conversations"],
    dashboardCheck: async (client, userId) => { await client.sellerConversation.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Seller Follow-Ups",
    migrationFiles: ["017_seller_followups.sql"],
    models: ["SellerFollowup"],
    apiRoutes: ["/api/seller-followups"],
    dashboardCheck: async (client, userId) => { await client.sellerFollowup.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Seller Offers",
    migrationFiles: ["018_seller_offers.sql"],
    models: ["SellerOffer"],
    apiRoutes: ["/api/seller-offers"],
    dashboardCheck: async (client, userId) => { await client.sellerOffer.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Seller Negotiations",
    migrationFiles: ["019_seller_negotiations.sql"],
    models: ["SellerNegotiation"],
    apiRoutes: ["/api/seller-negotiations"],
    dashboardCheck: async (client, userId) => { await client.sellerNegotiation.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Buyer Profiles",
    migrationFiles: ["020_buyer_profiles.sql"],
    models: ["BuyerProfile"],
    apiRoutes: ["/api/buyer-profiles"],
    dashboardCheck: async (client, userId) => { await client.buyerProfile.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Buyer Criteria",
    migrationFiles: ["021_buyer_criteria.sql"],
    models: ["BuyerCriteria"],
    apiRoutes: ["/api/buyer-criteria"],
    dashboardCheck: async (client, userId) => { await client.buyerCriteria.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Buyer Matches",
    migrationFiles: ["022_buyer_matches.sql"],
    models: ["BuyerMatch"],
    apiRoutes: ["/api/buyer-matches"],
    dashboardCheck: async (client, userId) => { await client.buyerMatch.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Disposition Packages",
    migrationFiles: ["023_disposition_packages.sql"],
    models: ["DispositionPackage"],
    apiRoutes: ["/api/disposition-packages"],
    dashboardCheck: async (client, userId) => { await client.dispositionPackage.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Assignment Pipeline",
    migrationFiles: ["024_assignment_pipeline.sql"],
    models: ["AssignmentPipeline"],
    apiRoutes: ["/api/assignment-pipeline"],
    dashboardCheck: async (client, userId) => { await client.assignmentPipeline.findMany({ where: { userId }, take: 1 }) },
  },
  {
    name: "Closing Tracker",
    migrationFiles: ["025_closing_tracker.sql"],
    models: ["ClosingTracker"],
    apiRoutes: ["/api/closing-tracker"],
    dashboardCheck: async (client, userId) => { await client.closingTracker.findMany({ where: { userId }, take: 1 }) },
  },
];

// ─── Gate runners ────────────────────────────────────────────────────────────

type GateResult = { pass: boolean; detail: string };

function gateMigrationFileExists(entry: EngineEntry): GateResult {
  const missing = entry.migrationFiles.filter((file) => !fs.existsSync(path.join(MIGRATIONS_DIR, file)));
  return missing.length === 0
    ? { pass: true, detail: entry.migrationFiles.join(", ") }
    : { pass: false, detail: `missing: ${missing.join(", ")}` };
}

function gateSchemaExists(entry: EngineEntry, models: ModelInfo[]): GateResult {
  const missing = entry.models.filter((name) => !models.some((model) => model.name === name));
  return missing.length === 0
    ? { pass: true, detail: entry.models.join(", ") }
    : { pass: false, detail: `missing from schema.prisma: ${missing.join(", ")}` };
}

async function gateTableExists(client: PrismaClient, entry: EngineEntry, models: ModelInfo[]): Promise<GateResult> {
  const modelInfos = models.filter((model) => entry.models.includes(model.name));
  const missing: string[] = [];
  for (const model of modelInfos) {
    if (!(await tableExists(client, model.schemaName, model.tableName))) missing.push(`${model.schemaName}.${model.tableName}`);
  }
  return missing.length === 0
    ? { pass: true, detail: modelInfos.map((m) => m.tableName).join(", ") }
    : { pass: false, detail: `missing tables: ${missing.join(", ")}` };
}

async function gateColumnsAndIndexes(client: PrismaClient, entry: EngineEntry, models: ModelInfo[]): Promise<GateResult> {
  const modelInfos = models.filter((model) => entry.models.includes(model.name));
  const problems: string[] = [];

  for (const model of modelInfos) {
    if (!(await tableExists(client, model.schemaName, model.tableName))) continue; // reported by gateTableExists already
    const columns = await existingColumns(client, model.schemaName, model.tableName);
    const missingColumns = model.fields.filter((field) => !columns.has(field.dbName));
    if (missingColumns.length > 0) {
      problems.push(`${model.tableName} missing columns: ${missingColumns.map((f) => f.dbName).join(", ")}`);
    }

    const defs = await indexDefs(client, model.schemaName, model.tableName);
    for (const group of model.indexGroups) {
      const dbCols = group.map((fieldName) => model.fields.find((f) => f.name === fieldName)?.dbName ?? fieldName);
      if (!indexCovers(defs, dbCols)) {
        problems.push(`${model.tableName} missing index covering [${dbCols.join(", ")}]`);
      }
    }
  }

  return problems.length === 0 ? { pass: true, detail: "columns + indexes match" } : { pass: false, detail: problems.join("; ") };
}

async function gateApiRouteAuth(baseUrl: string | null, entry: EngineEntry): Promise<GateResult> {
  if (!baseUrl) return { pass: true, detail: "skipped (no --base-url / server not checked)" };
  const failures: string[] = [];
  for (const route of entry.apiRoutes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, { method: "GET" });
      if (response.status !== 401) failures.push(`${route} returned ${response.status} (expected 401)`);
    } catch (error) {
      failures.push(`${route} unreachable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures.length === 0 ? { pass: true, detail: entry.apiRoutes.join(", ") } : { pass: false, detail: failures.join("; ") };
}

async function gateDashboardQuery(client: PrismaClient, entry: EngineEntry, userId: string | null): Promise<GateResult> {
  if (!userId) return { pass: true, detail: "skipped (no user in database yet — valid for a freshly bootstrapped environment)" };
  try {
    await entry.dashboardCheck(client, userId);
    return { pass: true, detail: "query executed" };
  } catch (error) {
    return { pass: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

// ─── Report formatting ───────────────────────────────────────────────────────

function statusIcon(pass: boolean) {
  return pass ? "PASS" : "FAIL";
}

async function runAgainst(client: PrismaClient, label: string, models: ModelInfo[], baseUrl: string | null, userId: string | null) {
  console.log(`\n=== ${label} ===\n`);
  let allPass = true;

  for (const entry of ENGINE_REGISTRY) {
    const gate1 = gateMigrationFileExists(entry);
    const gate2 = gateSchemaExists(entry, models);
    const gate3 = await gateTableExists(client, entry, models);
    const gate4 = gate3.pass ? await gateColumnsAndIndexes(client, entry, models) : { pass: false, detail: "skipped (table missing)" };
    const gate5 = await gateApiRouteAuth(baseUrl, entry);
    const gate6 = gate3.pass ? await gateDashboardQuery(client, entry, userId) : { pass: false, detail: "skipped (table missing)" };

    const gates = [
      ["1. SQL migration exists", gate1],
      ["2. Prisma schema declares it", gate2],
      ["3. DB table exists", gate3],
      ["4. Columns/indexes match", gate4],
      ["5. API route auth-guards cleanly", gate5],
      ["6. Dashboard query executes", gate6],
    ] as const;

    const engineOk = gates.every(([, result]) => result.pass);
    allPass = allPass && engineOk;

    console.log(`${engineOk ? "✔" : "✘"} ${entry.name}`);
    for (const [label, result] of gates) {
      if (!result.pass) console.log(`    [${statusIcon(result.pass)}] ${label} — ${result.detail}`);
    }
  }

  return allPass;
}

async function listPendingMigrations(client: PrismaClient) {
  console.log("\n=== Pending migrations (table referenced by file does not exist yet) ===\n");
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith(".sql")).sort();
  let anyPending = false;

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const tables = tablesCreatedBy(sql);
    if (tables.length === 0) continue; // ALTER-only migrations aren't checked here
    const missing: string[] = [];
    for (const table of tables) {
      if (!(await tableExists(client, "dynasty", table))) missing.push(table);
    }
    if (missing.length > 0) {
      anyPending = true;
      console.log(`  PENDING: ${file} — table(s) not found: ${missing.join(", ")}`);
    }
  }

  if (!anyPending) console.log("  None. Every migration file's primary table exists in the database.");
}

// Production Migration Gate: does the compare database (production) have
// every table/column/index the current schema.prisma — and therefore the code
// about to be deployed — expects? Read-only throughout (see assertSelectOnly).
//
// Findings are split into two severities:
//   - forward gaps (table/column missing in the compare DB): these ARE the
//     gate. The code being deployed will crash against production without an
//     additive migration first, so these fail the run.
//   - extra objects (table/column exists in the compare DB but not in the
//     current schema): reported, but not gating. Dropping something from
//     production is a deliberate, reviewed decision — never automatic — so
//     this script only surfaces it as a "review before any destructive
//     migration" note.
async function compareEnvironments(compareUrl: string, models: ModelInfo[], readonly: boolean): Promise<boolean> {
  const maskedUrl = compareUrl.replace(/:[^:@]+@/, ":***@");
  console.log(`\n=== Production Migration Gate (compare target: ${maskedUrl}) ===\n`);
  if (!readonly) {
    console.log("  Note: --readonly was not passed. Pass --readonly when the compare target is production.");
  }

  const compareClient = new PrismaClient({ datasources: { db: { url: compareUrl } } });
  const forwardGaps: string[] = [];
  const extraObjects: string[] = [];

  try {
    for (const model of models) {
      const has = await tableExists(compareClient, model.schemaName, model.tableName);
      if (!has) {
        forwardGaps.push(`${model.tableName}: table does not exist — needs an additive migration before deploy`);
        continue;
      }

      const columns = await existingColumns(compareClient, model.schemaName, model.tableName);
      const expectedNames = new Set(model.fields.map((field) => field.dbName));
      const missingColumns = model.fields.filter((field) => !columns.has(field.dbName));
      const extraColumns = [...columns].filter((column) => !expectedNames.has(column));

      if (missingColumns.length > 0) {
        forwardGaps.push(`${model.tableName}: missing column(s) ${missingColumns.map((f) => f.dbName).join(", ")}`);
      }
      if (extraColumns.length > 0) {
        extraObjects.push(`${model.tableName}: has extra column(s) ${extraColumns.join(", ")} not in schema.prisma`);
      }

      const defs = await indexDefs(compareClient, model.schemaName, model.tableName);
      for (const group of model.indexGroups) {
        const dbCols = group.map((fieldName) => model.fields.find((f) => f.name === fieldName)?.dbName ?? fieldName);
        if (!indexCovers(defs, dbCols)) {
          forwardGaps.push(`${model.tableName}: missing index covering [${dbCols.join(", ")}]`);
        }
      }
    }
  } finally {
    await compareClient.$disconnect();
  }

  if (forwardGaps.length === 0) {
    console.log("  Production has every table/column/index schema.prisma expects.");
  } else {
    console.log("  FORWARD MIGRATION NEEDED before this branch can deploy:");
    forwardGaps.forEach((line) => console.log(`    - ${line}`));
  }

  if (extraObjects.length > 0) {
    console.log("\n  Review before any destructive migration (present in production, not in schema.prisma — not blocking):");
    extraObjects.forEach((line) => console.log(`    - ${line}`));
  }

  return forwardGaps.length === 0;
}

// Best-effort deploy traceability: which commit/branch was this run checked
// against? Prefers CI-provided values (accurate even with a detached HEAD)
// over local git state.
function deployContext(): { branch: string; commit: string } {
  const branch = process.env.GITHUB_REF_NAME ?? tryGit(["branch", "--show-current"]) ?? "unknown";
  const commit = process.env.GITHUB_SHA ?? tryGit(["rev-parse", "HEAD"]) ?? "unknown";
  return { branch, commit };
}

function tryGit(args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: path.join(__dirname, ".."), encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function main() {
  const baseUrlArg = process.argv.find((arg) => arg.startsWith("--base-url="))?.split("=").slice(1).join("=") ?? null;
  const compareUrlArg = process.argv.find((arg) => arg.startsWith("--compare-url="))?.split("=").slice(1).join("=") ?? process.env.COMPARE_DATABASE_URL ?? null;
  const readonly = process.argv.includes("--readonly");

  const { branch, commit } = deployContext();
  console.log(`Branch: ${branch}  Commit: ${commit}`);
  if (readonly) console.log("READ-ONLY MODE — this run will not write to any database it inspects.");

  const models = parseSchema(SCHEMA_PATH);
  const client = new PrismaClient();

  let baseUrl = baseUrlArg;
  if (baseUrl) {
    try {
      await fetch(baseUrl, { method: "GET" });
    } catch {
      console.log(`Note: ${baseUrl} is not reachable — API route gate will be skipped for all engines.`);
      baseUrl = null;
    }
  } else {
    console.log("Note: no --base-url provided — API route auth-check gate will be skipped. Pass --base-url=http://localhost:3000 with `npm run dev` running to include it.");
  }

  const firstUser = await client.user.findFirst({ select: { id: true } }).catch(() => null);
  if (!firstUser) console.log("Note: no users found in the database — dashboard-query gate will be skipped for every engine until a user exists.");

  const allPass = await runAgainst(client, "Engine deployment gates", models, baseUrl, firstUser?.id ?? null);
  await listPendingMigrations(client);

  let comparePass = true;
  if (compareUrlArg) {
    try {
      comparePass = await compareEnvironments(compareUrlArg, models, readonly);
    } catch (error) {
      comparePass = false;
      const detail = error instanceof Error ? error.message.trim() : String(error);
      console.log(`\n=== Production Migration Gate ===\n  Could not complete comparison:\n${detail}`);
    }
  } else {
    console.log("\nNote: no --compare-url provided — skipping production migration gate.");
  }

  await client.$disconnect();

  const overallPass = allPass && comparePass;
  console.log(`\n${overallPass ? "ALL GATES PASS" : "ONE OR MORE GATES FAILED"} — see detail above.\n`);
  process.exitCode = overallPass ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
