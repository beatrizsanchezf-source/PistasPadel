import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, readJson } from "@/lib/http";
import { normalizeUserInput, validateUserInput, type UserInput } from "@/lib/user-validation";

/** Lista usuarios sin datos de contraseña; requiere rol `ADMIN`. */
export async function GET() {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  return NextResponse.json(users);
}

/** Crea una cuenta validada con contraseña hasheada; requiere rol `ADMIN`. */
export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return errorResponse("No autorizado.", 403); }
  const body = await readJson<UserInput>(request);
  const validationError = body ? validateUserInput(body, { passwordRequired: true }) : "Los datos del usuario no son válidos.";
  if (validationError) return errorResponse(validationError, 400);
  const userInput = normalizeUserInput(body!);
  try {
    const user = await prisma.user.create({ data: { ...userInput, passwordHash: await hashPassword(body!.password as string) }, select: { id: true, name: true, email: true, phone: true, role: true } });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return errorResponse("Ya existe un usuario con ese correo.", 409);
    }
    console.error("No se ha podido crear el cliente.", error);
    return errorResponse("No se ha podido crear el cliente.", 500);
  }
}
