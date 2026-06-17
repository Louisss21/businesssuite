import { PrismaClient } from "@prisma/client";

// Öffentliche Beispiel-Assets (vom Admin durch echte Sustable-Dateien ersetzbar)
const SAMPLE_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
const SAMPLE_VIDEO = "https://www.w3schools.com/html/mov_bbb.mp4";

interface Comp {
  sku: string;
  name: string;
  unit?: string;
  stock?: number;
}

const COMPONENTS: Comp[] = [
  { sku: "CMP-MODUL", name: "Modul" },
  { sku: "CMP-NIET-M4", name: "Einnietmutter M4" },
  { sku: "CMP-NIET-M8", name: "Einnietmutter M8" },
  { sku: "CMP-SCHARNIER", name: "Scharnier" },
  { sku: "CMP-SCHR-SCHARNIER", name: "Schraube (Scharnier)" },
  { sku: "CMP-MUTTER-SCHARNIER", name: "Mutter (Scharnier)" },
  { sku: "CMP-SCHR-RAHMEN", name: "Schraube (Modul/Rahmen)" },
  { sku: "CMP-ENDKAPPE-4060", name: "Endkappe 40×60" },
  { sku: "CMP-ENDKAPPE-BEIN", name: "Endkappe (Bein)" },
  { sku: "CMP-KABEL-15M", name: "Kabel 1,5 m" },
  { sku: "CMP-ADERENDH-15", name: "Aderendhülse 1,5 mm²" },
  { sku: "CMP-KABELH-15", name: "Kabelhülse 1,5 mm²" },
  { sku: "CMP-STECKDOSE", name: "Platzhalter-Steckdose" },
  { sku: "CMP-HMS-CONN", name: "HMS Field Connector" },
  { sku: "CMP-NEUTRIK", name: "Neutrik-Einbaubuchse" },
  { sku: "CMP-KARTONAGE", name: "Kartonage" },
  { sku: "CMP-SCHR-M8X60", name: "Schraube M8×60" },
  { sku: "CMP-SCHR-M6", name: "Schraube M6" },
  { sku: "CMP-SCHR-M8-WR", name: "Schraube M8 (Wechselrichter)" },
  { sku: "CMP-GUMMINOPPE", name: "Gumminoppe" },
  { sku: "CMP-WR-HALTER", name: "Wechselrichter-Halter" },
  { sku: "CMP-WR-500W", name: "Wechselrichter 500 W" },
  { sku: "CMP-ROLLE", name: "Rolle" },
  { sku: "CMP-KURZANLEITUNG", name: "Kurzanleitung" },
  { sku: "CMP-ANLEITUNG", name: "Anleitung" },
  { sku: "CMP-RAHMEN", name: "Rahmen" },
];

interface StepDef {
  order: number;
  title: string;
  instruction: string;
  videoUrl?: string;
  pdfUrl?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  bom: { sku: string; quantity: number }[];
}

