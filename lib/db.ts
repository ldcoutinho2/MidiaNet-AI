import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function runtimeDatabaseUrl() {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;

  // Neon/Render: recycle idle pooled connections before they can become stale.
  // Also give Neon enough time to wake/connect after an idle period.
  const params = new URLSearchParams({
    connection_limit: "5",
    pool_timeout: "20",
    connect_timeout: "15",
    max_idle_connection_lifetime: "60",
  });

  return `${base}${base.includes("?") ? "&" : "?"}${params.toString()}`;
}

const databaseUrl = runtimeDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
