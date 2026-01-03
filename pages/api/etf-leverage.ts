import type { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function sortETFs(etfs: any[], sortField: string, sortOrder: 'asc' | 'desc') {
  return etfs.sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]

    // Handle nulls
    if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1
    if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1

    const aNum = Number(aVal)
    const bNum = Number(bVal)

    if (sortOrder === 'desc') {
      // For descending: positive numbers first (largest to smallest), then negatives
      if (aNum >= 0 && bNum >= 0) return bNum - aNum
      if (aNum < 0 && bNum < 0) return bNum - aNum
      return aNum >= 0 ? -1 : 1
    } else {
      // For ascending: negatives first (smallest to largest), then positives
      if (aNum >= 0 && bNum >= 0) return aNum - bNum
      if (aNum < 0 && bNum < 0) return aNum - bNum
      return aNum < 0 ? -1 : 1
    }
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { leverageType, issuer, sortBy = 'assets', sortOrder = 'desc', limit = 100 } = req.query

  try {
    let where: any = {}

    // Build filter conditions
    if (leverageType && leverageType !== 'all') {
      where.etfLeverage = leverageType as string
    }

    if (issuer && issuer !== 'all') {
      where.issuer = issuer as string
    }

    // For numeric fields that might have negative values, get all data and sort client-side
    const isNumericField = ['ch1w', 'ch1m', 'ch6m', 'chYTD', 'ch1y', 'ch3y', 'ch5y', 'ch10y', 'allTimeLowChange', 'allTimeHighChange'].includes(sortBy as string)
    
    // Determine sort field for database
    const sortField = sortBy === 'assets' ? 'aum' : (sortBy as string)
    const order = sortOrder === 'asc' ? 'asc' : 'desc'

    // Query database with Prisma
    const etfs = await prisma.eTFData.findMany({
      where,
      ...(isNumericField ? {} : {
        orderBy: {
          [sortField]: order,
        },
      }),
      take: Number(limit),
    })

    // Client-side sort for numeric fields with mixed positive/negative values
    let sortedEtfs = etfs
    if (isNumericField) {
      sortedEtfs = sortETFs(etfs, sortField, sortOrder as 'asc' | 'desc')
    }

    // Transform Prisma data to API response format
    const formatted = sortedEtfs.map(etf => ({
      ticker: etf.ticker,
      etfLeverage: etf.etfLeverage,
      issuer: etf.issuer,
      assets: etf.aum ? Number(etf.aum) : 0,
      assetClass: etf.assetClass,
      expenseRatio: etf.expenseRatio ? Number(etf.expenseRatio) : null,
      peRatio: etf.peRatio ? Number(etf.peRatio) : null,
      close: etf.price ? Number(etf.price) : null,
      volume: etf.volume ? Number(etf.volume) : null,
      ch1w: etf.ch1w ? Number(etf.ch1w) : null,
      ch1m: etf.ch1m ? Number(etf.ch1m) : null,
      ch6m: etf.ch6m ? Number(etf.ch6m) : null,
      chYTD: etf.chYTD ? Number(etf.chYTD) : null,
      ch1y: etf.ch1y ? Number(etf.ch1y) : null,
      ch3y: etf.ch3y ? Number(etf.ch3y) : null,
      ch5y: etf.ch5y ? Number(etf.ch5y) : null,
      ch10y: etf.ch10y ? Number(etf.ch10y) : null,
      high52: etf.high52 ? Number(etf.high52) : null,
      low52: etf.low52 ? Number(etf.low52) : null,
      allTimeLow: etf.allTimeLow ? Number(etf.allTimeLow) : null,
      allTimeLowChange: etf.allTimeLowChange ? Number(etf.allTimeLowChange) : null,
      allTimeHigh: etf.allTimeHigh ? Number(etf.allTimeHigh) : null,
      allTimeHighDate: etf.allTimeHighDate,
      allTimeHighChange: etf.allTimeHighChange ? Number(etf.allTimeHighChange) : null,
      allTimeLowDate: etf.allTimeLowDate,
      lastUpdated: etf.lastUpdated.toISOString(),
      etfIndex: etf.etfIndex || null,
    }))

    // Get total count for pagination info
    const total = await prisma.eTFData.count({ where })

    return res.status(200).json({
      count: formatted.length,
      total,
      data: formatted,
    })
  } catch (error) {
    console.error('Error fetching ETF data from PostgreSQL:', error)
    res.status(500).json({ error: 'Failed to fetch ETF data' })
  } finally {
    await prisma.$disconnect()
  }
}
