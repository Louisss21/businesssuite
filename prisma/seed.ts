import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedProduction } from "./seed-production";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "admin1234";

  // Admin
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administrator", passwordHash, role: "ADMIN" },
  });

  // Firmen-Settings
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "Meine Firma GmbH",
      street: "Musterstraße 1",
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
      email: "kontakt@meinefirma.de",
      phone: "+49 30 1234567",
      taxNumber: "30/123/45678",
      vatId: "DE123456789",
    },
  });

  // Beispielkunde
  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      type: "COMPANY",
      companyName: "Beispiel Kunde AG",
      email: "info@beispielkunde.de",
      street: "Kundenweg 5",
      postalCode: "80331",
      city: "München",
      vatId: "DE987654321",
    },
  });

  // Produktion & Lager (Sustable ONE)
  await seedProduction(prisma);

  console.log("Seed fertig:");
  console.log(`  Login: ${email} / ${password}`);
  console.log(`  Kunde: ${customer.companyName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
