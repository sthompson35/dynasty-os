// Targeted follow-up for properties that already ran through enrich-portfolio-gis.ts
// before FEMA disaster history existed. Reuses the censusGeoid already stored on
// each row instead of re-running Census/flood/zoning lookups.
import { PrismaClient } from "@prisma/client";
import { lookupFemaDisasterHistory } from "../lib/gis-enrichment";

const prisma = new PrismaClient();
const CONCURRENCY = 5;

async function main() {
  const properties = await prisma.property.findMany({
    where: { censusGeoid: { not: null }, femaDisasterCount: null },
    select: { id: true, censusGeoid: true },
  });

  let updated = 0;
  let failed = 0;
  for (let index = 0; index < properties.length; index += CONCURRENCY) {
    const batch = properties.slice(index, index + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (property) => {
        const result = await lookupFemaDisasterHistory(property.censusGeoid);
        await prisma.property.update({
          where: { id: property.id },
          data: {
            femaDisasterCount: result?.femaDisasterCount ?? null,
            femaLastDisasterDate: result?.femaLastDisasterDate ?? null,
            femaLastDisasterType: result?.femaLastDisasterType ?? null,
            femaDisasterSource: result?.femaDisasterSource ?? null,
          },
        });
      })
    );
    for (const result of results) {
      if (result.status === "fulfilled") updated += 1;
      else failed += 1;
    }
    console.log(`Processed ${Math.min(index + CONCURRENCY, properties.length)}/${properties.length} (${updated} updated, ${failed} failed)`);
  }

  console.log(JSON.stringify({ status: "complete", candidates: properties.length, updated, failed }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
