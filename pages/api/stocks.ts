import type { NextApiRequest, NextApiResponse } from 'next'
import { stockPrisma } from '../../lib/stockdb'

function getTodayDateStr() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const dateStr = (req.query.date as string) || getTodayDateStr()
  
  try {
    // Check if database URL is configured
    if (!process.env.STOCK_DATABASE_URL) {
      console.error('STOCK_DATABASE_URL environment variable is not set')
      return res.status(500).json({ error: 'Database not configured' })
    }

    const targetDate = new Date(dateStr)
    
    const stockData = await stockPrisma.stockPxChanged.findMany({
      where: {
        date: targetDate,
      },
      orderBy: {
        changePercentage: 'desc',
      },
    })
    
    console.log(`Found ${stockData.length} stocks for date ${dateStr}`)
    
    const stocks = stockData.map((item) => ({
      ticker: item.ticker,
      name: item.name || undefined,
      date: item.date.toISOString().split('T')[0],
      market: item.market,
      lastClosingPrice: item.closingPrice ? Number(item.closingPrice).toFixed(2) : undefined,
      lastChangePercent: item.changePercentage ? Number(item.changePercentage).toFixed(2) : undefined,
      changeFromAthPercent: item.chgPctSoFar ? Number(item.chgPctSoFar).toFixed(2) : undefined,
      allTimeHigh: item.highestPx ? Number(item.highestPx).toFixed(2) : undefined,
    }))
    
    res.status(200).json(stocks)
  } catch (error) {
    console.error('Error fetching stock data from PostgreSQL:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      date: dateStr,
      dbUrl: process.env.STOCK_DATABASE_URL ? 'Set' : 'Not set'
    })
    res.status(500).json({ 
      error: 'Failed to fetch stock data',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}