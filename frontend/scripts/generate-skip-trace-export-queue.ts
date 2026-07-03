import { PrismaClient } from "@prisma/client";
import { buildSkipTraceRow } from "../lib/skip-trace/build-skip-trace-row";
import { toNumber } from "../lib/property-utils";

const prisma = new PrismaClient();

function arrayOfStrings(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No user found for ${email}.`);

  const ownerArtifacts = await prisma.ownerIntelligenceArtifact.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    ...(limit ? { take: limit } : {}),
    include: {
      property: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
          dealScores: {
            where: { userId: user.id },
            take: 1,
            orderBy: { updatedAt: "desc" },
            select: { dealScore: true, scoreBucket: true, decision: true },
          },
          leadActionQueue: {
            where: { userId: user.id },
            take: 1,
            orderBy: { updatedAt: "desc" },
            select: { actionType: true },
          },
        },
      },
    },
  });

  let generated = 0;
  const batchSize = 250;
  for (let index = 0; index < ownerArtifacts.length; index += batchSize) {
    const batch = ownerArtifacts.slice(index, index + batchSize);
    await prisma.$transaction(batch.map((artifact) => {
      const score = artifact.property.dealScores[0];
      const action = artifact.property.leadActionQueue[0];
      const propertyAddress = `${artifact.property.address}, ${artifact.property.city}, ${artifact.property.state} ${artifact.property.zip ?? ""}`.trim();
      const equitySignal = toNumber(artifact.equityEstimate) || null;
      const result = buildSkipTraceRow({
        propertyId: artifact.propertyId,
        ownerArtifactId: artifact.id,
        userId: user.id,
        propertyAddress,
        mailingAddress: artifact.mailingAddress,
        absenteeOwner: artifact.absenteeOwner,
        vacancySignal: artifact.vacancyIndicator,
        equitySignal,
        ownerName: artifact.ownerName,
        contactConfidence: artifact.contactConfidence,
        phones: arrayOfStrings(artifact.phones),
        emails: arrayOfStrings(artifact.emails),
        dealScore: score?.dealScore ?? null,
        scoreBucket: score?.scoreBucket ?? null,
        decision: score?.decision ?? null,
        actionType: action?.actionType ?? null,
      });

      return prisma.skipTraceExportQueue.upsert({
        where: { userId_propertyId: { userId: user.id, propertyId: artifact.propertyId } },
        update: {
          ownerArtifactId: artifact.id,
          propertyAddress,
          mailingAddress: artifact.mailingAddress,
          absenteeOwner: artifact.absenteeOwner,
          vacancySignal: artifact.vacancyIndicator,
          equitySignal,
          priority: result.priority,
          recommendedChannel: result.recommendedChannel,
          evidence: result.evidence,
        },
        create: {
          propertyId: artifact.propertyId,
          ownerArtifactId: artifact.id,
          userId: user.id,
          propertyAddress,
          mailingAddress: artifact.mailingAddress,
          absenteeOwner: artifact.absenteeOwner,
          vacancySignal: artifact.vacancyIndicator,
          equitySignal,
          priority: result.priority,
          recommendedChannel: result.recommendedChannel,
          evidence: result.evidence,
        },
      });
    }));
    generated += batch.length;
  }

  const [totalItems, highPriority, channels, statuses] = await Promise.all([
    prisma.skipTraceExportQueue.count({ where: { userId: user.id } }),
    prisma.skipTraceExportQueue.count({ where: { userId: user.id, priority: { gte: 70 } } }),
    prisma.skipTraceExportQueue.groupBy({ by: ["recommendedChannel"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.skipTraceExportQueue.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    generated,
    totalItems,
    highPriority,
    channels: channels.map((item) => ({ recommendedChannel: item.recommendedChannel, count: item._count._all })),
    statuses: statuses.map((item) => ({ status: item.status, count: item._count._all })),
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
