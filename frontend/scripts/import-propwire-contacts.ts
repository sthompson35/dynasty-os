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

function zipValue(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && Number.isInteger(numeric)) {
    return String(numeric).padStart(5, "0");
  }
  return trimmed.replace(/\.0$/, "");
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => (part.length <= 2 ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function ownerName(row: CsvRow, index: number): string {
  const full = first(row, [`Owner ${index} Full Name`, `Owner ${index} Name`]);
  if (full) return titleCase(full);

  const firstName = first(row, [`Owner ${index} First Name`]);
  const lastName = first(row, [`Owner ${index} Last Name`]);
  return titleCase([firstName, lastName].filter(Boolean).join(" ").trim());
}

function propertyKeyFromRow(row: CsvRow): string {
  return [
    first(row, ["Property Address", "Address", "Situs Address", "Site Address", "Street Address", "Full Address"]),
    first(row, ["Property City", "City", "Situs City", "Site City"]),
    first(row, ["Property State", "State", "Situs State", "Site State"]),
    zipValue(first(row, ["Property Zip", "Zip", "ZIP Code", "Situs Zip", "Site Zip"])),
  ]
    .map(normalizeKey)
    .join("|");
}

function propertyKey(property: { address: string; city: string; state: string; zip: string | null }): string {
  return [property.address, property.city, property.state, zipValue(property.zip)].map(normalizeKey).join("|");
}

function contactNotes(row: CsvRow, ownerIndex: number): string {
  const values = [
    ["Propwire Source", "Propwire contact import"],
    ["Owner Slot", String(ownerIndex)],
    ["Owner Mailing Address", first(row, ["Owner Mailing Address", "Mailing Address"])],
    ["Owner Mailing City", first(row, ["Owner Mailing City", "Mailing City"])],
    ["Owner Mailing State", first(row, ["Owner Mailing State", "Mailing State"])],
    ["Owner Mailing Zip", zipValue(first(row, ["Owner Mailing Zip", "Mailing Zip"]))],
    ["Owner Type", first(row, ["Owner Type"])],
    ["Owner Occupied", first(row, ["Owner Occupied"])],
    ["APN", first(row, ["APN", "Parcel Number", "Parcel ID"])],
    ["County", first(row, ["County", "Property County"])],
  ];

  return values
    .filter(([, value]) => value !== undefined && String(value).trim() !== "")
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function linkResponsibility(row: CsvRow): string {
  return [
    `Property owner from Propwire row ${first(row, ["Id"]) ?? "unknown"}.`,
    first(row, ["Owner Occupied"]) === "1" ? "Owner occupied." : "",
    first(row, ["Vacant?", "Vacant"]) ? `Vacant: ${first(row, ["Vacant?", "Vacant"])}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  const csvPath = process.argv[2];
  const userEmailArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userEmail = userEmailArg?.split("=").slice(1).join("=") || "test@example.com";

  if (!csvPath) {
    throw new Error("Usage: tsx scripts/import-propwire-contacts.ts <csv-path> [--user=email@example.com]");
  }

  const resolved = path.resolve(csvPath);
  const csv = fs.readFileSync(resolved, "utf8");
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true,
  }) as CsvRow[];

  const user = await prisma.user.findFirst({
    where: { email: userEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(`No user found for ${userEmail}. Run the seed first or pass --user=<existing email>.`);
  }

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    select: { id: true, address: true, city: true, state: true, zip: true },
  });
  const propertyByKey = new Map(properties.map((property) => [propertyKey(property), property]));

  const contacts = await prisma.contact.findMany({
    where: { userId: user.id, role: "seller" },
    select: { id: true, name: true, email: true, phone: true },
  });
  const contactByKey = new Map(
    contacts.map((contact) => [
      [contact.name, contact.email ?? "", contact.phone ?? ""].map(normalizeKey).join("|"),
      contact,
    ]),
  );

  let createdContacts = 0;
  let reusedContacts = 0;
  let linkedContacts = 0;
  let skippedOwners = 0;
  let missingProperties = 0;

  for (const row of rows) {
    const property = propertyByKey.get(propertyKeyFromRow(row));
    if (!property) {
      missingProperties += 1;
      continue;
    }

    for (let index = 1; index <= 4; index += 1) {
      const name = ownerName(row, index);
      if (!name) {
        skippedOwners += 1;
        continue;
      }

      const contactKey = [name, "", ""].map(normalizeKey).join("|");
      let contact = contactByKey.get(contactKey);

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            userId: user.id,
            name,
            role: "seller",
            notes: contactNotes(row, index),
          },
          select: { id: true, name: true, email: true, phone: true },
        });
        contactByKey.set(contactKey, contact);
        createdContacts += 1;
      } else {
        reusedContacts += 1;
      }

      await prisma.propertyContact.upsert({
        where: {
          propertyId_contactId: {
            propertyId: property.id,
            contactId: contact.id,
          },
        },
        update: {
          roleOnDeal: "seller",
          relationshipType: "seller-side",
          dealResponsibility: linkResponsibility(row),
          status: "active",
        },
        create: {
          propertyId: property.id,
          contactId: contact.id,
          userId: user.id,
          roleOnDeal: "seller",
          relationshipType: "seller-side",
          dealResponsibility: linkResponsibility(row),
          status: "active",
        },
      });
      linkedContacts += 1;
    }
  }

  console.log(JSON.stringify({
    status: "complete",
    file: resolved,
    user: user.email,
    rows: rows.length,
    createdContacts,
    reusedContacts,
    linkedContacts,
    skippedOwners,
    missingProperties,
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
