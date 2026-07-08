import type { NextApiRequest, NextApiResponse } from 'next'
import { cacheAsync } from '../../lib/cache'
import { fetchFredSeries, SERIES, FredError, type Observation } from '../../lib/fred'
import { fetchCboeSeries, CBOE_SYMBOLS, CboeError } from '../../lib/cboe'

interface SeriesPayload {
  id: string
  title: string
  unit: string
  observations: Observation[]
}

interface MacroPayload {
  series: Partial<Record<
    | 'dgs2'
    | 'dgs10'
    | 'dgs30'
    | 'cpiYoy'
    | 'coreCpiYoy'
    | 'pceYoy'
    | 'corePceYoy'
    | 'dff'
    | 'fedFundsUpper'
    | 'bojRate'
    | 'boeRate'
    | 'usdIndex'
    | 'freightIndex'
    | 'airlineFaresYoy'
    | 'airPassengers'
    | 'skew'
    | 'cor3m',
    SeriesPayload
  >>
  lastUpdated: string
  warnings?: Array<{ id: string; message: string }>
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function defaultStart(): string {
  const now = new Date()
  now.setUTCFullYear(now.getUTCFullYear() - 10)
  return now.toISOString().slice(0, 10)
}

function yoy(observations: Observation[]): Observation[] {
  const out: Observation[] = []
  for (let i = 12; i < observations.length; i++) {
    const cur = observations[i]
    const prev = observations[i - 12]
    if (cur.value == null || prev.value == null || prev.value === 0) {
      out.push({ date: cur.date, value: null })
      continue
    }
    const pct = (cur.value / prev.value - 1) * 100
    out.push({ date: cur.date, value: Math.round(pct * 10_000) / 10_000 })
  }
  return out
}

const SERIES_META: Record<
  Exclude<keyof MacroPayload['series'], 'usdIndex' | 'skew' | 'cor3m'>,
  { id: string; title: string; unit: string; yoy: boolean; ydsStart?: (start: string) => string }
> = {
  dgs2: { id: SERIES.DGS2, title: '2-Year Treasury Yield', unit: '%', yoy: false },
  dgs10: { id: SERIES.DGS10, title: '10-Year Treasury Yield', unit: '%', yoy: false },
  dgs30: { id: SERIES.DGS30, title: '30-Year Treasury Yield', unit: '%', yoy: false },
  cpiYoy: { id: SERIES.CPIAUCSL, title: 'CPI YoY', unit: '%', yoy: true },
  coreCpiYoy: { id: SERIES.CPILFESL, title: 'Core CPI YoY', unit: '%', yoy: true },
  pceYoy: { id: SERIES.PCEPI, title: 'PCE YoY', unit: '%', yoy: true },
  corePceYoy: { id: SERIES.PCEPILFE, title: 'Core PCE YoY', unit: '%', yoy: true },
  dff: { id: SERIES.DFF, title: 'Effective Federal Funds Rate', unit: '%', yoy: false },
  fedFundsUpper: { id: SERIES.DFEDTARU, title: 'Fed Funds Target Upper', unit: '%', yoy: false },
  bojRate: { id: SERIES.BOJ_CALL, title: 'Japan Immediate Call Rate (BOJ proxy)', unit: '%', yoy: false },
  boeRate: { id: SERIES.BOE_CALL, title: 'UK Immediate Call Rate (BOE proxy)', unit: '%', yoy: false },
  freightIndex: { id: SERIES.CASS_FREIGHT, title: 'Cass Freight Index: Shipments', unit: 'index', yoy: false },
  airlineFaresYoy: { id: SERIES.AIRLINE_FARES, title: 'CPI: Airline Fares YoY', unit: '%', yoy: true },
  airPassengers: { id: SERIES.AIR_RPM, title: 'Air Revenue Passenger Miles YoY', unit: '%', yoy: true },
}

// ICE US Dollar Index (DXY) formula:
//   DXY = 50.14348112
//       * (EUR/USD)^-0.576
//       * (USD/JPY)^0.136
//       * (GBP/USD)^-0.119
//       * (USD/CAD)^0.091
//       * (USD/SEK)^0.042
//       * (USD/CHF)^0.036
const DXY_CONSTANT = 50.14348112
const DXY_INPUTS: Array<{ id: string; weight: number }> = [
  { id: SERIES.DEXUSEU, weight: -0.576 }, // FRED quotes USD per EUR (= EUR/USD)
  { id: SERIES.DEXJPUS, weight: 0.136 }, // JPY per USD
  { id: SERIES.DEXUSUK, weight: -0.119 }, // USD per GBP (= GBP/USD)
  { id: SERIES.DEXCAUS, weight: 0.091 }, // CAD per USD
  { id: SERIES.DEXSDUS, weight: 0.042 }, // SEK per USD
  { id: SERIES.DEXSZUS, weight: 0.036 }, // CHF per USD
]

function computeDxy(rates: Array<Observation[]>): Observation[] {
  if (rates.length !== DXY_INPUTS.length) return []
  const maps = rates.map(series => {
    const m = new Map<string, number>()
    for (const o of series) if (o.value != null) m.set(o.date, o.value)
    return m
  })
  const dates = new Set<string>()
  for (const series of rates) {
    for (const o of series) dates.add(o.date)
  }
  const sorted = Array.from(dates).sort()
  const out: Observation[] = []
  for (const date of sorted) {
    let dxy = DXY_CONSTANT
    let ok = true
    for (let i = 0; i < DXY_INPUTS.length; i++) {
      const v = maps[i].get(date)
      if (v == null || v <= 0) {
        ok = false
        break
      }
      dxy *= Math.pow(v, DXY_INPUTS[i].weight)
    }
    out.push({ date, value: ok ? Math.round(dxy * 10_000) / 10_000 : null })
  }
  return out
}

function fetchStartFor(start: string, isYoy: boolean): string {
  if (!isYoy) return start
  const d = new Date(`${start}T00:00:00Z`)
  d.setUTCFullYear(d.getUTCFullYear() - 1)
  return d.toISOString().slice(0, 10)
}

function trimToStart(obs: Observation[], start: string): Observation[] {
  return obs.filter(o => o.date >= start)
}

async function buildPayload(start: string): Promise<MacroPayload> {
  const keys = Object.keys(SERIES_META) as Array<keyof typeof SERIES_META>

  const [settled, dxySettled, cboeSettled] = await Promise.all([
    Promise.allSettled(
      keys.map(k => {
        const meta = SERIES_META[k]
        const seriesStart = fetchStartFor(start, meta.yoy)
        return fetchFredSeries(meta.id, { start: seriesStart })
      })
    ),
    Promise.allSettled(
      DXY_INPUTS.map(input => fetchFredSeries(input.id, { start }))
    ),
    Promise.allSettled([
      fetchCboeSeries(CBOE_SYMBOLS.SKEW, { start }),
      fetchCboeSeries(CBOE_SYMBOLS.COR3M, { start }),
    ]),
  ])

  const series: MacroPayload['series'] = {}
  const warnings: Array<{ id: string; message: string }> = []

  settled.forEach((result, i) => {
    const key = keys[i]
    const meta = SERIES_META[key]
    if (result.status === 'fulfilled') {
      let obs = result.value
      if (meta.yoy) obs = yoy(obs)
      obs = trimToStart(obs, start)
      series[key] = { id: meta.id, title: meta.title, unit: meta.unit, observations: obs }
    } else {
      const reason = result.reason
      const message =
        reason instanceof FredError
          ? reason.message
          : reason?.message ?? String(reason)
      warnings.push({ id: meta.id, message })
    }
  })

  const dxyOk = dxySettled.every(r => r.status === 'fulfilled')
  if (dxyOk) {
    const inputs = dxySettled.map(r => (r as PromiseFulfilledResult<Observation[]>).value)
    const dxy = trimToStart(computeDxy(inputs), start)
    series.usdIndex = {
      id: 'DXY',
      title: 'US Dollar Index (DXY, computed from FRED FX rates)',
      unit: 'index',
      observations: dxy,
    }
  } else {
    const failures = dxySettled
      .map((r, i) => (r.status === 'rejected' ? DXY_INPUTS[i].id : null))
      .filter(Boolean) as string[]
    warnings.push({
      id: 'DXY',
      message: `DXY could not be computed; missing inputs: ${failures.join(', ')}`,
    })
  }

  const cboeMeta: Array<{ key: 'skew' | 'cor3m'; id: string; title: string }> = [
    { key: 'skew', id: CBOE_SYMBOLS.SKEW, title: 'CBOE SKEW Index' },
    { key: 'cor3m', id: CBOE_SYMBOLS.COR3M, title: 'CBOE 3-Month Implied Correlation Index' },
  ]
  cboeSettled.forEach((result, i) => {
    const meta = cboeMeta[i]
    if (result.status === 'fulfilled') {
      series[meta.key] = {
        id: meta.id,
        title: meta.title,
        unit: 'index',
        observations: result.value,
      }
    } else {
      const reason = result.reason
      const message =
        reason instanceof CboeError ? reason.message : reason?.message ?? String(reason)
      warnings.push({ id: meta.id, message })
    }
  })

  const payload: MacroPayload = {
    series,
    lastUpdated: new Date().toISOString(),
  }
  if (warnings.length) payload.warnings = warnings
  return payload
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!process.env.FRED_API_KEY) {
    res.status(503).json({ error: 'FRED_API_KEY not configured' })
    return
  }

  const rawStart = typeof req.query.start === 'string' ? req.query.start : ''
  const start = ISO_DATE_RE.test(rawStart) ? rawStart : defaultStart()

  try {
    const payload = await cacheAsync(
      `macro:indicators:v4:${start}`,
      () => buildPayload(start),
      6 * 60 * 60 * 1000
    )
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
    res.status(200).json(payload)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('macro-indicators handler failed:', msg)
    res.status(500).json({ error: 'Failed to fetch macro indicators' })
  }
}
