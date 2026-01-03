import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ETFGainerLoser {
  ticker: string
  issuer: string
  etfLeverage: string
  etfIndex: string
  aum: number
  return: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const periods = ['ch1w', 'ch1m', 'ch6m', 'ch1y', 'ch3y', 'ch5y', 'ch10y', 'chYTD']
    const gainers: Record<string, ETFGainerLoser[]> = {}
    const losers: Record<string, ETFGainerLoser[]> = {}

    for (const period of periods) {
      const periodData = await prisma.gainerLoser.findMany({
        where: { period },
        orderBy: {
          rank: 'asc',
        },
      })

      gainers[period] = []
      losers[period] = []

      for (const item of periodData) {
        const etf: ETFGainerLoser = {
          ticker: item.ticker,
          issuer: item.issuer || 'Unknown',
          etfLeverage: item.etfLeverage || '',
          etfIndex: item.etfIndex || '',
          aum: item.aum ? Number(item.aum) : 0,
          return: Number(item.returnValue) || 0,
        }

        if (item.rankType === 'gainer') {
          gainers[period].push(etf)
        } else if (item.rankType === 'loser') {
          losers[period].push(etf)
        }
      }

      gainers[period] = gainers[period].slice(0, 10)
      losers[period] = losers[period].slice(0, 10)
    }

    res.status(200).json({
      gainers,
      losers,
    })
  } catch (error) {
    console.error('Error fetching gainers/losers:', error)
    res.status(500).json({ error: 'Failed to fetch gainers/losers' })
  } finally {
    await prisma.$disconnect()
  }
}
