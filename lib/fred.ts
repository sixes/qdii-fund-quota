/**
 * Minimal FRED (Federal Reserve Economic Data) client.
 * Fetches a single series from the public observations endpoint, normalises
 * missing values, and enforces a request timeout.
 *
 * Server-side only. Reads FRED_API_KEY from process.env.
 */

export interface Observation {
  date: string
  value: number | null
}

export interface FetchOptions {
  start?: string
  end?: string
  timeoutMs?: number
}

export class FredError extends Error {
  constructor(public seriesId: string, message: string) {
    super(message)
    this.name = 'FredError'
  }
}

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations'

export const SERIES = {
  DGS2: 'DGS2',
  DGS10: 'DGS10',
  DGS30: 'DGS30',
  CPIAUCSL: 'CPIAUCSL',
  CPILFESL: 'CPILFESL',
  PCEPI: 'PCEPI',
  PCEPILFE: 'PCEPILFE',
  DFF: 'DFF',
  DFEDTARU: 'DFEDTARU',
  BOJ_CALL: 'IRSTCI01JPM156N',
  BOE_CALL: 'IRSTCI01GBM156N',
  // DXY constituent FX rates (used to compute the ICE US Dollar Index)
  DEXUSEU: 'DEXUSEU',
  DEXJPUS: 'DEXJPUS',
  DEXUSUK: 'DEXUSUK',
  DEXCAUS: 'DEXCAUS',
  DEXSDUS: 'DEXSDUS',
  DEXSZUS: 'DEXSZUS',
} as const

export type SeriesId = (typeof SERIES)[keyof typeof SERIES]

function buildUrl(seriesId: string, apiKey: string, opts: FetchOptions): string {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
  })
  if (opts.start) params.set('observation_start', opts.start)
  if (opts.end) params.set('observation_end', opts.end)
  return `${FRED_BASE}?${params.toString()}`
}

export async function fetchFredSeries(
  seriesId: string,
  opts: FetchOptions = {}
): Promise<Observation[]> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    throw new FredError(seriesId, 'FRED_API_KEY not configured')
  }

  const url = buildUrl(seriesId, apiKey, opts)
  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? 10_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new FredError(seriesId, `FRED request timed out after ${timeoutMs}ms`)
    }
    throw new FredError(seriesId, `FRED request failed: ${err?.message ?? String(err)}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.error_message) detail = `${detail}: ${body.error_message}`
    } catch {
      // ignore body parse failure
    }
    throw new FredError(seriesId, detail)
  }

  const body = (await res.json()) as {
    error_code?: number
    error_message?: string
    observations?: Array<{ date: string; value: string }>
  }

  if (body.error_code) {
    throw new FredError(seriesId, body.error_message ?? `FRED error_code ${body.error_code}`)
  }

  const observations = body.observations ?? []
  return observations.map(({ date, value }) => {
    if (value === '.' || value === '' || value == null) {
      return { date, value: null }
    }
    const n = Number(value)
    return { date, value: Number.isFinite(n) ? n : null }
  })
}
