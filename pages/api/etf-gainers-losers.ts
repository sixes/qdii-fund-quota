import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

interface ETFGainerLoser {
  ticker: string
  etf_ticker: string
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

    // Fetch all pre-computed gainers and losers data
    const scanParams = {
      TableName: 'ETFGainersLosers',
    }

    const data = await client.send(new ScanCommand(scanParams))
    const items = (data.Items || []).map(item => unmarshall(item))

    // Initialize arrays for each period
    for (const period of periods) {
      gainers[period] = []
      losers[period] = []
    }

    // Organize items by period and type
    for (const item of items) {
      const period = item.period
      const rankType = item.rank_type

      if (!period || !rankType) continue

      const etf: ETFGainerLoser = {
        ticker: item.etf_ticker,
        etf_ticker: item.etf_ticker,
        issuer: item.issuer || 'Unknown',
        etfLeverage: item.etfLeverage || '',
        etfIndex: item.etfIndex || '',
        aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum || 0,
        return: typeof item.return === 'object' ? Number(item.return) : item.return || 0,
      }

      if (rankType === 'gainer' && gainers[period]) {
        gainers[period].push(etf)
      } else if (rankType === 'loser' && losers[period]) {
        losers[period].push(etf)
      }
    }

    // Sort by rank and limit to top 10 for display
    for (const period of periods) {
      gainers[period] = gainers[period]
        .sort((a, b) => b.return - a.return) // Descending: highest gains first
        .slice(0, 10)
      losers[period] = losers[period]
        .sort((a, b) => a.return - b.return) // Ascending: lowest first (biggest losses)
        .slice(0, 10)
    }

    res.status(200).json({
      gainers,
      losers,
    })
  } catch (error) {
    console.error('Error fetching gainers/losers:', error)
    res.status(500).json({ error: 'Failed to fetch gainers/losers' })
  }
}
