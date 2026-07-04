import { PrismaClient } from "@prisma/client";
import { generateLeadAction } from "../lib/lead-action-queue/generate-lead-action";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}.`);
  }

  const scores = await prisma.dealScore.findMany({
    where: { userId: user.id },
    orderBy: [{ dealScore: "desc" }, { updatedAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  });

  let generated = 0;
  const batchSize = 250;
  for (let index = 0; index < scores.length; index += batchSize) {
    const batch = scores.slice(index, index + batchSize);
    await prisma.$transaction(batch.map((score) => {
      const action = generateLeadAction({
        dealScoreId: score.id,
        propertyId: score.propertyId,
        dealScore: score.dealScore,
        riskScore: score.riskScore,
        scoreBucket: score.scoreBucket,
        decision: score.decision,
        strategy: score.strategy,
        reasons: score.reasons,
      });

      return prisma.leadActionQueue.upsert({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId: score.propertyId,
          },
        },
        update: {
          dealScoreId: score.id,
          actionType: action.actionType,
          priority: action.priority,
          nextActionDate: action.nextActionDate,
          reason: action.reason,
        },
        create: {
          propertyId: score.propertyId,
          dealScoreId: score.id,
          userId: user.id,
          actionType: action.actionType,
          priority: action.priority,
          nextActionDate: action.nextActionDate,
          reason: action.reason,
        },
      });
    }));
    generated += batch.length;
  }

  const [totalItems, actions, top] = await Promise.all([
    prisma.leadActionQueue.count({ where: { userId: user.id } }),
    prisma.leadActionQueue.groupBy({ by: ["actionType"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.leadActionQueue.findMany({
      where: { userId: user.id },
      orderBy: [{ priority: "desc" }, { nextActionDate: "asc" }],
      take: 5,
      include: {
        property: { select: { address: true, city: true, state: true, zip: true } },
        dealScore: { select: { dealScore: true, scoreBucket: true, strategy: true } },
      },
    }),
  ]);

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    generated,
    totalItems,
    actions: actions.map((item) => ({ actionType: item.actionType, count: item._count._all })),
    top: top.map((item) => ({
      actionType: item.actionType,
      priority: item.priority,
      score: item.dealScore.dealScore,
      bucket: item.dealScore.scoreBucket,
      strategy: item.dealScore.strategy,
      address: item.property.address,
      city: item.property.city,
      state: item.property.state,
      zip: item.property.zip,
    })),
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
