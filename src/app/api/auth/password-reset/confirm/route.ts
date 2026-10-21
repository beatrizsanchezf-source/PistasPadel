import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { NextRequest } from "next/server";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { errorResponse, isRecord, readJson } from "@/lib/http";

export async function POST(request: NextRequest) {
  const body = await readJson<unknown>(request);
  if (!isRecord(body) || typeof body.token !== "string" || typeof body.password !== "string") {
    return errorResponse("El enlace o la contraseña no son válidos.", 400);
  }
  if (body.password.length < 12 || body.password.length > 128) {
    return errorResponse("La contraseña debe tener entre 12 y 128 caracteres.", 400);
  }

  const tokenHash = createHash("sha256").update(body.token).digest("hex");
  const passwordHash = await hashPassword(body.password);
  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true } });
      if (!token) throw new Error("INVALID_RESET_TOKEN");

      const consumed = await tx.passwordResetToken.deleteMany({ where: { tokenHash, expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new Error("INVALID_RESET_TOKEN");

      await tx.user.update({ where: { id: token.userId }, data: { passwordHash } });
      await tx.session.deleteMany({ where: { userId: token.userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: token.userId } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Error && (error.message === "INVALID_RESET_TOKEN" || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034"))) {
      return errorResponse("El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.", 400);
    }
    console.error("No se pudo restablecer la contraseña.", error);
    return errorResponse("No se pudo restablecer la contraseña.", 500);
  }

  return Response.json({ message: "La contraseña se ha cambiado. Ya puedes iniciar sesión." });
}
