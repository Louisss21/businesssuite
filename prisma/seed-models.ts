import { PrismaClient } from "@prisma/client";

/**
 * Idempotente, NICHT-destruktive Umstellung auf 3 Modelle (ONE / ONE+ / mini)
 * mit 12-Schritte-Struktur + gemeinsamem Kleinteillager.
 *
 * - Neue Bauteile werden angelegt (upsert per SKU), ersetzte Altartikel auf
 *   inaktiv gesetzt (Historie bleibt erhalten, kein Löschen/Merge).
 * - Das alte Modell "Sustable ONE" wird archiviert (umbenannt + inaktiv),
 *   bestehende Produktionsaufträge/Logs bleiben unangetastet.
 * - Drei neue Modelle werden frisch aufgebaut, jedes mit eigenem Fertigerzeugnis.
 *
 * PLATZHALTER (Abschnitt 6 – bitte im Modell-Editor prüfen): Armaflex=1,
 * Verstärkung=2, M4-Senkkopf=4, Endkappe Rahmen=8, M8×30=4, Gumminoppe=4,
 * Wechselrichter-Halter=1. Produktpreise=0.
 */

type Bom = { sku: string; quantity: number };
interface StepDef {
  order: number;
  title: string;
  instruction: string;
  requiresInput?: boolean;
  inputLabel?: string;
  bom: Bom[];
}

interface Variant {
  modulSku: string;
  scharnierCount: number;
  m4val: number; // M4-Mutter, M4-Schraube (Schritt 4) und M4-Schraube (Schritt 6)
  rahmenSku: string;
  beinSku: string;
  endkappeBein: number;
  kartonSku: string;
  rolle: number; // 0 = keine Rollen (mini)
  wrSku: string;
}

const VARIANTS: Record<"ONE" | "ONEPLUS" | "MINI", Variant> = {
  ONE: { modulSku: "CMP-MODUL", scharnierCount: 3, m4val: 9, rahmenSku: "CMP-RAHMEN-ONE", beinSku: "CMP-BEIN-ONE", endkappeBein: 2, kartonSku: "CMP-KARTONAGE", rolle: 2, wrSku: "CMP-WR-500W" },
  ONEPLUS: { modulSku: "CMP-MODUL", scharnierCount: 3, m4val: 9, rahmenSku: "CMP-RAHMEN-ONEPLUS", beinSku: "CMP-BEIN-ONEPLUS", endkappeBein: 2, kartonSku: "CMP-KARTONAGE", rolle: 2, wrSku: "CMP-WR-500W" },
  MINI: { modulSku: "CMP-MODUL-MINI", scharnierCount: 2, m4val: 6, rahmenSku: "CMP-RAHMEN-MINI", beinSku: "CMP-BEIN-MINI", endkappeBein: 4, kartonSku: "CMP-KARTONAGE-MINI", rolle: 0, wrSku: "CMP-WR-350W" },
};

