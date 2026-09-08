import { PrismaClient } from '@prisma/client';

// Se crea la instancia global de Prisma Client
export const db = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

