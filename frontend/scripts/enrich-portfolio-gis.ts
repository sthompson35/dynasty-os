import { PrismaClient } from "@prisma/client";
import { enrichPropertyGis } from "../lib/gis-enrichment";

const prisma = new PrismaClient();
const CONCURRENCY = 5;

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;
  const force = process.argv.includes("--force");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}.`);
  }

  const properties = await prisma.property.findMany({
    where: { userId: user.id, ...(force ? {} : { gisEnrichedAt: null }) },
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
  });

  let enriched = 0;
  let failed = 0;
  for (let index = 0; index < properties.length; index += CONCURRENCY) {
    const batch = properties.slice(index, index + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (property) => {
        const result = await enrichPropertyGis(property);
        await prisma.property.update({
          where: { id: property.id },
          data: { ...result, gisEnrichedAt: new Date() },
        });
      })
    );
    for (const result of results) {
      if (result.status === "fulfilled") enriched += 1;
      else failed += 1;
    }
    console.log(`Processed ${Math.min(index + CONCURRENCY, properties.length)}/${properties.length} (${enriched} enriched, ${failed} failed)`);
  }

  const remaining = await prisma.property.count({ where: { userId: user.id, gisEnrichedAt: null } });

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    candidates: properties.length,
    enriched,
    failed,
    remaining,
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
