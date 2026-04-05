import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export class DatabaseUnavailableError extends Error {
  constructor(message = "DATABASE_URL is not configured.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getPrismaClient() {
  if (!hasDatabaseUrl()) {
    return createUnavailablePrismaProxy();
  }

  const client = global.prisma || createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.prisma = client;
  }

  return client;
}

function createUnavailablePrismaProxy() {
  const errorFactory = () => new DatabaseUnavailableError();

  const proxy = new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "$disconnect") {
          return async () => undefined;
        }

        if (property === "$connect") {
          return async () => {
            throw errorFactory();
          };
        }

        return new Proxy(
          {},
          {
            get() {
              return async () => {
                throw errorFactory();
              };
            },
          },
        );
      },
    },
  );

  return proxy as PrismaClient;
}

export const prisma = getPrismaClient();