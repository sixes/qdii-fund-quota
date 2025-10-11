import type { NextApiRequest, NextApiResponse } from 'next'
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'

const client = new DynamoDBClient({ region: 'us-east-1' })

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { index = 'nasdaq100' } = req.query;

  try {
    // Map index names to DynamoDB format
    const indexMap: Record<string, string> = {
      'nasdaq100': 'NASDAQ_100',
      'sp500': 'S&P_500',
      'dow': 'DOW_JONES'
    };

    const mappedIndex = indexMap[index as string] || 'NASDAQ_100';

    const params = {
      TableName: 'index-constituents',
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `INDEX#${mappedIndex}` }
      }
    };

    console.log('DynamoDB query params:', params);

    const result = await client.send(new QueryCommand(params));
    //console.log('DynamoDB result:', result);

    const constituents = [];

    if (result.Items && result.Items.length > 0) {
      for (const dbItem of result.Items) {
        const item = unmarshall(dbItem);
        constituents.push({
          no: item.no || 0,
          symbol: item.symbol || '',
          name: item.name || '',
          weight: item.weight ? parseFloat(item.weight.toString()) : 0,
          price: item.price ? parseFloat(item.price.toString()) : 0,
          change: item.change ? parseFloat(item.change.toString()) : 0,
          marketCap: item.market_cap || '',
          ath_price: item.ath_price ? parseFloat(item.ath_price.toString()) : null,
          ath_date: item.ath_date || null,
          pe_ratio: item.pe_ratio ? parseFloat(item.pe_ratio.toString()) : null,
          eps_ttm: item.eps_ttm ? parseFloat(item.eps_ttm.toString()) : null,
          ps_ratio: item.ps_ratio ? parseFloat(item.ps_ratio.toString()) : null,
          pb_ratio: item.pb_ratio ? parseFloat(item.pb_ratio.toString()) : null,
          forward_pe: item.forward_pe ? parseFloat(item.forward_pe.toString()) : null,
        });
      }
    }

    // Sort by 'no' field by default
    constituents.sort((a, b) => a.no - b.no);

    console.log(`Returning ${constituents.length} constituents for ${index}`);
    res.status(200).json(constituents);
  } catch (error) {
    console.error('Error fetching index constituents:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}