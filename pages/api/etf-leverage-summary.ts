import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Scan ETFMarketStats for leverage type statistics with filter
    const params = {
      TableName: 'ETFMarketStats',
      FilterExpression: 'begins_with(pk, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': { S: 'LEVERAGE#' },
      },
    }

    const data = await client.send(new ScanCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({ summary: [] })
    }

    // Process and convert leverage statistics
    const summary = data.Items.map(dbItem => {
      const item = unmarshall(dbItem)
      const leverageType = item.leverageType || item.pk.replace('LEVERAGE#', '')

      // Sort by leverage multiplier for display order
      let sortOrder = 0
      if (leverageType.includes('3X')) sortOrder = leverageType.includes('-') ? -3 : 3
      else if (leverageType.includes('2X')) sortOrder = leverageType.includes('-') ? -2 : 2
      else if (leverageType.includes('-1X')) sortOrder = -1
      else if (leverageType === 'Long' || leverageType === 'Unlevered') sortOrder = 1

      return {
        leverageType,
        count: Number(item.count) || 0,
        totalAssets: typeof item.aum === 'object' ? Number(item.aum) : item.aum || 0,
        avgCh1m: null, // Summary stats not available in this table
        avgChYTD: null,
        avgCh1y: null,
        sortOrder,
      }
    })

    // Sort by leverage multiplier
    summary.sort((a, b) => b.sortOrder - a.sortOrder)

    res.status(200).json({ summary })
  } catch (error) {
    console.error('Error fetching ETF summary from DynamoDB:', error)
    res.status(500).json({ error: 'Failed to fetch ETF summary' })
  }
}
