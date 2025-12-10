import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
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
    // Query for global stats (pk = "MARKET_STATS")
    const globalStatsResponse = await client.send(
      new QueryCommand({
        TableName: 'ETFMarketStats',
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: 'MARKET_STATS' },
        },
      })
    )

    let globalStats: any = null
    const expenseRatios: Record<string, number> = {}

    // Process global stats and expense ratios
    if (globalStatsResponse.Items) {
      globalStatsResponse.Items.forEach(dbItem => {
        const item = unmarshall(dbItem)
        if (item.sk === 'TOTAL_AUM') {
          globalStats = item
        } else if (item.sk?.startsWith('EXPENSE_RATIO#')) {
          expenseRatios[item.expenseRatioRange] = Number(item.count) || 0
        }
      })
    }

    // Scan for issuer stats since pk varies (ISSUER#{issuer})
    const issuersResponse = await client.send(
      new ScanCommand({
        TableName: 'ETFMarketStats',
        FilterExpression: 'begins_with(pk, :pkPrefix) AND sk = :sk',
        ExpressionAttributeValues: {
          ':pkPrefix': { S: 'ISSUER#' },
          ':sk': { S: 'STATS' },
        },
      })
    )

    const issuers: any[] = []
    if (issuersResponse.Items) {
      issuersResponse.Items.forEach(dbItem => {
        const item = unmarshall(dbItem)
        issuers.push({
          issuer: item.issuer,
          aum: Number(item.aum) || 0,
          count: Number(item.count) || 0,
        })
      })
    }

    // Combine results
    const marketStats: MarketStats = {
      totalAUM: globalStats ? Number(globalStats.totalAUM) : 0,
      totalETFCount: globalStats ? Number(globalStats.totalETFCount) : 0,
      issuers: issuers.sort((a, b) => b.aum - a.aum), // Sort by AUM descending
      expenseRatios: expenseRatios,
      timestamp: globalStats?.timestamp || new Date().toISOString(),
    }

    res.status(200).json(marketStats)
  } catch (error) {
    console.error('Error fetching ETF market statistics:', error)
    res.status(500).json({ error: 'Failed to fetch ETF market statistics' })
  }
}
