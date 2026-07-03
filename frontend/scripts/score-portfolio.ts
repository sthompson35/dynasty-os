import { PrismaClient } from "@prisma/client";
import { scoreProperty } from "../lib/portfolio-scoring/score-property";

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

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  let scored = 0;
  const batchSize = 250;
  for (let index = 0; index < properties.length; index += batchSize) {
    const batch = properties.slice(index, index + batchSize);
    await prisma.$transaction(batch.map((property) => {
      const result = scoreProperty({ ...property, userId: user.id });

      return prisma.dealScore.upsert({
        where: {
          userId_propertyId: {
            userId: user.id,
            propertyId: property.id,
          },
        },
        update: {
          dealScore: result.dealScore,
          riskScore: result.riskScore,
          arvConfidence: result.arvConfidence,
          capitalScore: result.capitalScore,
          strategy: result.strategy,
          decision: result.decision,
          scoreBucket: result.scoreBucket,
          reasons: result.reasons,
          inputs: result.inputs,
        },
        create: {
          propertyId: property.id,
          userId: user.id,
          dealScore: result.dealScore,
          riskScore: result.riskScore,
          arvConfidence: result.arvConfidence,
          capitalScore: result.capitalScore,
          strategy: result.strategy,
          decision: result.decision,
          scoreBucket: result.scoreBucket,
          reasons: result.reasons,
          inputs: result.inputs,
        },
      });
    }));
    scored += batch.length;
  }

  const [totalScores, decisions, buckets, top] = await Promise.all([
    prisma.dealScore.count({ where: { userId: user.id } }),
    prisma.dealScore.groupBy({ by: ["decision"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.dealScore.groupBy({ by: ["scoreBucket"], where: { userId: user.id }, _count: { _all: true } }),
    prisma.dealScore.findMany({
      where: { userId: user.id },
      orderBy: [{ dealScore: "desc" }, { capitalScore: "desc" }],
      take: 5,
      include: { property: { select: { address: true, city: true, state: true, zip: true } } },
    }),
  ]);

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    scored,
    totalScores,
    decisions: decisions.map((item) => ({ decision: item.decision, count: item._count._all })),
    buckets: buckets.map((item) => ({ bucket: item.scoreBucket, count: item._count._all })),
    top: top.map((item) => ({
      dealScore: item.dealScore,
      decision: item.decision,
      bucket: item.scoreBucket,
      strategy: item.strategy,
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
