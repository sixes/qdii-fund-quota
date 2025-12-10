import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use Query with partition key 'DELISTED_ETFS' for efficient access
    const params = {
      TableName: 'DelistedETFs',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: 'DELISTED_ETFS' }
      },
      ScanIndexForward: false  // Sort by sk in descending order (most recent first)
    }

    const data = await client.send(new QueryCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({ delistedETFs: [] })
    }

    const delistedETFs = data.Items.map(dbItem => {
      const item = unmarshall(dbItem)
      return {
        ticker: item.ticker,
        issuer: item.issuer || 'Unknown',
        aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum || 0,
        delistedDate: item.delistedDate,
        etfLeverage: item.etfLeverage || 'Unknown',
        expenseRatio: typeof item.expenseRatio === 'object' ? Number(item.expenseRatio) : item.expenseRatio || 0,
        etfIndex: item.etfIndex || '',
        assetClass: item.assetClass || '',
      }
    })

    res.status(200).json({ delistedETFs })
  } catch (error) {
    console.error('Error fetching delisted ETFs:', error)
    res.status(500).json({ error: 'Failed to fetch delisted ETFs' })
  }
}
