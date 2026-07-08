/**
 * Minimal CBOE index history client.
 * CBOE publishes daily index history as free, public CSV files on its CDN
 * (no API key required), e.g.:
 *   https://cdn.cboe.com/api/global/us_indices/daily_prices/SKEW_History.csv
 *   https://cdn.cboe.com/api/global/us_indices/daily_prices/COR3M_History.csv
 *
 * Dates are formatted MM/DD/YYYY. This client parses the CSV, extracts the
 * closing value, normalises the date to YYYY-MM-DD, and enforces a timeout.
 *
 * Server-side only.
 */

import type { Observation } from './fred'

const CBOE_BASE = 'https://cdn.cboe.com/api/global/us_indices/daily_prices'

export class CboeError extends Error {
  constructor(public symbol: string, message: string) {
    super(message)
    this.name = 'CboeError'
  }
}

function toIsoDate(mdY: string): string | null {
  const m = mdY.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/**
 * Fetch a CBOE index history CSV and return closing values as observations.
 * Handles both single-value CSVs (DATE,<SYMBOL>) and OHLC CSVs
 * (DATE,OPEN,HIGH,LOW,CLOSE) by using the last numeric column as the close.
 */
export async function fetchCboeSeries(
  symbol: string,
  opts: { start?: string; timeoutMs?: number } = {}
): Promise<Observation[]> {
  const url = `${CBOE_BASE}/${symbol}_History.csv`
  const controller = new AbortController()
  const timeoutMs = opts.timeoutMs ?? 10_000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, { signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new CboeError(symbol, `CBOE request timed out after ${timeoutMs}ms`)
    }
    throw new CboeError(symbol, `CBOE request failed: ${err?.message ?? String(err)}`)
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    throw new CboeError(symbol, `HTTP ${res.status}`)
  }

  const text = await res.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) {
    throw new CboeError(symbol, 'CBOE response contained no data rows')
  }

  const header = lines[0].split(',').map(h => h.trim().toUpperCase())
  const closeIdx = header.indexOf('CLOSE')
  const out: Observation[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 2) continue
    const date = toIsoDate(cols[0])
    if (!date) continue
    if (opts.start && date < opts.start) continue
    const rawValue = closeIdx >= 0 ? cols[closeIdx] : cols[cols.length - 1]
    const n = Number(rawValue)
    out.push({ date, value: Number.isFinite(n) ? Math.round(n * 100) / 100 : null })
  }

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return out
}

export const CBOE_SYMBOLS = {
  SKEW: 'SKEW',
  COR3M: 'COR3M',
} as const