function steps(v: Variant): StepDef[] {
  return [
    { order: 1, title: "Module bohren", instruction: "1× Modul entnehmen. Schablone ansetzen, passenden Bohrer einsetzen und das Modul bohren.", bom: [{ sku: v.modulSku, quantity: 1 }] },
    { order: 2, title: "Einnietmuttern setzen", instruction: "4× Einnietmutter M5 entnehmen und mit dem Nietgerät setzen.", bom: [{ sku: "CMP-NIET-M5", quantity: 4 }] },
    { order: 3, title: "Verstärkungen anbringen", instruction: "Verstärkungen mit Armaflex abkleben, dann mit 2× M4-Senkkopfschraube pro Seite anschrauben (insgesamt 4).", bom: [{ sku: "CMP-ARMAFLEX", quantity: 1 }, { sku: "CMP-VERSTAERKUNG", quantity: 2 }, { sku: "CMP-SCHR-M4-SENK", quantity: 4 }] },
    { order: 4, title: "Scharniere ans Modul schrauben", instruction: "Scharniere mit M4-Schrauben und M4-Muttern am Modul befestigen (vor Rahmen & Kappen).", bom: [{ sku: "CMP-SCHARNIER", quantity: v.scharnierCount }, { sku: "CMP-MUTTER-SCHARNIER", quantity: v.m4val }, { sku: "CMP-SCHR-M4", quantity: v.m4val }] },
    { order: 5, title: "Rahmen kappen", instruction: "Rahmen nehmen und Endkappen 40×60 mit dem Gummihammer in die Rohrenden einschlagen.", bom: [{ sku: v.rahmenSku, quantity: 1 }, { sku: "CMP-ENDKAPPE-4060", quantity: 8 }] },
    { order: 6, title: "Modul am Rahmen befestigen", instruction: "Modul in die Vorrichtung anhängen und mit M4-Schrauben am Rahmen befestigen.", bom: [{ sku: "CMP-SCHR-M4", quantity: v.m4val }] },
    { order: 7, title: "Beinkappen setzen", instruction: "Endkappen in die Beine einsetzen.", bom: [{ sku: "CMP-ENDKAPPE-BEIN", quantity: v.endkappeBein }] },
    { order: 8, title: "Elektrobein montieren", instruction: "Grundbein elektrisch montieren: Connector, Kabel, Steckdose, Hülsen, Erdung und Buchse anschließen.", bom: [{ sku: v.beinSku, quantity: 1 }, { sku: "CMP-HMS-CONN", quantity: 1 }, { sku: "CMP-KABEL-15M", quantity: 1 }, { sku: "CMP-STECKDOSE", quantity: 1 }, { sku: "CMP-ADERENDH-15", quantity: 9 }, { sku: "CMP-FLACHHUELSE-15", quantity: 3 }, { sku: "CMP-ERDBRUECKE-15", quantity: 1 }, { sku: "CMP-KABELSCHUH-15", quantity: 1 }, { sku: "CMP-NEUTRIK", quantity: 1 }, { sku: "CMP-ANSTECKKABEL", quantity: 1 }] },
    { order: 9, title: "Kartonage entnehmen", instruction: "1× Kartonage entnehmen.", bom: [{ sku: v.kartonSku, quantity: 1 }] },
    { order: 10, title: "Seriennummer & Typenschild", instruction: "Typenschild ankleben. Seriennummer eingeben (Pflichtfeld) und speichern – ohne Eingabe ist der nächste Schritt gesperrt.", requiresInput: true, inputLabel: "Seriennummer", bom: [] },
    { order: 11, title: "Kartonage bepacken", instruction: "Schraubentüte packen und beilegen: Beinschrauben, Wechselrichter-Schrauben, Gumminoppen, Halter, Wechselrichter, Rollen, Anleitungen.", bom: [
      { sku: "CMP-SCHR-M8X60", quantity: 8 },
      { sku: "CMP-SCHR-M8X30", quantity: 4 },
      { sku: "CMP-SCHR-M6", quantity: 2 },
      { sku: "CMP-GUMMINOPPE", quantity: 4 },
      { sku: "CMP-WR-HALTER", quantity: 1 },
      { sku: "CMP-ANLEITUNG", quantity: 1 },
      { sku: "CMP-KURZANLEITUNG", quantity: 1 },
      { sku: "CMP-ROLLE", quantity: v.rolle },
      { sku: v.wrSku, quantity: 1 },
    ] },
    { order: 12, title: "Fertigstellung", instruction: "Tisch als Fertigerzeugnis verbuchen. Verbaute Ware ist ausgebucht, Mindestbestandsprüfung wird ausgelöst.", bom: [] },
  ];
}

const NEW_COMPONENTS: { sku: string; name: string }[] = [
  { sku: "CMP-NIET-M5", name: "Einnietmutter M5" },
  { sku: "CMP-SCHR-M4", name: "M4-Schraube" },
  { sku: "CMP-SCHR-M4-SENK", name: "M4-Senkkopfschraube" },
  { sku: "CMP-ARMAFLEX", name: "Armaflex" },
  { sku: "CMP-VERSTAERKUNG", name: "Verstärkung" },
  { sku: "CMP-MODUL-MINI", name: "Modul mini" },
  { sku: "CMP-RAHMEN-ONE", name: "Rahmen ONE" },
  { sku: "CMP-RAHMEN-ONEPLUS", name: "Rahmen ONE+" },
  { sku: "CMP-RAHMEN-MINI", name: "Rahmen mini" },
  { sku: "CMP-BEIN-ONE", name: "Grundbein ONE" },
  { sku: "CMP-BEIN-ONEPLUS", name: "Grundbein ONE+" },
  { sku: "CMP-BEIN-MINI", name: "Grundbein mini" },
  { sku: "CMP-FLACHHUELSE-15", name: "Flachsteckhülse vollisoliert 1,5 mm²" },
  { sku: "CMP-ERDBRUECKE-15", name: "Erdungsdraht-Brücke 15 cm 1,5 mm²" },
  { sku: "CMP-KABELSCHUH-15", name: "Kabelschuh 1,5 mm²" },
  { sku: "CMP-ANSTECKKABEL", name: "Ansteckkabel" },
  { sku: "CMP-SCHR-M8X30", name: "Schraube M8×30" },
  { sku: "CMP-WR-350W", name: "Wechselrichter 350 W" },
  { sku: "CMP-KARTONAGE-MINI", name: "Kartonage mini" },
];

