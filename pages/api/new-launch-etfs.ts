import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const params = {
      TableName: 'NewLaunchETFs',
      Limit: 20,
    }

    const data = await client.send(new ScanCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({ newLaunchETFs: [] })
    }

    const newLaunchETFs = data.Items.map(dbItem => {
      const item = unmarshall(dbItem)
      return {
        ticker: item.ticker,
        issuer: item.issuer || 'Unknown',
        aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum || 0,
        inceptionDate: item.inceptionDate,
        etfIndex: item.etfIndex || '',
        assetClass: item.assetClass || '',
        expenseRatio: typeof item.expenseRatio === 'object' ? Number(item.expenseRatio) : item.expenseRatio || 0,
      }
    }).sort((a, b) => {
      // Sort by inception date (newest first)
      return new Date(b.inceptionDate).getTime() - new Date(a.inceptionDate).getTime()
    })

    res.status(200).json({ newLaunchETFs })
  } catch (error) {
    console.error('Error fetching new launch ETFs:', error)
    res.status(500).json({ error: 'Failed to fetch new launch ETFs' })
  }
}
