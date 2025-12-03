import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { leverageType, issuer, sortBy = 'assets', sortOrder = 'desc', limit = 100 } = req.query

  try {
    let params: any

    // If leverageType is specified, use GSI query for better performance
    if (leverageType && leverageType !== 'all') {
      params = {
        TableName: 'ETFData',
        IndexName: 'etfLeverage-index',
        KeyConditionExpression: 'etfLeverage = :leverage',
        ExpressionAttributeValues: {
          ':leverage': { S: leverageType as string },
        },
      }

      const data = await client.send(new QueryCommand(params))
      console.log(data.Items.length)
      let etfs = processETFData(data.Items || [])

      // Filter by issuer if specified
      if (issuer && issuer !== 'all') {
        etfs = etfs.filter(etf => etf.issuer === issuer)
      }

      const sorted = sortETFs(etfs, sortBy as string, sortOrder as string)
      const limited = sorted.slice(0, Number(limit))

      return res.status(200).json({
        count: limited.length,
        total: etfs.length,
        data: limited,
      })
    } else {
      // Scan entire table (for 'all' or no filter) with pagination
      params = {
        TableName: 'ETFData',
      }

      let allItems: any[] = []
      let lastEvaluatedKey: any = undefined

      do {
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = lastEvaluatedKey
        }
        const data = await client.send(new ScanCommand(params))
        allItems.push(...(data.Items || []))
        lastEvaluatedKey = data.LastEvaluatedKey
      } while (lastEvaluatedKey)

      console.log('api return etf count', allItems.length)
      let etfs = processETFData(allItems)

      // Filter by issuer if specified
      if (issuer && issuer !== 'all') {
        etfs = etfs.filter(etf => etf.issuer === issuer)
      }

      const sorted = sortETFs(etfs, sortBy as string, sortOrder as string)
      const limited = sorted.slice(0, Number(limit))

      return res.status(200).json({
        count: limited.length,
        total: etfs.length,
        data: limited,
      })
    }
  } catch (error) {
    console.error('Error fetching ETF data from DynamoDB:', error)
    res.status(500).json({ error: 'Failed to fetch ETF data' })
  }
}

function processETFData(items: any[]): any[] {
  return items.map(dbItem => {
    const item = unmarshall(dbItem)
    return {
      ticker: item.ticker,
      etfLeverage: item.etfLeverage,
      issuer: item.issuer,
      assets: item.aum ? Number(item.aum) : 0,
      assetClass: item.assetClass,
      expenseRatio: item.expenseRatio ? Number(item.expenseRatio) : null,
      peRatio: item.peRatio ? Number(item.peRatio) : null,
      close: item.price ? Number(item.price) : null,
      volume: item.volume ? Number(item.volume) : null,
      ch1w: item.ch1w ? Number(item.ch1w) : null,
      ch1m: item.ch1m ? Number(item.ch1m) : null,
      ch6m: item.ch6m ? Number(item.ch6m) : null,
      chYTD: item.chYTD ? Number(item.chYTD) : null,
      ch1y: item.ch1y ? Number(item.ch1y) : null,
      ch3y: item.ch3y ? Number(item.ch3y) : null,
      ch5y: item.ch5y ? Number(item.ch5y) : null,
      ch10y: item.ch10y ? Number(item.ch10y) : null,
      high52: item.high52 ? Number(item.high52) : null,
      low52: item.low52 ? Number(item.low52) : null,
      allTimeLow: item.allTimeLow ? Number(item.allTimeLow) : null,
      allTimeLowChange: item.allTimeLowChange ? Number(item.allTimeLowChange) : null,
      allTimeHigh: item.allTimeHigh ? Number(item.allTimeHigh) : null,
      allTimeHighDate: item.allTimeHighDate,
      allTimeHighChange: item.allTimeHighChange ? Number(item.allTimeHighChange) : null,
      allTimeLowDate: item.allTimeLowDate,
      lastUpdated: item.lastUpdated,
      etfIndex: item.etfIndex || null,
    }
  })
}

function sortETFs(etfs: any[], sortBy: string, sortOrder: string): any[] {
  return etfs.sort((a, b) => {
    let aVal = a[sortBy]
    let bVal = b[sortBy]

    // Handle null/undefined values
    if (aVal === null || aVal === undefined) aVal = sortOrder === 'asc' ? Infinity : -Infinity
    if (bVal === null || bVal === undefined) bVal = sortOrder === 'asc' ? Infinity : -Infinity

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })
}
