import { PrismaClient } from '@prisma/client'

declare global {
  var stockPrisma: PrismaClient | undefined
}

if (!global.stockPrisma) {
  global.stockPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.STOCK_DATABASE_URL,
      },
    },
  })
}

export const stockPrisma = global.stockPrisma
