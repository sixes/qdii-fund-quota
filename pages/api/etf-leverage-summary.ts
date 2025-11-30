import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const params = {
      TableName: 'ETFData',
    }

    const data = await client.send(new ScanCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({ summary: [] })
    }

    // Process and group by leverage type
    const leverageGroups: { [key: string]: any[] } = {}

    data.Items.forEach(dbItem => {
      const item = unmarshall(dbItem)
      const leverageType = item.etfLeverage || 'Unknown'

      if (!leverageGroups[leverageType]) {
        leverageGroups[leverageType] = []
      }

      leverageGroups[leverageType].push({
        ticker: item.ticker,
        assets: item.assets ? Number(item.assets) : 0,
        ch1m: item.ch1m ? Number(item.ch1m) : null,
        chYTD: item.chYTD ? Number(item.chYTD) : null,
        ch1y: item.ch1y ? Number(item.ch1y) : null,
      })
    })

    // Calculate summary statistics for each leverage type
    const summary = Object.keys(leverageGroups).map(leverageType => {
      const etfs = leverageGroups[leverageType]
      const count = etfs.length
      const totalAssets = etfs.reduce((sum, etf) => sum + etf.assets, 0)

      // Calculate average performance (excluding null values)
      const validCh1m = etfs.filter(e => e.ch1m !== null).map(e => e.ch1m)
      const validChYTD = etfs.filter(e => e.chYTD !== null).map(e => e.chYTD)
      const validCh1y = etfs.filter(e => e.ch1y !== null).map(e => e.ch1y)

      const avgCh1m = validCh1m.length > 0
        ? validCh1m.reduce((sum, val) => sum + val, 0) / validCh1m.length
        : null
      const avgChYTD = validChYTD.length > 0
        ? validChYTD.reduce((sum, val) => sum + val, 0) / validChYTD.length
        : null
      const avgCh1y = validCh1y.length > 0
        ? validCh1y.reduce((sum, val) => sum + val, 0) / validCh1y.length
        : null

      // Sort by leverage multiplier for display order
      let sortOrder = 0
      if (leverageType.includes('3X')) sortOrder = leverageType.includes('-') ? -3 : 3
      else if (leverageType.includes('2X')) sortOrder = leverageType.includes('-') ? -2 : 2
      else if (leverageType.includes('-1X')) sortOrder = -1
      else if (leverageType === 'Long') sortOrder = 1

      return {
        leverageType,
        count,
        totalAssets,
        avgCh1m,
        avgChYTD,
        avgCh1y,
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
