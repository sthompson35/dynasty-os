// Targeted repair for properties imported without purchase price / notes data
// (confirmed root cause: sdthompson35@gmail.com's 10,181 properties were bulk-
// loaded through a path that only captured address/city/state/currentValue,
// unlike scripts/import-propwire.ts which also extracts List Price/Last Sale
// Amount into purchasePrice and stashes PropWire metadata into notes).
//
// Matches existing rows by normalized address+city+state+zip (same key shape
// as import-propwire.ts's dedup logic) and updates ONLY purchasePrice and
// notes, and ONLY when those fields are currently empty - never overwrites
// existing data, never touches enrichment (floodZone/censusTract/etc.) or
// DealScore rows.
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";

type CsvRow = Record<string, string | undefined>;

const prisma = new PrismaClient();

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function first(row: CsvRow, aliases: string[]): string | undefined {
  const lookup = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(row)) {
    lookup.set(normalizeHeader(key), value);
  }
  for (const alias of aliases) {
    const value = lookup.get(normalizeHeader(alias));
    if (value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

function money(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[$,\s]/g, "").replace(/[()]/g, "-");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toFixed(2) : undefined;
}

function joinAddress(row: CsvRow): string | undefined {
  return first(row, ["Property Address", "Address", "Situs Address", "Site Address", "Street Address", "Full Address"]);
}

function compactNotes(row: CsvRow): string {
  const noteFields = [
    ["Owner", first(row, ["Owner Name", "Owner", "Primary Owner", "Owner 1 Full Name", "Owner 1 First Name"])],
    ["Mailing Address", first(row, ["Mailing Address", "Owner Mailing Address", "Mail Address"])],
    ["County", first(row, ["County", "Property County"])],
    ["APN", first(row, ["APN", "Parcel Number", "Parcel ID"])],
    ["MLS", first(row, ["MLS Number", "MLS #", "MLS"])],
    ["Equity", first(row, ["Equity", "Estimated Equity"])],
    ["Mortgage Balance", first(row, ["Mortgage Balance", "Loan Balance", "Open Mortgage Balance"])],
    ["Last Sale Date", first(row, ["Last Sale Date", "Sale Date"])],
    ["Last Sale Amount", first(row, ["Last Sale Amount", "Sale Amount", "Last Sold Price"])],
    ["Absentee Owner", first(row, ["Absentee Owner", "Absentee"])],
    ["Vacant", first(row, ["Vacant", "Vacancy", "Vacant?"])],
    ["Propwire Source", "Propwire CSV import (repair pass)"],
  ];
  return noteFields
    .filter(([, value]) => value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

async function main() {
  const csvPath = process.argv[2];
  const userEmailArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userEmail = userEmailArg?.split("=").slice(1).join("=") || "sdthompson35@gmail.com";
  const dryRun = process.argv.includes("--dry-run");

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/repair-propwire-pricing.ts <csv-path> [--user=email@example.com] [--dry-run]");
  }

  const resolved = path.resolve(csvPath);
  const user = await prisma.user.findFirst({ where: { email: userEmail }, select: { id: true, email: true } });
  if (!user) throw new Error(`No user found for ${userEmail}.`);

  const csv = fs.readFileSync(resolved, "utf8");
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, trim: true }) as CsvRow[];

  const existing = await prisma.property.findMany({
    where: { userId: user.id },
    select: { id: true, address: true, city: true, state: true, zip: true, purchasePrice: true, notes: true },
  });
  const byKey = new Map(
    existing.map((property) => [[property.address, property.city, property.state, property.zip].map(normalizeKey).join("|"), property])
  );

  let matched = 0;
  let updated = 0;
  let alreadyHadPrice = 0;
  let unmatched = 0;
  let noPriceInSource = 0;

  for (const row of rows) {
    const address = joinAddress(row);
    const city = first(row, ["Property City", "City", "Situs City", "Site City"]);
    const state = first(row, ["Property State", "State", "Situs State", "Site State"]);
    const zip = first(row, ["Property Zip", "Zip", "ZIP Code", "Situs Zip", "Site Zip"]);
    if (!address || !city || !state) continue;

    const key = [address, city, state, zip].map(normalizeKey).join("|");
    const property = byKey.get(key);
    if (!property) {
      unmatched += 1;
      continue;
    }
    matched += 1;

    if (property.purchasePrice && Number(property.purchasePrice) > 0) {
      alreadyHadPrice += 1;
      continue;
    }

    const listPrice = money(first(row, ["List Price", "Listing Price", "Asking Price"]));
    const lastSalePrice = money(first(row, ["Last Sale Amount", "Last Sold Price", "Sale Amount"]));
    const purchasePrice = listPrice ?? lastSalePrice;
    if (!purchasePrice) {
      noPriceInSource += 1;
      continue;
    }

    const notes = property.notes && property.notes.trim() !== "" ? property.notes : compactNotes(row);

    if (!dryRun) {
      await prisma.property.update({
        where: { id: property.id },
        data: { purchasePrice, notes },
      });
    }
    updated += 1;
  }

  console.log(JSON.stringify({
    status: "complete",
    dryRun,
    file: resolved,
    user: user.email,
    csvRows: rows.length,
    matched,
    updated,
    alreadyHadPrice,
    noPriceInSource,
    unmatched,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
