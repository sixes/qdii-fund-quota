import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const delistedETFs = await prisma.delistedETF.findMany({
      orderBy: {
        delistedDate: 'desc',
      },
    })

    const formatted = delistedETFs.map(etf => ({
      ticker: etf.ticker,
      issuer: etf.issuer || 'Unknown',
      aum: etf.aum ? Number(etf.aum) : 0,
      delistedDate: etf.delistedDate.toISOString(),
      etfLeverage: etf.etfLeverage || 'Unknown',
      expenseRatio: etf.expenseRatio ? Number(etf.expenseRatio) : 0,
      etfIndex: etf.etfIndex || '',
      assetClass: etf.assetClass || '',
    }))

    res.status(200).json({ delistedETFs: formatted })
  } catch (error) {
    console.error('Error fetching delisted ETFs:', error)
    res.status(500).json({ error: 'Failed to fetch delisted ETFs' })
  } finally {
    await prisma.$disconnect()
  }
}
