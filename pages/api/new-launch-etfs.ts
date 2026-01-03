import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const newLaunchETFs = await prisma.newLaunchETF.findMany({
      orderBy: {
        inceptionDate: 'desc',
      },
    })

    const formatted = newLaunchETFs.map(etf => ({
      ticker: etf.ticker,
      issuer: etf.issuer || 'Unknown',
      aum: etf.aum ? Number(etf.aum) : 0,
      inceptionDate: etf.inceptionDate,
      etfIndex: etf.etfIndex || '',
      assetClass: etf.assetClass || '',
      expenseRatio: etf.expenseRatio ? Number(etf.expenseRatio) : 0,
    }))

    res.status(200).json({ newLaunchETFs: formatted })
  } catch (error) {
    console.error('Error fetching new launch ETFs:', error)
    res.status(500).json({ error: 'Failed to fetch new launch ETFs' })
  } finally {
    await prisma.$disconnect()
  }
}
