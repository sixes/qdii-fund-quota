import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Scan ETFMarketStats for issuer list with filter
    // pk starts with "ISSUER#", sk = "STATS"
    const params = {
      TableName: 'ETFMarketStats',
      FilterExpression: 'begins_with(pk, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': { S: 'ISSUER#' },
      },
      ProjectionExpression: 'issuer',
    }

    const data = await client.send(new ScanCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({ issuers: [] })
    }

    // Extract unique issuers
    const issuersSet = new Set<string>()
    data.Items.forEach(dbItem => {
      const item = unmarshall(dbItem)
      if (item.issuer) {
        issuersSet.add(item.issuer)
      }
    })

    const issuers = Array.from(issuersSet).sort()

    res.status(200).json({ issuers })
  } catch (error) {
    console.error('Error fetching issuers from DynamoDB:', error)
    res.status(500).json({ error: 'Failed to fetch issuers' })
  }
}
