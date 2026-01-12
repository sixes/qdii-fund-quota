import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import { cacheAsync } from '../../lib/cache'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const issuerList = await cacheAsync(
      'etf-issuers',
      async () => {
        const issuers = await prisma.eTFData.findMany({
          select: { issuer: true },
          distinct: ['issuer'],
        })

        return issuers
          .map(item => item.issuer)
          .filter(Boolean)
          .sort()
      },
      10 * 60 * 1000 // 10 minute cache
    )

    res.status(200).json({ issuers: issuerList })
  } catch (error) {
    console.error('Error fetching issuers from PostgreSQL:', error)
    res.status(500).json({ error: 'Failed to fetch issuers' })
  } finally {
    await prisma.$disconnect()
  }
}
