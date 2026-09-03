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

  // Aufräumen: RBAC-Testkonten aus den Auswahllisten nehmen (deaktivieren,
  // nicht löschen – Verweise in Aufgaben/Leads bleiben nachvollziehbar).
  const testAccounts = await prisma.user.updateMany({
    where: { email: { endsWith: "@sustable-test.de" }, active: true },
    data: { active: false },
  });
  if (testAccounts.count > 0) {
    console.log(`Testkonten deaktiviert: ${testAccounts.count}`);
  }

  // Admin-Konto: generischen Namen einmalig auf den echten Namen setzen
  // (nur falls noch "Administrator" – manuelle Umbenennungen bleiben unberührt).
  await prisma.user.updateMany({
    where: { email: "sales@sustable.eu", name: "Administrator" },
    data: { name: "Louis Müller" },
  });

  // Duplikat-Bereinigung: "Louis Müller" existiert nur einmal sichtbar –
  // alle weiteren aktiven Konten mit diesem Namen (≠ sales@sustable.eu)
  // werden deaktiviert.
  const dupLouis = await prisma.user.updateMany({
    where: {
      name: { equals: "Louis Müller", mode: "insensitive" },
      active: true,
      NOT: { email: "sales@sustable.eu" },
    },
    data: { active: false },
  });
  if (dupLouis.count > 0) {
    console.log(`Doppelte Louis-Müller-Konten deaktiviert: ${dupLouis.count}`);
  }

  // Zuweisungen der deaktivierten Louis-Müller-Duplikate auf das echte Konto
  // umhängen. Ohne das zeigen die Auswahllisten den inaktiven Nutzer als
  // Zusatzoption an – also zweimal 'Louis Müller' ohne Unterscheidung.
  // Idempotent: nach dem Lauf verweist nichts mehr auf die Duplikat-IDs.
  const canonicalLouis = await prisma.user.findUnique({
    where: { email: "sales@sustable.eu" },
    select: { id: true },
  });
  if (canonicalLouis) {
    const staleLouis = await prisma.user.findMany({
      where: {
        name: { equals: "Louis Müller", mode: "insensitive" },
        NOT: { email: "sales@sustable.eu" },
      },
      select: { id: true },
    });
    const staleIds = staleLouis.map((u) => u.id);
    if (staleIds.length > 0) {
      const movedLeads = await prisma.lead.updateMany({
        where: { assignedUserId: { in: staleIds } },
        data: { assignedUserId: canonicalLouis.id },
      });
      const movedTasks = await prisma.task.updateMany({
        where: { assignedToId: { in: staleIds } },
        data: { assignedToId: canonicalLouis.id },
      });
      if (movedLeads.count > 0 || movedTasks.count > 0) {
        console.log(
          `Zuweisungen auf das echte Louis-Konto umgehaengt: ${movedLeads.count} Lead(s), ${movedTasks.count} Aufgabe(n)`,
        );
      }
    }
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
