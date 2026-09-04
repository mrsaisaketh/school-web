import { PrismaClient } from '@prisma/client';

// On Vercel each warm lambda re-imports this module; without the global cache
// every invocation would open a fresh pool and exhaust Postgres connections.
const globalForPrisma = globalThis;

export const db =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.__prisma = db;
