import { PrismaClient } from "@prisma/client";
import { campaignTypeLabel, generateCampaignArtifact } from "../lib/campaign-engine/generate-campaign-artifact";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const typeArg = process.argv.find((arg) => arg.startsWith("--type="))?.split("=").slice(1).join("=") || "ALL";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const includeSkip = process.argv.includes("--include-skip");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No user found for ${email}.`);

  const where = {
    userId: user.id,
    status: "OPEN",
    ...(typeArg !== "ALL" ? { actionType: typeArg } : {}),
    ...(!includeSkip && typeArg === "ALL" ? { actionType: { not: "SKIP" } } : {}),
  };

  const queueItems = await prisma.leadActionQueue.findMany({
    where,
    orderBy: [{ priority: "desc" }, { nextActionDate: "asc" }, { updatedAt: "desc" }],
    ...(limit ? { take: limit } : {}),
    include: {
      property: {
        select: {
          address: true,
          city: true,
          state: true,
          zip: true,
          propertyType: true,
          bedrooms: true,
          bathrooms: true,
          sqft: true,
          lotSize: true,
          currentValue: true,
          arv: true,
          contactLinks: {
            where: { status: "active" },
            take: 1,
            include: { contact: { select: { name: true, phone: true, email: true, company: true } } },
          },
          ownerIntelligenceArtifacts: {
            take: 1,
            orderBy: { updatedAt: "desc" },
            select: {
              ownerName: true,
              mailingAddress: true,
              ownerType: true,
              absenteeOwner: true,
              yearsOwned: true,
              equityEstimate: true,
              vacancyIndicator: true,
              contactConfidence: true,
              phones: true,
              emails: true,
            },
          },
        },
      },
      dealScore: {
        select: {
          dealScore: true,
          riskScore: true,
          strategy: true,
          decision: true,
          scoreBucket: true,
        },
      },
    },
  });

  const grouped = new Map<string, typeof queueItems>();
  for (const item of queueItems) grouped.set(item.actionType, [...(grouped.get(item.actionType) ?? []), item]);

  const batches: Array<{ id: string; campaignType: string; totalItems: number }> = [];
  let generated = 0;

  for (const [campaignType, items] of grouped.entries()) {
    const batch = await prisma.campaignBatch.create({
      data: {
        userId: user.id,
        campaignType,
        name: `${campaignTypeLabel(campaignType)} - ${new Date().toLocaleDateString("en-US")}`,
        status: "READY",
        scheduledDate: new Date(),
        totalItems: items.length,
        notes: `Generated from ${items.length} ${campaignTypeLabel(campaignType)} lead action queue item${items.length === 1 ? "" : "s"}.`,
      },
    });

    await prisma.campaignItem.createMany({
      data: items.map((item) => ({
        batchId: batch.id,
        queueItemId: item.id,
        propertyId: item.propertyId,
        userId: user.id,
        campaignType,
        priority: item.priority,
        artifact: generateCampaignArtifact({
          id: item.id,
          propertyId: item.propertyId,
          actionType: item.actionType,
          priority: item.priority,
          reason: item.reason,
          property: item.property,
          dealScore: item.dealScore,
        }),
      })),
    });

    batches.push({ id: batch.id, campaignType, totalItems: items.length });
    generated += items.length;
  }

  const [totalBatches, totalItems, counts] = await Promise.all([
    prisma.campaignBatch.count({ where: { userId: user.id } }),
    prisma.campaignItem.count({ where: { userId: user.id } }),
    prisma.campaignItem.groupBy({ by: ["campaignType"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  console.log(JSON.stringify({
    status: generated ? "complete" : "empty",
    user: user.email,
    generated,
    batches,
    totalBatches,
    totalItems,
    counts: counts.map((item) => ({ campaignType: item.campaignType, count: item._count._all })),
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
