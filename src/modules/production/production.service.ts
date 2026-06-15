import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { componentService } from "@/modules/inventory/component.service";

const orderInclude = {
  tableModel: {
    include: {
      product: { select: { id: true, name: true, sku: true, stockQty: true } },
      steps: {
        orderBy: { order: "asc" },
        include: {
          bomItems: { include: { component: true } },
        },
      },
    },
  },
  stepLogs: { orderBy: { stepOrder: "asc" } },
} as const;

export const productionService = {
  listOrders() {
    return prisma.productionOrder.findMany({
      orderBy: { startedAt: "desc" },
      include: { tableModel: { select: { name: true } } },
    });
  },

  listActiveModels() {
    return prisma.tableModel.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { steps: true } } },
    });
  },

  async getById(id: string) {
    const order = await prisma.productionOrder.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw notFound("Produktionsauftrag nicht gefunden");
    return order;
  },

  async start(tableModelId: string) {
    const model = await prisma.tableModel.findUnique({
      where: { id: tableModelId },
      include: { _count: { select: { steps: true } } },
    });
    if (!model) throw notFound("Tischmodell nicht gefunden");
    if (model._count.steps === 0) throw new AppError("Dieses Modell hat noch keine Arbeitsschritte.");
    return prisma.productionOrder.create({
      data: { tableModelId, status: "IN_PROGRESS", currentStep: 1 },
    });
  },

  async saveSerial(id: string, serial: string) {
    const s = (serial ?? "").trim();
    if (!s) throw new AppError("Seriennummer darf nicht leer sein.");
    const dup = await prisma.productionOrder.findFirst({
      where: { serialNumber: s, NOT: { id } },
    });
    if (dup) throw new AppError("Diese Seriennummer ist bereits vergeben.");
    await this.getById(id);
    return prisma.productionOrder.update({ where: { id }, data: { serialNumber: s } });
  },

  /**
   * Auftrag abbrechen. Fix 1.1: bereits entnommene Bauteile werden per
   * Gegenbuchung (IN) ins Lager zurückgebucht – transaktional & idempotent
   * (nur ein IN_PROGRESS-Auftrag kann storniert werden).
   */
  async cancel(id: string) {
    const order = await this.getById(id);
    if (order.status !== "IN_PROGRESS") throw new AppError("Auftrag ist nicht in Bearbeitung.");

    const outMovements = await prisma.stockMovement.findMany({
      where: { referenceId: id, direction: "OUT" },
    });

    return prisma.$transaction(async (tx) => {
      for (const m of outMovements) {
        const back = Math.abs(m.quantity);
        if (back === 0) continue;
        await tx.stockMovement.create({
          data: {
            componentId: m.componentId,
            quantity: back,
            direction: "IN",
            reason: `Storno Produktionsabbruch ${id}`,
            referenceId: id,
          },
        });
        await tx.component.update({
          where: { id: m.componentId },
          data: { stockQty: { increment: back } },
        });
      }
      return tx.productionOrder.update({ where: { id }, data: { status: "CANCELLED" } });
    });
  },

  /**
   * Aktuellen Schritt abschließen: Bauteile transaktional ausbuchen,
   * StepLog schreiben, Fortschritt erhöhen; bei letztem Schritt fertigstellen.
   * Danach Mindestbestandsprüfung + ggf. Nachbestell-Mail.
   */
  async completeStep(id: string, expectedStep?: number) {
    const order = await this.getById(id);
    if (order.status !== "IN_PROGRESS") throw new AppError("Auftrag ist nicht in Bearbeitung.");

    const steps = order.tableModel.steps;
    const maxOrder = steps.length ? steps[steps.length - 1].order : 0;
    const step = steps.find((s) => s.order === order.currentStep);
    if (!step) throw new AppError("Kein offener Arbeitsschritt vorhanden.");

    // Fix 1.2: erwarteter Schritt muss dem aktuellen entsprechen (gegen Doppel-/Stale-Requests)
    if (expectedStep !== undefined && expectedStep !== order.currentStep) {
      throw new AppError("Dieser Schritt ist nicht aktuell – er wurde vermutlich schon abgeschlossen.", 409);
    }
    // Fix 1.2: kein zweites Log für denselben Schritt (Idempotenz)
    const existingLog = await prisma.productionStepLog.findFirst({
      where: { productionOrderId: id, stepOrder: step.order },
    });
    if (existingLog) {
      throw new AppError("Dieser Schritt wurde bereits gebucht.", 409);
    }

    if (step.requiresInput && !order.serialNumber) {
      throw new AppError(`${step.inputLabel ?? "Eingabe"} ist erforderlich, bevor du fortfahren kannst.`);
    }

    // Fix 1.3: Bestandsprüfung – kein Negativbestand, Schritt sonst blockieren
    const insufficient = step.bomItems.filter((b) => b.component.stockQty < b.quantity);
    if (insufficient.length > 0) {
      await componentService.notifyLowStock(insufficient.map((b) => b.componentId));
      const list = insufficient
        .map((b) => `${b.component.name} (benötigt ${b.quantity}, vorhanden ${b.component.stockQty})`)
        .join("; ");
      throw new AppError(`Nicht genug Bestand: ${list}. Bitte Wareneingang buchen.`, 409);
    }

    const isLast = step.order >= maxOrder;
    const touched: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const b of step.bomItems) {
        await tx.stockMovement.create({
          data: {
            componentId: b.componentId,
            quantity: -b.quantity,
            direction: "OUT",
            reason: `Produktion ${id} · Schritt ${step.order}: ${step.title}`,
            referenceId: id,
          },
        });
        await tx.component.update({
          where: { id: b.componentId },
          data: { stockQty: { decrement: b.quantity } },
        });
        touched.push(b.componentId);
      }

      await tx.productionStepLog.create({
        data: {
          productionOrderId: id,
          stepOrder: step.order,
          inputValue: step.requiresInput ? order.serialNumber : null,
        },
      });

      if (isLast) {
        await tx.productionOrder.update({
          where: { id },
          data: { currentStep: step.order + 1, status: "COMPLETED", completedAt: new Date() },
        });
        // Fertigerzeugnis verbuchen
        if (order.tableModel.productId) {
          await tx.product.update({
            where: { id: order.tableModel.productId },
            data: { stockQty: { increment: 1 } },
          });
        }
      } else {
        await tx.productionOrder.update({
          where: { id },
          data: { currentStep: step.order + 1 },
        });
      }
    });

    const lowStock = await componentService.notifyLowStock(touched);
    return { completed: isLast, lowStock };
  },
};
