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
  return Number.isFinite(parsed) ? parsed.toFixed(2) : undefined;
}

function numberValue(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function intValue(value?: string): number | undefined {
  const parsed = numberValue(value);
  return parsed === undefined ? undefined : Math.round(parsed);
}

function zipValue(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    return String(numeric).padStart(5, "0");
  }
  return trimmed.replace(/\.0$/, "");
}

function propertyType(value?: string): string {
  const normalized = normalizeKey(value);
  if (!normalized) return "single-family";
  if (normalized.includes("land") || normalized.includes("vacant")) return "land";
  if (normalized.includes("multi") || normalized.includes("duplex") || normalized.includes("triplex")) return "multi-family";
  if (normalized.includes("condo")) return "condo";
  if (normalized.includes("town")) return "townhome";
  if (normalized.includes("commercial")) return "commercial";
  return "single-family";
}

function statusFromRow(row: CsvRow): string {
  const listStatus = first(row, ["Status", "MLS Status", "Listing Status"]);
  if (listStatus) return normalizeKey(listStatus).replace(/\s+/g, "-");
  if (first(row, ["Pre Foreclosure", "Pre-Foreclosure", "Foreclosure"])?.toLowerCase() === "yes") {
    return "distressed";
  }
  return "prospect";
}

function joinAddress(row: CsvRow): string | undefined {
  const direct = first(row, [
    "Property Address",
    "Address",
    "Situs Address",
    "Site Address",
    "Street Address",
    "Full Address",
  ]);

  if (direct) return direct;

  const house = first(row, ["House Number", "Street Number"]);
  const street = first(row, ["Street Name", "Street"]);
  const suffix = first(row, ["Street Suffix", "Suffix"]);
  const unit = first(row, ["Unit", "Unit Number", "Apt"]);

  return [house, street, suffix, unit].filter(Boolean).join(" ").trim() || undefined;
}

function compactNotes(row: CsvRow): string {
  const noteFields = [
    ["Owner", first(row, ["Owner Name", "Owner", "Primary Owner", "Owner 1 Full Name"])],
    ["Mailing Address", first(row, ["Mailing Address", "Owner Mailing Address", "Mail Address"])],
    ["County", first(row, ["County", "Property County"])],
    ["APN", first(row, ["APN", "Parcel Number", "Parcel ID"])],
    ["MLS", first(row, ["MLS Number", "MLS #", "MLS"])],
    ["Equity", first(row, ["Equity", "Estimated Equity"])],
    ["Mortgage Balance", first(row, ["Mortgage Balance", "Loan Balance"])],
    ["Last Sale Date", first(row, ["Last Sale Date", "Sale Date"])],
    ["Last Sale Amount", first(row, ["Last Sale Amount", "Sale Amount", "Last Sold Price"])],
    ["Absentee Owner", first(row, ["Absentee Owner", "Absentee"])],
    ["Vacant", first(row, ["Vacant", "Vacancy"])],
    ["Propwire Source", "Propwire CSV import"],
  ];

  return noteFields
    .filter(([, value]) => value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function toProperty(row: CsvRow, userId: string) {
  const address = joinAddress(row);
  const city = first(row, ["Property City", "City", "Situs City", "Site City"]);
  const state = first(row, ["Property State", "State", "Situs State", "Site State"]);
  const zip = zipValue(first(row, ["Property Zip", "Zip", "ZIP Code", "Situs Zip", "Site Zip"]));

  if (!address || !city || !state) return null;

  const estimatedValue = money(first(row, ["Estimated Value", "Est Value", "Value", "Market Value", "AVM"]));
  const listPrice = money(first(row, ["List Price", "Listing Price", "Asking Price"]));
  const lastSalePrice = money(first(row, ["Last Sale Amount", "Last Sold Price", "Sale Amount"]));

  return {
    userId,
    address,
    city,
    state: state.toUpperCase(),
    zip,
    propertyType: propertyType(first(row, ["Property Type", "Type", "Land Use", "Use Code"])),
    bedrooms: intValue(first(row, ["Bedrooms", "Beds", "Bed"])),
    bathrooms: numberValue(first(row, ["Bathrooms", "Baths", "Bath"])),
    sqft: intValue(first(row, ["Square Feet", "Sq Ft", "Sqft", "Living Area", "Living Square Feet", "Building Sq Ft"])),
    lotSize: numberValue(first(row, ["Lot Size", "Lot Acres", "Lot (Acres)", "Acreage", "Acres"])),
    yearBuilt: intValue(first(row, ["Year Built", "Built Year"])),
    purchasePrice: listPrice ?? lastSalePrice,
    currentValue: estimatedValue,
    arv: estimatedValue,
    status: statusFromRow(row),
    notes: compactNotes(row),
  };
}

async function main() {
  const csvPath = process.argv[2];
  const userEmailArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userEmail = userEmailArg?.split("=").slice(1).join("=") || "test@example.com";
  const replaceExisting = process.argv.includes("--replace");

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/import-propwire.ts <csv-path> [--user=email@example.com]");
  }

  const resolved = path.resolve(csvPath);
  const stat = fs.statSync(resolved);
  if (stat.size === 0) {
    console.log(JSON.stringify({ status: "empty_file", file: resolved, rows: 0, inserted: 0, skipped: 0 }, null, 2));
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: userEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(`No user found for ${userEmail}. Run the seed first or pass --user=<existing email>.`);
  }

  if (replaceExisting) {
    await prisma.property.deleteMany({
      where: {
        userId: user.id,
        notes: { contains: "Propwire Source: Propwire CSV import" },
      },
    });
  }

  const csv = fs.readFileSync(resolved, "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CsvRow[];

  const existing = await prisma.property.findMany({
    where: { userId: user.id },
    select: { address: true, city: true, state: true, zip: true },
  });

  const seen = new Set(
    existing.map((property) =>
      [property.address, property.city, property.state, property.zip].map(normalizeKey).join("|"),
    ),
  );

  const data = [];
  let skipped = 0;
  for (const row of rows) {
    const property = toProperty(row, user.id);
    if (!property) {
      skipped += 1;
      continue;
    }

    const key = [property.address, property.city, property.state, property.zip].map(normalizeKey).join("|");
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }

    seen.add(key);
    data.push(property);
  }

  let inserted = 0;
  const batchSize = 500;
  for (let index = 0; index < data.length; index += batchSize) {
    const batch = data.slice(index, index + batchSize);
    const result = await prisma.property.createMany({ data: batch });
    inserted += result.count;
  }

  console.log(JSON.stringify({
    status: "complete",
    file: resolved,
    user: user.email,
    rows: rows.length,
    inserted,
    skipped,
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
