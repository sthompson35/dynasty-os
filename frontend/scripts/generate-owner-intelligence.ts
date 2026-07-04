import { PrismaClient } from "@prisma/client";
import { buildOwnerIntelligence } from "../lib/owner-intelligence/build-owner-intelligence";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=").slice(1).join("=");
  const limit = limitArg && limitArg !== "all" ? Math.max(1, Number(limitArg)) : undefined;

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new Error(`No user found for ${email}.`);

  const properties = await prisma.property.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    ...(limit ? { take: limit } : {}),
    select: {
      id: true,
      userId: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      notes: true,
      currentValue: true,
      purchasePrice: true,
    },
  });

  let generated = 0;
  const batchSize = 250;
  for (let index = 0; index < properties.length; index += batchSize) {
    const batch = properties.slice(index, index + batchSize);
    await prisma.$transaction(batch.map((property) => {
      const result = buildOwnerIntelligence({
        propertyId: property.id,
        userId: user.id,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        notes: property.notes,
        currentValue: property.currentValue,
        purchasePrice: property.purchasePrice,
      });

      return prisma.ownerIntelligenceArtifact.upsert({
        where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
        update: {
          ownerName: result.ownerName,
          mailingAddress: result.mailingAddress,
          ownerType: result.ownerType,
          absenteeOwner: result.absenteeOwner,
          yearsOwned: result.yearsOwned,
          equityEstimate: result.equityEstimate,
          vacancyIndicator: result.vacancyIndicator,
          contactConfidence: result.contactConfidence,
          phones: result.phones,
          emails: result.emails,
          evidence: result.evidence,
        },
        create: {
          propertyId: property.id,
          userId: user.id,
          ownerName: result.ownerName,
          mailingAddress: result.mailingAddress,
          ownerType: result.ownerType,
          absenteeOwner: result.absenteeOwner,
          yearsOwned: result.yearsOwned,
          equityEstimate: result.equityEstimate,
          vacancyIndicator: result.vacancyIndicator,
          contactConfidence: result.contactConfidence,
          phones: result.phones,
          emails: result.emails,
          evidence: result.evidence,
        },
      });
    }));
    generated += batch.length;
  }

  const [totalArtifacts, absenteeOwners, vacantOwners, highConfidence, ownerTypes] = await Promise.all([
    prisma.ownerIntelligenceArtifact.count({ where: { userId: user.id } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId: user.id, absenteeOwner: true } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId: user.id, vacancyIndicator: true } }),
    prisma.ownerIntelligenceArtifact.count({ where: { userId: user.id, contactConfidence: { gte: 50 } } }),
    prisma.ownerIntelligenceArtifact.groupBy({ by: ["ownerType"], where: { userId: user.id }, _count: { _all: true } }),
  ]);

  console.log(JSON.stringify({
    status: "complete",
    user: user.email,
    generated,
    totalArtifacts,
    absenteeOwners,
    vacantOwners,
    highConfidence,
    ownerTypes: ownerTypes.map((item) => ({ ownerType: item.ownerType, count: item._count._all })),
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
