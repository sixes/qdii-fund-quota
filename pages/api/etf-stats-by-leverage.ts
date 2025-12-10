import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Query all leverage type statistics (each leverage type has its own partition)
    const leverageResponse = await client.send(
      new ScanCommand({
        TableName: 'ETFMarketStats',
        FilterExpression: 'begins_with(pk, :pkPrefix) AND sk = :sk',
        ExpressionAttributeValues: {
          ':pkPrefix': { S: 'LEVERAGE#' },
          ':sk': { S: 'STATS' },
        },
      })
    )

    // Process leverage stats
    const leverageStats = (leverageResponse.Items || []).map(dbItem => {
      const item = unmarshall(dbItem)
      return {
        leverageType: item.leverageType || item.pk.replace('LEVERAGE#', ''),
        aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum,
        count: item.count || 0,
        timestamp: item.timestamp,
      }
    }).sort((a, b) => {
      // Sort by leverage multiplier (descending)
      const getLeverageValue = (type: string) => {
        const isShort = type.includes('-')
        // Check more specific values first to avoid substring matches
        if (type.includes('4X')) return isShort ? -4 : 4
        if (type.includes('3X')) return isShort ? -3 : 3
        if (type.includes('1.5X')) return isShort ? -1.5 : 1.5
        if (type.includes('1.25X')) return isShort ? -1.25 : 1.25
        if (type.includes('1.2X')) return isShort ? -1.2 : 1.2
        if (type.includes('2X')) return isShort ? -2 : 2
        if (type.includes('0.5X')) return isShort ? -0.5 : 0.5
        if (type === '-1X Short' || type === '-1X') return -1
        if (type === 'Long' || type === 'Unlevered') return 1
        return 0
      }
      return getLeverageValue(b.leverageType) - getLeverageValue(a.leverageType)
    })

    // Query for issuer-leverage data by partition key
    const issuerLeverageResponse = await client.send(
      new ScanCommand({
        TableName: 'ETFMarketStats',
        FilterExpression: 'begins_with(pk, :pkPrefix) AND begins_with(sk, :skPrefix)',
        ExpressionAttributeValues: {
          ':pkPrefix': { S: 'ISSUER#' },
          ':skPrefix': { S: 'LEVERAGE#' },
        },
      })
    )

    // Organize issuer data by leverage type
    const issuerByLeverage: {
      [leverageType: string]: Array<{
        issuer: string
        aum: number
        count: number
      }>
    } = {}

    if (issuerLeverageResponse.Items) {
      issuerLeverageResponse.Items.forEach(dbItem => {
        const item = unmarshall(dbItem)
        const leverageType = item.sk.replace('LEVERAGE#', '')

        if (!issuerByLeverage[leverageType]) {
          issuerByLeverage[leverageType] = []
        }

        issuerByLeverage[leverageType].push({
          issuer: item.issuer,
          aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum,
          count: item.count || 0,
        })
      })

      // Sort issuers within each leverage type by AUM (descending)
      Object.keys(issuerByLeverage).forEach(leverageType => {
        issuerByLeverage[leverageType].sort((a, b) => b.aum - a.aum)
      })
    }

    res.status(200).json({ leverageStats, issuerByLeverage })
  } catch (error) {
    console.error('Error fetching leverage statistics from DynamoDB:', error)
    res.status(500).json({ error: 'Failed to fetch leverage statistics' })
  }
}
