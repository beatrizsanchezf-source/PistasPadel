import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeUserInput, validateUserInput, type UserInput } from "@/lib/user-validation";

const publicUserSelect = { id: true, name: true, email: true, phone: true, role: true } as const;

export type UserUseCaseResult<T> =
  | { kind: "invalid"; message: string }
  | { kind: "not_found" }
  | { kind: "last_admin" }
  | { kind: "duplicate_email" }
  | { kind: "saved"; user: T };

function isDuplicateEmail(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createUser(input: UserInput, database: PrismaClient = prisma): Promise<UserUseCaseResult<unknown>> {
  const validationError = validateUserInput(input, { passwordRequired: true });
  if (validationError) return { kind: "invalid", message: validationError };
  const normalized = normalizeUserInput(input);
  const passwordHash = await hashPassword(input.password as string);
  try {
    const user = await database.user.create({ data: { ...normalized, passwordHash }, select: publicUserSelect });
    return { kind: "saved", user };
  } catch (error) {
    if (isDuplicateEmail(error)) return { kind: "duplicate_email" };
    throw error;
  }
}

export async function updateUser(userId: string, input: UserInput, database: PrismaClient = prisma): Promise<UserUseCaseResult<unknown>> {
  const validationError = validateUserInput(input, { passwordRequired: false });
  if (validationError) return { kind: "invalid", message: validationError };
  const normalized = normalizeUserInput(input);
  const passwordHash = typeof input.password === "string" && input.password ? await hashPassword(input.password) : undefined;

  try {
    const user = await database.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      if (target.role === "ADMIN" && normalized.role === "CUSTOMER" && await transaction.user.count({ where: { role: "ADMIN" } }) === 1) throw new Error("LAST_ADMIN");
      const updated = await transaction.user.update({
        where: { id: userId },
        data: { ...normalized, ...(passwordHash ? { passwordHash } : {}) },
        select: publicUserSelect,
      });
      if (passwordHash) await transaction.session.deleteMany({ where: { userId } });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { kind: "saved", user };
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return { kind: "not_found" };
    if (error instanceof Error && error.message === "LAST_ADMIN") return { kind: "last_admin" };
    if (isDuplicateEmail(error)) return { kind: "duplicate_email" };
    throw error;
  }
}
