import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv.find((arg) => arg.startsWith("--user="))?.split("=").slice(1).join("=") || "test@example.com";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error(`No user found for ${email}.`);
  }

  const total = await prisma.property.count({ where: { userId: user.id } });
  const byType = await prisma.property.groupBy({
    by: ["propertyType"],
    where: { userId: user.id },
    _count: { _all: true },
    orderBy: { _count: { propertyType: "desc" } },
  });
  const sample = await prisma.property.findMany({
    where: { userId: user.id },
    select: {
      address: true,
      city: true,
      state: true,
      zip: true,
      currentValue: true,
      bedrooms: true,
      bathrooms: true,
      sqft: true,
    },
    take: 3,
    orderBy: { createdAt: "desc" },
  });

  console.log(JSON.stringify({ user, total, byType, sample }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
