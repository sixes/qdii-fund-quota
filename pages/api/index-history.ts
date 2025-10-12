import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { index, period } = req.query;

  // Validate index parameter
  const validIndices = ['nasdaq100', 'sp500', 'dow'];
  if (!index || !validIndices.includes(index as string)) {
    return res.status(400).json({ error: 'Invalid index parameter' });
  }

  try {
    // Read JSON file
    const filePath = path.join(
      process.cwd(),
      'backend',
      'data',
      'index_history',
      `${index}_history.json`
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Data file not found' });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Filter data by period if specified
    if (period && period !== 'max') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case '1y':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          break;
        case '3y':
          startDate = new Date(now.getFullYear() - 3, now.getMonth(), 1);
          break;
        case '5y':
          startDate = new Date(now.getFullYear() - 5, now.getMonth(), 1);
          break;
        case '10y':
          startDate = new Date(now.getFullYear() - 10, now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // All data
      }

      data.monthly_data = data.monthly_data.filter((item: any) => {
        const itemDate = new Date(item.date);
        return itemDate >= startDate;
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error reading index history:', error);
    res.status(500).json({ error: 'Failed to load historical data' });
  }
}
