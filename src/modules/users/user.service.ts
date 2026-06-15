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

    return prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        active: data.active,
        passwordHash: data.password ? await hashPassword(data.password) : undefined,
      },
      select: publicSelect,
    });
  },

  async delete(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new AppError("Du kannst dein eigenes Konto nicht löschen.");
    }
    await prisma.user.delete({ where: { id } });
    return { success: true };
  },
};
