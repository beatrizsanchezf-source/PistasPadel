import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMissingPasswordResetEmailConfig, sendPasswordResetEmail } from "@/lib/password-reset-email";
import { errorResponse, isRecord, readJson } from "@/lib/http";

const tokenLifetimeMs = 30 * 60 * 1000;
const acceptedMessage = "Si el correo está asociado a una cuenta, recibirás un enlace para restablecer la contraseña.";

function isValidEmail(value: string) {
  const [localPart, domain, ...extra] = value.trim().split("@");
  return extra.length === 0
    && Boolean(localPart && domain)
    && localPart.length <= 64
    && domain.length <= 253
    && domain.includes(".")
    && !/\s/.test(value);
}

export async function POST(request: NextRequest) {
  const body = await readJson<unknown>(request);
  if (!isRecord(body) || typeof body.email !== "string" || body.email.length > 254 || !isValidEmail(body.email)) {
    return errorResponse("Introduce un correo electrónico válido.", 400);
  }
  const missingConfig = getMissingPasswordResetEmailConfig();
  if (missingConfig.length) return errorResponse(`Configura en .env: ${missingConfig.join(", ")}.`, 503);

  let appUrl: URL;
  try {
    appUrl = new URL(process.env.APP_URL!);
    if (!(["http:", "https:"].includes(appUrl.protocol)) || (process.env.NODE_ENV === "production" && appUrl.protocol !== "https:")) throw new Error("Invalid URL protocol");
  } catch {
    return errorResponse("La URL de la aplicación no está configurada correctamente.", 503);
  }

  const email = body.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ message: acceptedMessage }, { status: 202 });

  const now = new Date();
  const recentToken = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - 60_000) } },
    select: { tokenHash: true },
  });
  if (recentToken) return NextResponse.json({ message: acceptedMessage }, { status: 202 });

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(now.getTime() + tokenLifetimeMs);
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });

  appUrl.searchParams.set("resetToken", token);
  try {
    await sendPasswordResetEmail(user.email, appUrl.toString());
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    console.error("No se pudo entregar un correo de restablecimiento.", error);
  }

  return NextResponse.json({ message: acceptedMessage }, { status: 202 });
}
