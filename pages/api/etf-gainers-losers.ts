import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
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

    // Query each period's gainers and losers using partition key
    for (const period of periods) {
      const queryParams = {
        TableName: 'ETFGainersLosers',
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `PERIOD#${period}` }
        }
      }

      const response = await client.send(new QueryCommand(queryParams))
      const items = (response.Items || []).map(item => unmarshall(item))

      // Initialize arrays
      gainers[period] = []
      losers[period] = []

      // Separate and organize gainers and losers
      for (const item of items) {
        const etf: ETFGainerLoser = {
          ticker: item.etf_ticker,
          etf_ticker: item.etf_ticker,
          issuer: item.issuer || 'Unknown',
          etfLeverage: item.etfLeverage || '',
          etfIndex: item.etfIndex || '',
          aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum || 0,
          return: typeof item.return === 'object' ? Number(item.return) : item.return || 0,
        }

        if (item.rank_type === 'gainer') {
          gainers[period].push(etf)
        } else if (item.rank_type === 'loser') {
          losers[period].push(etf)
        }
      }

      // Sort by return value (descending for gainers, ascending for losers) and limit to top 10
      gainers[period] = gainers[period]
        .sort((a, b) => b.return - a.return)
        .slice(0, 10)
      losers[period] = losers[period]
        .sort((a, b) => a.return - b.return)
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
