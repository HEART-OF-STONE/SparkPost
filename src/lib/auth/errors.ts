import { Prisma } from "@prisma/client";

const DATABASE_UNAVAILABLE_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
]);

export function isDatabaseUnavailableError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return true;
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    DATABASE_UNAVAILABLE_CODES.has(error.code)
  ) {
    return true;
  }

  return false;
}
