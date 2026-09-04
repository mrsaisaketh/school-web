import { PrismaClient } from '@prisma/client';

// A single client per process. Module scope already gives us one instance per
// warm lambda; the globalThis cache additionally survives `node --watch`
// reloads in development, which would otherwise leak a pool on every restart.
const globalForPrisma = globalThis;

export const db =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

globalForPrisma.__prisma = db;
