import { PrismaClient } from '@prisma/client';

const globalDb = globalThis as unknown as { prisma?: PrismaClient };

// Reutiliza la conexión durante las recargas del servidor de desarrollo.
export const db = globalDb.prisma ?? new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalDb.prisma = db;