const STEPS: StepDef[] = [
  {
    order: 1,
    title: "Module bohren",
    instruction: "1× Modul entnehmen. Schablone ansetzen, passenden Bohrer einsetzen und das Modul bohren.",
    pdfUrl: SAMPLE_PDF,
    bom: [{ sku: "CMP-MODUL", quantity: 1 }],
  },
  {
    order: 2,
    title: "Einnietmuttern setzen",
    instruction: "9× Einnietmutter M4 und 9× Einnietmutter M8 entnehmen und mit dem Nietgerät setzen.",
    pdfUrl: SAMPLE_PDF,
    videoUrl: SAMPLE_VIDEO,
    bom: [
      { sku: "CMP-NIET-M4", quantity: 9 },
      { sku: "CMP-NIET-M8", quantity: 9 },
    ],
  },
  {
    order: 3,
    title: "Scharniere anschrauben",
    instruction: "3× Scharnier, 9× Schraube und 9× Mutter entnehmen, anschrauben und festziehen.",
    bom: [
      { sku: "CMP-SCHARNIER", quantity: 3 },
      { sku: "CMP-SCHR-SCHARNIER", quantity: 9 },
      { sku: "CMP-MUTTER-SCHARNIER", quantity: 9 },
    ],
  },
  {
    order: 4,
    title: "Rahmen kappen",
    instruction: "1× Rahmen nehmen, 8× Endkappe 40×60 entnehmen und mit dem Gummihammer in die Enden der Rechteckrohre einschlagen.",
    bom: [
      { sku: "CMP-RAHMEN", quantity: 1 },
      { sku: "CMP-ENDKAPPE-4060", quantity: 8 },
    ],
  },
  {
    order: 5,
    title: "Modul am Rahmen befestigen",
    instruction: "Modul in die Vorrichtung anhängen und mit Schrauben am Rahmen befestigen.",
    videoUrl: SAMPLE_VIDEO,
    // Hinweis (intern): Schraubenmenge als Platzhalter 4 gesetzt, im Modell-Editor anpassbar.
    bom: [{ sku: "CMP-SCHR-RAHMEN", quantity: 4 }],
  },
  {
    order: 6,
    title: "Beinkappen setzen",
    instruction: "2× Endkappe entnehmen und in die Beine einsetzen.",
    bom: [{ sku: "CMP-ENDKAPPE-BEIN", quantity: 2 }],
  },
  {
    order: 7,
    title: "Elektrobein montieren",
    instruction:
      "Kabel 1,5 m, 9× Aderendhülse 1,5 mm² und 1× Kabelhülse 1,5 mm² entnehmen und die Brücke bauen. Platzhalter-Steckdose, HMS Field Connector und Neutrik-Einbaubuchse entnehmen und montieren.",
    videoUrl: SAMPLE_VIDEO,
    bom: [
      { sku: "CMP-KABEL-15M", quantity: 1 },
      { sku: "CMP-ADERENDH-15", quantity: 9 },
      { sku: "CMP-KABELH-15", quantity: 1 },
      { sku: "CMP-STECKDOSE", quantity: 1 },
      { sku: "CMP-HMS-CONN", quantity: 1 },
      { sku: "CMP-NEUTRIK", quantity: 1 },
    ],
  },
  {
    order: 8,
    title: "Kartonage entnehmen",
    instruction: "1× Kartonage entnehmen.",
    bom: [{ sku: "CMP-KARTONAGE", quantity: 1 }],
  },
  {
    order: 9,
    title: "Seriennummer & Typenschild",
    instruction: "Typenschild am Bein ankleben. Seriennummer eingeben (Pflichtfeld!) und speichern. Ohne Eingabe ist der nächste Schritt gesperrt.",
    requiresInput: true,
    inputLabel: "Seriennummer",
    bom: [],
  },
  {
    order: 10,
    title: "Kartonage bepacken",
    instruction:
      "Schraubentüte packen: 8× M8×60 (Beine), 2× M6 (Wechselrichter-Montage), 1× M8 (Wechselrichter), 4× Gumminoppe, 1× Wechselrichter-Halter. Beipacken: 1× Wechselrichter 500 W, 2× Rolle, 1× Kurzanleitung, 1× Anleitung, fertig montiertes Elektrobein, 1× Kabel.",
    bom: [
      { sku: "CMP-SCHR-M8X60", quantity: 8 },
      { sku: "CMP-SCHR-M6", quantity: 2 },
      { sku: "CMP-SCHR-M8-WR", quantity: 1 },
      { sku: "CMP-GUMMINOPPE", quantity: 4 },
      { sku: "CMP-WR-HALTER", quantity: 1 },
      { sku: "CMP-WR-500W", quantity: 1 },
      { sku: "CMP-ROLLE", quantity: 2 },
      { sku: "CMP-KURZANLEITUNG", quantity: 1 },
      { sku: "CMP-ANLEITUNG", quantity: 1 },
      { sku: "CMP-KABEL-15M", quantity: 1 },
    ],
  },
  {
    order: 11,
    title: "Fertigstellung",
    instruction: "Tisch als Fertigerzeugnis verbuchen. Die verbaute Ware ist ausgebucht, die Mindestbestandsprüfung wird ausgelöst.",
    bom: [],
  },
];

export async function seedProduction(prisma: PrismaClient): Promise<void> {
  // Bauteile (idempotent per SKU; Bestand bleibt bei Updates erhalten)
  for (const c of COMPONENTS) {
    await prisma.component.upsert({
      where: { sku: c.sku },
      update: {},
      create: { sku: c.sku, name: c.name, unit: c.unit ?? "Stück", stockQty: c.stock ?? 100, minStock: 10 },
    });
  }

  // Fertigerzeugnis als Produkt
  const product = await prisma.product.upsert({
    where: { sku: "SUSTABLE-ONE" },
    update: {},
    create: {
      sku: "SUSTABLE-ONE",
      name: "Sustable ONE",
      description: "Höhenverstellbarer Tisch – Eigenfertigung",
      priceNet: 1490,
      taxRate: 19,
      stockQty: 0,
      minStock: 0,
      unit: "Stück",
    },
  });

  // Modell nur einmal anlegen (Schritte/BOM sonst doppelt)
  const existing = await prisma.tableModel.findFirst({ where: { name: "Sustable ONE" } });
  if (existing) return;

  const comps = await prisma.component.findMany();
  const compId = (sku: string): string => {
    const c = comps.find((x) => x.sku === sku);
    if (!c) throw new Error(`Bauteil ${sku} fehlt im Seed`);
    return c.id;
  };

  await prisma.tableModel.create({
    data: {
      name: "Sustable ONE",
      description: "Standard-Montage in 11 Schritten",
      productId: product.id,
      steps: {
        create: STEPS.map((s) => ({
          order: s.order,
          title: s.title,
          instruction: s.instruction,
          videoUrl: s.videoUrl ?? null,
          pdfUrl: s.pdfUrl ?? null,
          requiresInput: s.requiresInput ?? false,
          inputLabel: s.inputLabel ?? null,
          bomItems: {
            create: s.bom.map((b) => ({ componentId: compId(b.sku), quantity: b.quantity })),
          },
        })),
      },
    },
  });

  console.log("  Produktion: Modell 'Sustable ONE' mit 11 Schritten + Bauteilen angelegt");
}
