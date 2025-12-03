import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

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
    // Fetch all market statistics using Scan
    const scanResponse = await client.send(
      new ScanCommand({
        TableName: 'ETFMarketStats'
      })
    )

    const items = (scanResponse.Items || []).map(item => unmarshall(item))

    // Parse different stat types
    let globalStats: any = null
    const issuers: any[] = []
    const expenseRatios: Record<string, number> = {}

    items.forEach((item: any) => {
      if (item.pk === 'MARKET_STATS' && item.sk === 'TOTAL_AUM') {
        globalStats = item
      } else if (item.pk?.startsWith('ISSUER#')) {
        issuers.push({
          issuer: item.issuer,
          aum: Number(item.aum) || 0,
          count: Number(item.count) || 0
        })
      } else if (item.pk === 'MARKET_STATS' && item.sk?.startsWith('EXPENSE_RATIO#')) {
        expenseRatios[item.expenseRatioRange] = Number(item.count) || 0
      }
    })

    // Combine results
    const marketStats: MarketStats = {
      totalAUM: globalStats ? Number(globalStats.totalAUM) : 0,
      totalETFCount: globalStats ? Number(globalStats.totalETFCount) : 0,
      issuers: issuers.sort((a, b) => b.aum - a.aum), // Sort by AUM descending
      expenseRatios: expenseRatios,
      timestamp: globalStats?.timestamp || new Date().toISOString()
    }

    res.status(200).json(marketStats)
  } catch (error) {
    console.error('Error fetching ETF market statistics:', error)
    res.status(500).json({ error: 'Failed to fetch ETF market statistics' })
  }
}
