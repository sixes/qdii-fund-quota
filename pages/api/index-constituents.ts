import type { NextApiRequest, NextApiResponse } from 'next';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Configure AWS SDK v3 - uses default credential chain
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

const TABLE_NAME = 'index-constituents';

// Index name mapping
const INDEX_MAP: Record<string, string> = {
  'nasdaq100': 'NASDAQ_100',
  'sp500': 'S&P_500',
  'dow': 'DOW_JONES',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { index } = req.query;

  // Validate index parameter
  if (!index || typeof index !== 'string' || !INDEX_MAP[index]) {
    return res.status(400).json({ error: 'Invalid index parameter' });
  }

  try {
    const indexName = INDEX_MAP[index];
    
    // Query DynamoDB
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `INDEX#${indexName}` },
      },
    });

    const result = await client.send(command);

    const constituents: any[] = [];
    
    if (result.Items) {
      for (const item of result.Items) {
        // Unmarshall DynamoDB item to regular JavaScript object
        const unmarshalledItem = unmarshall(item);
        
        const constituent = {
          no: unmarshalledItem.no,
          symbol: unmarshalledItem.symbol,
          name: unmarshalledItem.name,
          weight: parseFloat(unmarshalledItem.weight?.toString() || '0'),
          price: parseFloat(unmarshalledItem.price?.toString() || '0'),
          change: parseFloat(unmarshalledItem.change?.toString() || '0'),
          marketCap: unmarshalledItem.market_cap || 'N/A',
          ath_price: unmarshalledItem.ath_price ? parseFloat(unmarshalledItem.ath_price.toString()) : null,
          ath_date: unmarshalledItem.ath_date || null,
          ath_change_percent: unmarshalledItem.ath_change_percent ? parseFloat(unmarshalledItem.ath_change_percent.toString()) : null,
          pe_ratio: unmarshalledItem.pe_ratio ? parseFloat(unmarshalledItem.pe_ratio.toString()) : null,
          eps_ttm: unmarshalledItem.eps_ttm ? parseFloat(unmarshalledItem.eps_ttm.toString()) : null,
          ps_ratio: unmarshalledItem.ps_ratio ? parseFloat(unmarshalledItem.ps_ratio.toString()) : null,
          pb_ratio: unmarshalledItem.pb_ratio ? parseFloat(unmarshalledItem.pb_ratio.toString()) : null,
          forward_pe: unmarshalledItem.forward_pe ? parseFloat(unmarshalledItem.forward_pe.toString()) : null,
        };
        
        constituents.push(constituent);
      }
    }

    // Sort by 'no' field
    constituents.sort((a, b) => a.no - b.no);

    res.status(200).json(constituents);
  } catch (error) {
    console.error('Error fetching index constituents:', error);
    res.status(500).json({ error: 'Failed to fetch index constituents' });
  }
}