const DEACTIVATE = [
  "CMP-NIET-M4",
  "CMP-NIET-M8",
  "CMP-KABELH-15",
  "CMP-SCHR-M8-WR",
  "CMP-SCHR-SCHARNIER",
  "CMP-SCHR-RAHMEN",
  "CMP-RAHMEN",
];

async function renameIfExists(prisma: PrismaClient, sku: string, name: string) {
  const c = await prisma.component.findUnique({ where: { sku } });
  if (c) await prisma.component.update({ where: { sku }, data: { name } });
}

async function upsertProduct(prisma: PrismaClient, sku: string, name: string) {
  return prisma.product.upsert({
    where: { sku },
    update: {},
    create: { sku, name, priceNet: 0, taxRate: 19, stockQty: 0, minStock: 0, unit: "Stück", active: true },
  });
}

export async function seedModelsV2(prisma: PrismaClient): Promise<void> {
  // Idempotenz: einmalig. "Sustable ONE+" existiert nur nach dieser Migration.
  const already = await prisma.tableModel.findFirst({ where: { name: "Sustable ONE+" } });
  if (already) return;

  // 1) Neue Bauteile (aktiv)
  for (const c of NEW_COMPONENTS) {
    await prisma.component.upsert({
      where: { sku: c.sku },
      update: { active: true },
      create: { sku: c.sku, name: c.name, unit: "Stück", stockQty: 100, minStock: 10, active: true },
    });
  }

  // 2) Konsolidierung: Umbenennen
  await renameIfExists(prisma, "CMP-MODUL", "Modul (ONE/ONE+)");
  await renameIfExists(prisma, "CMP-KARTONAGE", "Kartonage (ONE/ONE+)");
  await renameIfExists(prisma, "CMP-MUTTER-SCHARNIER", "M4-Mutter");

  // 3) Ersetzte Altartikel stilllegen (Historie bleibt)
  await prisma.component.updateMany({ where: { sku: { in: DEACTIVATE } }, data: { active: false } });

  // 4) Fertigerzeugnisse
  const pOne = await upsertProduct(prisma, "PROD-SUS-ONE", "Sustable ONE");
  const pOnePlus = await upsertProduct(prisma, "PROD-SUS-ONEPLUS", "Sustable ONE+");
  const pMini = await upsertProduct(prisma, "PROD-SUS-MINI", "Sustable mini");

  // 5) Altes Modell archivieren (nicht löschen)
  const old = await prisma.tableModel.findFirst({ where: { name: "Sustable ONE" } });
  if (old) {
    await prisma.tableModel.update({
      where: { id: old.id },
      data: { name: "Sustable ONE (vor Umstellung)", active: false },
    });
  }

  // 6) Komponenten-ID-Auflösung
  const comps = await prisma.component.findMany();
  const compId = (sku: string): string => {
    const c = comps.find((x) => x.sku === sku);
    if (!c) throw new Error(`Bauteil ${sku} fehlt`);
    return c.id;
  };

  // 7) Modelle frisch bauen
  const build = async (name: string, productId: string, defs: StepDef[]) => {
    const exists = await prisma.tableModel.findFirst({ where: { name, active: true } });
    if (exists) return; // idempotent: kein Duplikat bei Teil-Wiederholung
    await prisma.tableModel.create({
      data: {
        name,
        description: "12-Schritte-Montage (Kleinteillager gemeinsam)",
        productId,
        active: true,
        steps: {
          create: defs.map((s) => ({
            order: s.order,
            title: s.title,
            instruction: s.instruction,
            requiresInput: s.requiresInput ?? false,
            inputLabel: s.inputLabel ?? null,
            bomItems: {
              create: s.bom
                .filter((b) => b.quantity > 0)
                .map((b) => ({ componentId: compId(b.sku), quantity: b.quantity })),
            },
          })),
        },
      },
    });
  };

  await build("Sustable ONE", pOne.id, steps(VARIANTS.ONE));
  await build("Sustable ONE+", pOnePlus.id, steps(VARIANTS.ONEPLUS));
  await build("Sustable mini", pMini.id, steps(VARIANTS.MINI));

  console.log("  Produktion: 3 Modelle (ONE/ONE+/mini) mit 12 Schritten angelegt; Altmodell archiviert.");
}
