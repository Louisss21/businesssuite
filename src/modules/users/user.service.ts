import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AppError, notFound } from "@/lib/http";
import { hashPassword } from "@/lib/auth";
import { userInviteSchema, userUpdateSchema } from "./user.schema";

const publicSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export const userService = {
  list() {
    return prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: publicSelect,
    });
  },

  async invite(input: unknown) {
    const data = userInviteSchema.parse(input);
    const passwordHash = data.password ? await hashPassword(data.password) : "";
    try {
      return await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          role: data.role,
          passwordHash,
        },
        select: publicSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new AppError("E-Mail ist bereits vergeben.", 409);
      }
      throw e;
    }
  },

  async update(id: string, input: unknown, currentUserId: string) {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound("Benutzer nicht gefunden");
    const data = userUpdateSchema.parse(input);

    // Sich selbst nicht deaktivieren / sich selbst die Admin-Rolle entziehen
    if (id === currentUserId && (data.active === false || (data.role && data.role !== "ADMIN"))) {
      throw new AppError("Du kannst dein eigenes Konto nicht deaktivieren oder herabstufen.");
    }

    // Selbst-Aussperr-Schutz: der letzte aktive ADMIN darf nicht deaktiviert
    // oder herabgestuft werden (sonst kommt niemand mehr in die Einstellungen).
    const willLoseAdmin = data.active === false || (data.role !== undefined && data.role !== "ADMIN");
    if (target.role === "ADMIN" && target.active && willLoseAdmin) {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
      if (activeAdmins <= 1) {
        throw new AppError(
          "Der letzte aktive Administrator kann nicht deaktiviert oder herabgestuft werden.",
        );
      }
    }

    try {
      return await prisma.user.update({
        where: { id },
        data: {
          email: data.email ? data.email.toLowerCase() : undefined,
          name: data.name,
          role: data.role,
          active: data.active,
          passwordHash: data.password ? await hashPassword(data.password) : undefined,
        },
        select: publicSelect,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new AppError("E-Mail ist bereits vergeben.", 409);
      }
      throw e;
    }
  },

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new AppError("Du kannst dein eigenes Konto nicht löschen.");
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw notFound("Benutzer nicht gefunden");
    // Selbst-Aussperr-Schutz: letzten aktiven ADMIN nicht löschen.
    if (target.role === "ADMIN" && target.active) {
      const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true } });
      if (activeAdmins <= 1) {
        throw new AppError("Der letzte aktive Administrator kann nicht gelöscht werden.");
      }
    }
    await prisma.user.delete({ where: { id } });
    return { success: true };
  },
};
