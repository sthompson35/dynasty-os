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

  const totalContacts = await prisma.contact.count({ where: { userId: user.id } });
  const sellerContacts = await prisma.contact.count({ where: { userId: user.id, role: "seller" } });
  const linkedContacts = await prisma.propertyContact.count({ where: { userId: user.id } });
  const sample = await prisma.contact.findMany({
    where: { userId: user.id, role: "seller" },
    select: {
      name: true,
      role: true,
      notes: true,
      links: {
        select: {
          roleOnDeal: true,
          property: { select: { address: true, city: true, state: true } },
        },
        take: 2,
      },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  console.log(JSON.stringify({ user, totalContacts, sellerContacts, linkedContacts, sample }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
