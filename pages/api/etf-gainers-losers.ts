import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

interface ETFPerformance {
  ticker: string
  issuer: string
  etfIndex: string
  aum: number
  ch1w: number
  ch1m: number
  ch6m: number
  ch1y: number
  ch3y: number
  ch5y: number
  ch10y: number
  chYTD: number
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const params = {
      TableName: 'ETFGainersLosers',
    }

    const data = await client.send(new ScanCommand(params))

    if (!data.Items || data.Items.length === 0) {
      return res.status(200).json({
        gainers: { ticker: [], issuer: [], etfIndex: [], ch1w: [], ch1m: [], ch6m: [], ch1y: [], ch3y: [], ch5y: [], ch10y: [], chYTD: [] },
        losers: { ticker: [], issuer: [], etfIndex: [], ch1w: [], ch1m: [], ch6m: [], ch1y: [], ch3y: [], ch5y: [], ch10y: [], chYTD: [] },
      })
    }

    const etfs: ETFPerformance[] = data.Items.map(dbItem => {
      const item = unmarshall(dbItem)
      return {
        ticker: item.ticker,
        issuer: item.issuer || 'Unknown',
        etfIndex: item.etfIndex,
        aum: typeof item.aum === 'object' ? Number(item.aum) : item.aum|| 0,
        ch1w: typeof item.ch1w === 'object' ? Number(item.ch1w) : item.ch1w || 0,
        ch1m: typeof item.ch1m === 'object' ? Number(item.ch1m) : item.ch1m || 0,
        ch6m: typeof item.ch6m === 'object' ? Number(item.ch6m) : item.ch6m || 0,
        ch1y: typeof item.ch1y === 'object' ? Number(item.ch1y) : item.ch1y || 0,
        ch3y: typeof item.ch3y === 'object' ? Number(item.ch3y) : item.ch3y || 0,
        ch5y: typeof item.ch5y === 'object' ? Number(item.ch5y) : item.ch5y || 0,
        ch10y: typeof item.ch10y === 'object' ? Number(item.ch10y) : item.ch10y || 0,
        chYTD: typeof item.chYTD === 'object' ? Number(item.chYTD) : item.chYTD || 0,
      }
    })

    // Function to get top gainers and losers for a period
    const getTopByPeriod = (period: keyof Omit<ETFPerformance, 'ticker' | 'issuer' | 'etfIndex'>, limit: number = 10) => {
      const sorted = [...etfs].sort((a, b) => (b[period] as number) - (a[period] as number))
      return {
        gainers: sorted.slice(0, limit).map(e => ({ ticker: e.ticker, issuer: e.issuer, return: e[period], aum: e.aum, etfIndex: e.etfIndex })),
        losers: sorted.slice(-limit).reverse().map(e => ({ ticker: e.ticker, issuer: e.issuer, return: e[period], aum: e.aum, etfIndex: e.etfIndex })),
      }
    }

    res.status(200).json({
      gainers: {
        ch1w: getTopByPeriod('ch1w', 10).gainers,
        ch1m: getTopByPeriod('ch1m', 10).gainers,
        ch6m: getTopByPeriod('ch6m', 10).gainers,
        ch1y: getTopByPeriod('ch1y', 10).gainers,
        ch3y: getTopByPeriod('ch3y', 10).gainers,
        ch5y: getTopByPeriod('ch5y', 10).gainers,
        ch10y: getTopByPeriod('ch10y', 10).gainers,
        chYTD: getTopByPeriod('chYTD', 10).gainers,
      },
      losers: {
        ch1w: getTopByPeriod('ch1w', 10).losers,
        ch1m: getTopByPeriod('ch1m', 10).losers,
        ch6m: getTopByPeriod('ch6m', 10).losers,
        ch1y: getTopByPeriod('ch1y', 10).losers,
        ch3y: getTopByPeriod('ch3y', 10).losers,
        ch5y: getTopByPeriod('ch5y', 10).losers,
        ch10y: getTopByPeriod('ch10y', 10).losers,
        chYTD: getTopByPeriod('chYTD', 10).losers,
      },
    })
  } catch (error) {
    console.error('Error fetching gainers/losers:', error)
    res.status(500).json({ error: 'Failed to fetch gainers/losers' })
  }
}
