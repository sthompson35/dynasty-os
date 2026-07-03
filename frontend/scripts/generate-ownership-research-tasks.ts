import { PrismaClient } from "@prisma/client";
import { routeOwnershipResearch } from "../lib/ownership-research/route-ownership-research";
import { toNumber } from "../lib/property-utils";

const prisma = new PrismaClient();

function evidenceCounty(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const county = (value as Record<string, unknown>).county;
  return county ? String(county) : null;
}

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No user found for ${email}.`);

  const queueItems = await prisma.skipTraceExportQueue.findMany({
    where: {
      userId: user.id,
      recommendedChannel: "OWNERSHIP_RESEARCH",
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    ...(limit ? { take: limit } : {}),
    include: {
      ownerArtifact: {
        select: { evidence: true },
      },
    },
  });

  let generated = 0;
  const batchSize = 250;
  for (let index = 0; index < queueItems.length; index += batchSize) {
    const batch = queueItems.slice(index, index + batchSize);
    await prisma.$transaction(batch.map((item) => {
      const route = routeOwnershipResearch({
        propertyAddress: item.propertyAddress,
        mailingAddress: item.mailingAddress,
        county: evidenceCounty(item.ownerArtifact.evidence),
        priority: item.priority,
        absenteeOwner: item.absenteeOwner,
        vacancySignal: item.vacancySignal,
        equitySignal: toNumber(item.equitySignal) || null,
      });

      return prisma.ownershipResearchTask.upsert({
        where: { userId_propertyId: { userId: user.id, propertyId: item.propertyId } },
        update: {
          skipTraceQueueId: item.id,
          propertyAddress: item.propertyAddress,
          mailingAddress: item.mailingAddress,
          county: route.county,
          sourcePriority: route.sourcePriority,
          researchReason: route.researchReason,
          recommendedSource: route.recommendedSource,
        },
        create: {
          propertyId: item.propertyId,
          skipTraceQueueId: item.id,
          userId: user.id,
          propertyAddress: item.propertyAddress,
          mailingAddress: item.mailingAddress,
          county: route.county,
          sourcePriority: route.sourcePriority,
          researchReason: route.researchReason,
          recommendedSource: route.recommendedSource,
        },
      });
    }));
    generated += batch.length;
  }

  const [totalTasks, highPriority, statuses, counties, sources] = await Promise.all([
    prisma.ownershipResearchTask.count({ where: { userId: user.id } }),
    prisma.ownershipResearchTask.count({ where: { userId: user.id, sourcePriority: { gte: 70 } } }),
    prisma.ownershipResearchTask.groupBy({ by: ["researchStatus"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.ownershipResearchTask.groupBy({ by: ["county"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.ownershipResearchTask.groupBy({ by: ["recommendedSource"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    generated,
    totalTasks,
    highPriority,
    statuses: statuses.map((item) => ({ researchStatus: item.researchStatus, count: item._count._all })),
    counties: counties.map((item) => ({ county: item.county ?? "Unknown", count: item._count._all })),
    sources: sources.map((item) => ({ recommendedSource: item.recommendedSource, count: item._count._all })),
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
