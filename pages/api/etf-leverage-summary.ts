import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const leverageStats = await prisma.marketStat.findMany({
      where: {
        statKey: {
          startsWith: 'LEVERAGE#',
        },
      },
    })

    const summary = leverageStats.map(stat => {
      const leverageType = stat.leverageType || stat.statKey.replace('LEVERAGE#', '')

      let sortOrder = 0
      if (leverageType.includes('3X')) sortOrder = leverageType.includes('-') ? -3 : 3
      else if (leverageType.includes('2X')) sortOrder = leverageType.includes('-') ? -2 : 2
      else if (leverageType.includes('-1X')) sortOrder = -1
      else if (leverageType === 'Long' || leverageType === 'Unlevered') sortOrder = 1

      return {
        leverageType,
        count: stat.leverageCount || 0,
        totalAssets: stat.leverageAUM ? Number(stat.leverageAUM) : 0,
        avgCh1m: null,
        avgChYTD: null,
        avgCh1y: null,
        sortOrder,
      }
    })

    summary.sort((a, b) => b.sortOrder - a.sortOrder)

    res.status(200).json({ summary })
  } catch (error) {
    console.error('Error fetching ETF summary from PostgreSQL:', error)
    res.status(500).json({ error: 'Failed to fetch ETF summary' })
  } finally {
    await prisma.$disconnect()
  }
}
