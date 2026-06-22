import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedProduction } from "./seed-production";
import { seedModelsV2 } from "./seed-models";

const prisma = new PrismaClient();

async function main() {
  // Bootstrap-Admin NUR anlegen, wenn noch gar kein Admin existiert.
  // (Kein erneutes Anlegen eines umbenannten Admins; keine Zugangsdaten im Repo.)
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount === 0) {
    const bootstrapEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
    const bootstrapPw = process.env.SEED_ADMIN_PASSWORD; // bewusst KEIN Default im Code
    const passwordHash = bootstrapPw ? await bcrypt.hash(bootstrapPw, 10) : "";
    await prisma.user.create({
      data: { email: bootstrapEmail, name: "Administrator", passwordHash, role: "ADMIN" },
    });
    console.log(
      bootstrapPw
        ? `Bootstrap-Admin angelegt: ${bootstrapEmail}`
        : `Bootstrap-Admin ${bootstrapEmail} ohne Passwort – bitte SEED_ADMIN_PASSWORD setzen oder im UI ein Passwort vergeben.`,
    );
  }

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

  // Umstellung auf 3 Modelle (ONE/ONE+/mini), 12 Schritte, gemeinsames Kleinteillager
  await seedModelsV2(prisma);

  // 1.4: Entwickler-Platzhalter aus bereits vorhandenen Schritt-Anleitungen entfernen
  // (idempotent – betrifft nur Texte mit "TODO:").
  const todoSteps = await prisma.productionStep.findMany({
    where: { instruction: { contains: "TODO:" } },
    select: { id: true, instruction: true },
  });
  for (const s of todoSteps) {
    const cleaned = s.instruction.replace(/\s*TODO:.*$/s, "").trim();
    await prisma.productionStep.update({ where: { id: s.id }, data: { instruction: cleaned } });
  }
  if (todoSteps.length) console.log(`  Bereinigt: ${todoSteps.length} Schritt(e) mit TODO-Platzhalter`);

  console.log("Seed fertig.");
  console.log(`  Beispielkunde: ${customer.companyName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
