import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * One Prisma client per process.
 *
 * Next.js re-evaluates modules on every hot reload in development, which would
 * otherwise open a fresh connection pool each time; caching the instance on
 * `globalThis` keeps it to one. Production gets a plain module singleton.
 */

declare global {
  var __weekendcartPrisma: PrismaClient | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres database.",
    );
  }

  const adapter = new PrismaPg({ connectionString, max: 10 });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const db: PrismaClient = globalThis.__weekendcartPrisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalThis.__weekendcartPrisma = db;

export type { PrismaClient };
