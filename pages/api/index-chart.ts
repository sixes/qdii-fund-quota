// API route to fetch index chart data using yfinance
// filepath: /Users/tony/Documents/Project/fund-quota/pages/api/index-chart.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { SocksProxyAgent } from 'socks-proxy-agent';
import https from 'https';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { symbol, period = '1y', interval = '1d' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol is required' });
  }

  try {
    // Use Yahoo Finance API directly
    const yahooSymbol = symbol as string;
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate period timestamps
    let period1 = now;
    switch (period) {
      case '1d':
        // For 1 day with minute intervals, we only need 2 days to capture the last complete trading day
        period1 = now - (2 * 24 * 60 * 60);
        break;
      case '1mo':
        period1 = now - (30 * 24 * 60 * 60);
        break;
      case '3mo':
        period1 = now - (90 * 24 * 60 * 60);
        break;
      case '6mo':
        period1 = now - (180 * 24 * 60 * 60);
        break;
      case '1y':
      default:
        period1 = now - (365 * 24 * 60 * 60);
        break;
    }
    
    console.log('🔥 Fetching data:', {
      symbol: yahooSymbol,
      period,
      interval,
      period1: new Date(period1 * 1000).toISOString(),
      period2: new Date(now * 1000).toISOString(),
      url: `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${now}&interval=${interval}`
    });

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?period1=${period1}&period2=${now}&interval=${interval}`;
    
    // Check if we're in local development and proxy settings exist
    const proxyHost = process.env.PROXY_HOST;
    const proxyPort = process.env.PROXY_PORT;
    const proxyType = process.env.PROXY_TYPE || 'socks5';
    
    // Debug logging
    console.log('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      PROXY_HOST: proxyHost,
      PROXY_PORT: proxyPort,
      PROXY_TYPE: proxyType,
      hasProxy: !!(proxyHost && proxyPort)
    });
    
    let responseData: string;
    
    // Use proxy if settings exist (regardless of NODE_ENV)
    if (proxyHost && proxyPort) {
      const proxyUrl = `${proxyType}://${proxyHost}:${proxyPort}`;
      console.log(`Using proxy: ${proxyUrl}`);
      
      // Use node-fetch with proxy agent for local development
      const nodeFetch = (await import('node-fetch')).default;
      const agent = new SocksProxyAgent(proxyUrl);
      
      const response = await nodeFetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        // @ts-ignore
        agent
      });
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }
      
      responseData = await response.text();
    } else {
      // No proxy configured: use native fetch
      console.log('Using direct connection (no proxy configured)');
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }
      
      responseData = await response.text();
    }

    const data = JSON.parse(responseData);
    
    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0].close;
    
    // Get previous close from meta data (this is the official previous day's closing price)
    const previousClose = result.meta?.previousClose || result.meta?.chartPreviousClose;
    // Format dates based on interval
    const chartData = timestamps
      .map((ts: number, i: number) => {
        const date = new Date(ts * 1000);
        let dateStr: string;
        
        // For minute intervals, include time; for daily/longer, just date
        if (interval === '1m' || interval === '5m' || interval === '15m' || interval === '30m' || interval === '1h') {
          // Convert to Eastern Time and format for intraday data
          // Use toLocaleString to convert to ET (America/New_York timezone)
          const etDate = date.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          });
          // Convert to ISO-like format: YYYY-MM-DDTHH:mm:ss
          const parts = etDate.match(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}):(\d{2}):(\d{2})/);
          if (parts) {
            dateStr = `${parts[3]}-${parts[1]}-${parts[2]}T${parts[4]}:${parts[5]}:${parts[6]}`;
          } else {
            dateStr = date.toISOString();
          }
        } else {
          // Just date for daily data
          dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        return {
          date: dateStr,
          price: prices[i]
        };
      })
      .filter((item: any) => item.price !== null);

    const dates = chartData.map((item: any) => item.date);
    const priceValues = chartData.map((item: any) => item.price);

    res.status(200).json({
      symbol: yahooSymbol,
      dates,
      prices: priceValues,
      previousClose,
      period,
      interval
    });

  } catch (error) {
    console.error('Error fetching index chart data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chart data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
