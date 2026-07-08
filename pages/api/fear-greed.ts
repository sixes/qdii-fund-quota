import type { NextApiRequest, NextApiResponse } from 'next'
import { cacheAsync } from '../../lib/cache'
import { fetchCnnFearGreed } from '../../lib/cnnfng'

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const payload = await cacheAsync(
      'cnn:fear-greed:v2',
      () => fetchCnnFearGreed(),
      60 * 60 * 1000 // 1 hour
    )
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600')
    res.status(200).json(payload)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('fear-greed handler failed:', msg)
    res.status(502).json({ error: 'Failed to fetch CNN Fear & Greed Index' })
  }
}
