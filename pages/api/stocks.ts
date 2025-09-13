import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

function getTodayDateStr() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const date = (req.query.date as string) || getTodayDateStr()
  const stocks = []

  try {
    // Scan all tickers for the given date using the primary key (ticker+date)
    // If you want all stocks for a date, you need a GSI on 'date' (already used above)
    // If you want to fetch a specific ticker+date, you can use GetItem or Query with both keys
    // Here, we keep the GSI approach to get all stocks for a date
    const params = {
      TableName: 'stock_px_changed',
      IndexName: 'date-index', // GSI on 'date'
      KeyConditionExpression: '#date = :date',
      ExpressionAttributeNames: {
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':date': { S: date },
      },
    }
    
    const data = await client.send(new QueryCommand(params))
    if (data.Items && data.Items.length > 0) {
      for (const dbItem of data.Items) {
        const item = unmarshall(dbItem)
        stocks.push({
          ticker: item.ticker,
          name: item.name,
          date: item.date,
          market: item.market,
          lastClosingPrice: item.closing_price ? Number(item.closing_price).toFixed(2) : undefined,
          lastChangePercent: item.change_percentage ? Number(item.change_percentage).toFixed(2) : undefined,
          changeFromAthPercent: item.chg_pct_so_far ? Number(item.chg_pct_so_far).toFixed(2) : undefined,
          allTimeHigh: item.highest_px ? Number(item.highest_px).toFixed(2) : undefined,
        })
      }
    }
    res.status(200).json(stocks)
  } catch (error) {
    console.error('Error fetching stock data from DynamoDB:', error)
    res.status(500).json({ error: 'Failed to fetch stock data' })
  }
}