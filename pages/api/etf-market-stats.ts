import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MarketStats {
  totalAUM: number
  totalETFCount: number
  issuers: Array<{
    issuer: string
    aum: number
    count: number
  }>
  expenseRatios: Record<string, number>
  timestamp: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarketStats | { error: string }>
) {
  try {
    const globalStat = await prisma.marketStat.findUnique({
      where: { statKey: 'MARKET_STATS_TOTAL' },
    })

    const issuerStats = await prisma.marketStat.findMany({
      where: {
        statKey: {
          startsWith: 'ISSUER#',
        },
      },
    })

    const issuers = issuerStats
      .map(stat => ({
        issuer: stat.issuer || '',
        aum: stat.issuerAUM ? Number(stat.issuerAUM) : 0,
        count: stat.issuerCount || 0,
      }))
      .filter(i => i.issuer)
      .sort((a, b) => b.aum - a.aum)

    const marketStats: MarketStats = {
      totalAUM: globalStat?.totalAUM ? Number(globalStat.totalAUM) : 0,
      totalETFCount: globalStat?.totalETFCount || 0,
      issuers,
      expenseRatios: {},
      timestamp: globalStat?.createdAt?.toISOString() || new Date().toISOString(),
    }

    res.status(200).json(marketStats)
  } catch (error) {
    console.error('Error fetching ETF market statistics:', error)
    res.status(500).json({ error: 'Failed to fetch ETF market statistics' })
  } finally {
    await prisma.$disconnect()
  }
}
