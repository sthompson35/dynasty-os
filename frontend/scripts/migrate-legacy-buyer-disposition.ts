// One-time migration: backfills the legacy Buyer/Disposition CRM (still used by
// /engines/disposition and read by /command-center + /engines/ai) into the new
// BuyerProfile / BuyerCriteria / DispositionPackage / AssignmentPipeline / ClosingTracker
// tables that power /disposition-command-center. Additive only — never deletes or
// mutates the legacy Buyer/Disposition rows, so this is safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function splitMarkets(value: string | null): string[] {
  if (!value) return [];
  return value.split(/[,;]/).map((part) => part.trim()).filter(Boolean);
}

async function legacyBuyerProfileId(userId: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(userId);
  if (cached) return cached;

  const existing = await prisma.buyerProfile.findFirst({ where: { userId, name: "Legacy Disposition Buyer" } });
  if (existing) {
    cache.set(userId, existing.id);
    return existing.id;
  }

  const created = await prisma.buyerProfile.create({
    data: {
      userId,
      name: "Legacy Disposition Buyer",
      buyerType: "UNKNOWN",
      status: "ARCHIVED",
      notes: "Placeholder created by migrate-legacy-buyer-disposition.ts for closed dispositions with no linked buyer record.",
    },
  });
  cache.set(userId, created.id);
  return created.id;
}

async function migrateUser(userId: string) {
  const [buyers, dispositions] = await Promise.all([
    prisma.buyer.findMany({ where: { userId } }),
    prisma.disposition.findMany({ where: { userId } }),
  ]);

  const buyerProfileByOldBuyerId = new Map<string, string>();
  const legacyBuyerCache = new Map<string, string>();
  let profilesCreated = 0;
  let profilesSkipped = 0;

  for (const buyer of buyers) {
    const existing = await prisma.buyerProfile.findFirst({ where: { userId, name: buyer.name, entity: buyer.entity } });
    if (existing) {
      buyerProfileByOldBuyerId.set(buyer.id, existing.id);
      profilesSkipped += 1;
      continue;
    }

    const profile = await prisma.buyerProfile.create({
      data: {
        userId,
        name: buyer.name,
        entity: buyer.entity,
        email: buyer.email,
        phone: buyer.phone,
        buyerType: (buyer.buyerType || "cash").toUpperCase(),
        fundingCapacity: buyer.fundingCapacity,
        closeSpeedDays: buyer.closeSpeed,
        rating: buyer.score,
        status: buyer.active ? "ACTIVE" : "INACTIVE",
        notes: buyer.notes,
        criteria: {
          create: {
            userId,
            markets: splitMarkets(buyer.markets),
            notes: buyer.criteria,
          },
        },
      },
    });
    buyerProfileByOldBuyerId.set(buyer.id, profile.id);
    profilesCreated += 1;
  }

  let packagesCreated = 0;
  let skippedNoLink = 0;
  let assignmentsCreated = 0;
  let closingsCreated = 0;

  for (const disposition of dispositions) {
    if (!disposition.dealId || !disposition.propertyId) {
      skippedNoLink += 1;
      continue;
    }

    const deal = await prisma.deal.findUnique({ where: { id: disposition.dealId } });
    if (!deal) {
      skippedNoLink += 1;
      continue;
    }

    let pkg = await prisma.dispositionPackage.findUnique({ where: { userId_dealId: { userId, dealId: disposition.dealId } } });
    if (!pkg) {
      pkg = await prisma.dispositionPackage.create({
        data: {
          userId,
          dealId: disposition.dealId,
          propertyId: disposition.propertyId,
          packageType: disposition.exitStrategy === "wholesale" ? "WHOLESALE_ASSIGNMENT" : disposition.exitStrategy.toUpperCase(),
          askingPrice: disposition.listPrice,
          description: disposition.notes,
          status: disposition.status === "closed" || disposition.status === "under_contract" ? "DISTRIBUTED" : disposition.status === "marketing" ? "READY" : "DRAFT",
          distributedAt: disposition.status === "closed" || disposition.status === "under_contract" ? disposition.updatedAt : null,
        },
      });
      packagesCreated += 1;
    }

    const isAssigned = disposition.status === "closed" || disposition.status === "under_contract";
    if (!isAssigned) continue;

    let assignment = await prisma.assignmentPipeline.findFirst({ where: { userId, dealId: disposition.dealId } });
    if (!assignment) {
      const buyerProfileId = disposition.buyerId
        ? buyerProfileByOldBuyerId.get(disposition.buyerId) ?? (await legacyBuyerProfileId(userId, legacyBuyerCache))
        : await legacyBuyerProfileId(userId, legacyBuyerCache);

      assignment = await prisma.assignmentPipeline.create({
        data: {
          userId,
          dealId: disposition.dealId,
          packageId: pkg.id,
          buyerProfileId,
          stage: disposition.status === "closed" ? "CLEARED_TO_CLOSE" : "CONTRACT_SIGNED",
          assignmentFee: disposition.netProfit,
          contractDate: disposition.createdAt,
          notes: `Migrated from legacy Disposition ${disposition.id}.`,
        },
      });
      assignmentsCreated += 1;
    }

    if (disposition.status === "closed") {
      const existingClosing = await prisma.closingTracker.findFirst({ where: { userId, assignmentPipelineId: assignment.id } });
      if (!existingClosing) {
        await prisma.closingTracker.create({
          data: {
            userId,
            dealId: disposition.dealId,
            assignmentPipelineId: assignment.id,
            closingDate: disposition.closeDate,
            status: "CLOSED",
            finalAmount: disposition.salePrice,
            notes: `Migrated from legacy Disposition ${disposition.id}.`,
          },
        });
        closingsCreated += 1;
      }
    }
  }

  return { profilesCreated, profilesSkipped, packagesCreated, skippedNoLink, assignmentsCreated, closingsCreated };
}

async function main() {
  const emailArg = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=");
  const users = emailArg
    ? await prisma.user.findMany({ where: { email: emailArg }, select: { id: true, email: true } })
    : await prisma.user.findMany({ select: { id: true, email: true } });

  if (users.length === 0) {
    console.log("No matching users found.");
    return;
  }

  for (const user of users) {
    const result = await migrateUser(user.id);
    console.log(`User ${user.email ?? user.id}:`, result);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
