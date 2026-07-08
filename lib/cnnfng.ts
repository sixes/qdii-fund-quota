/**
 * Minimal CNN Fear & Greed Index client.
 * CNN exposes the index as JSON at:
 *   https://production.dataviz.cnn.io/index/fearandgreed/graphdata
 * The endpoint rejects non-browser clients with HTTP 418 unless browser-like
 * headers (User-Agent / Accept / Origin / Referer) are supplied.
 *
 * Server-side only.
 */

const CNN_URL = 'https://production.dataviz.cnn.io/index/fearandgreed/graphdata'

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Origin: 'https://edition.cnn.com',
  Referer: 'https://edition.cnn.com/',
}

export interface FngPoint {
  x: number // epoch ms
  y: number
  rating?: string
}

export interface FngGauge {
  score: number
  rating: string
  timestamp: string
  previousClose?: number
  previous1Week?: number
  previous1Month?: number
  previous1Year?: number
}

export interface FngComponent {
  key: string
  score: number | null
  rating: string | null
  data: FngPoint[]
}

export interface FngPayload {
  current: FngGauge
  historical: FngPoint[]
  components: FngComponent[]
}

export class CnnFngError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CnnFngError'
  }
}

const COMPONENT_KEYS = [
  'market_momentum_sp500',
  'market_momentum_sp125',
  'stock_price_strength',
  'stock_price_breadth',
  'put_call_options',
  'market_volatility_vix',
  'market_volatility_vix_50',
  'junk_bond_demand',
  'safe_haven_demand',
] as const

function normalisePoints(data: any): FngPoint[] {
  if (!Array.isArray(data)) return []
  return data
    .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    .map(p => ({ x: p.x, y: p.y, rating: typeof p.rating === 'string' ? p.rating : undefined }))
}

export async function fetchCnnFearGreed(timeoutMs = 10_000): Promise<FngPayload> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(CNN_URL, { headers: BROWSER_HEADERS, signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new CnnFngError(`CNN request timed out after ${timeoutMs}ms`)
    }
    throw new CnnFngError(`CNN request failed: ${err?.message ?? String(err)}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new CnnFngError(`CNN responded with HTTP ${res.status}`)
  }

  let body: any
  try {
    body = await res.json()
  } catch {
    throw new CnnFngError('CNN response was not valid JSON (possible bot block)')
  }

  const fg = body?.fear_and_greed
  if (!fg || typeof fg.score !== 'number') {
    throw new CnnFngError('CNN response missing fear_and_greed score')
  }

  const current: FngGauge = {
    score: Math.round(fg.score * 100) / 100,
    rating: String(fg.rating ?? ''),
    timestamp: String(fg.timestamp ?? ''),
    previousClose: typeof fg.previous_close === 'number' ? fg.previous_close : undefined,
    previous1Week: typeof fg.previous_1_week === 'number' ? fg.previous_1_week : undefined,
    previous1Month: typeof fg.previous_1_month === 'number' ? fg.previous_1_month : undefined,
    previous1Year: typeof fg.previous_1_year === 'number' ? fg.previous_1_year : undefined,
  }

  const historical = normalisePoints(body?.fear_and_greed_historical?.data)

  const components: FngComponent[] = COMPONENT_KEYS.map(key => {
    const c = body?.[key] ?? {}
    return {
      key,
      score: typeof c.score === 'number' ? Math.round(c.score * 100) / 100 : null,
      rating: typeof c.rating === 'string' ? c.rating : null,
      data: normalisePoints(c.data),
    }
  })

  return { current, historical, components }
}
