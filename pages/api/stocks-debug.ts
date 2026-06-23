import type { NextApiRequest, NextApiResponse } from 'next'
import { stockPrisma } from '../../lib/stockdb'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const envCheck = {
      STOCK_DATABASE_URL: process.env.STOCK_DATABASE_URL ? 'Set (hidden)' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    }

    // Try to query the database
    const count = await stockPrisma.stockPxChanged.count()
    
    // Get a sample record
    const sample = await stockPrisma.stockPxChanged.findFirst({
      orderBy: {
        date: 'desc'
      }
    })

    res.status(200).json({
      status: 'OK',
      environment: envCheck,
      database: {
        totalRecords: count,
        latestRecord: sample ? {
          ticker: sample.ticker,
          date: sample.date.toISOString().split('T')[0],
          market: sample.market
        } : null
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      environment: {
        STOCK_DATABASE_URL: process.env.STOCK_DATABASE_URL ? 'Set (hidden)' : 'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
      },
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      }
    })
  }
}
