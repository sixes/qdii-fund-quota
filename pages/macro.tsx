import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { useTranslation } from '../lib/translations'
import { Analytics } from '@vercel/analytics/react'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

interface Observation {
  date: string
  value: number | null
}

interface SeriesPayload {
  id: string
  title: string
  unit: string
  observations: Observation[]
}

type SeriesKey =
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

interface MacroPayload {
  series: Partial<Record<SeriesKey, SeriesPayload>>
  lastUpdated: string
  warnings?: Array<{ id: string; message: string }>
}

type RangeKey = '1Y' | '5Y' | '10Y' | 'MAX'

const RANGE_YEARS: Record<RangeKey, number | null> = {
  '1Y': 1,
  '5Y': 5,
  '10Y': 10,
  MAX: null,
}

function cutoffFor(range: RangeKey): string | null {
  const years = RANGE_YEARS[range]
  if (years == null) return null
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function filterByRange(obs: Observation[] | undefined, cutoff: string | null): Observation[] {
  if (!obs) return []
  if (!cutoff) return obs
  return obs.filter(o => o.date >= cutoff)
}

function formatDate(d: string | undefined, lang: 'en' | 'zh'): string {
  if (!d) return ''
  const date = new Date(`${d}T00:00:00Z`)
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function formatShortDate(d: string | undefined, lang: 'en' | 'zh'): string {
  if (!d || d.length < 7) return d ?? ''
  const date = new Date(`${d}T00:00:00Z`)
  if (lang === 'zh') {
    return `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  })
}

function alignSpread(
  a: Observation[] | undefined,
  b: Observation[] | undefined
): Observation[] {
  if (!a || !b) return []
  const map = new Map<string, number>()
  for (const o of b) {
    if (o.value != null) map.set(o.date, o.value)
  }
  const out: Observation[] = []
  for (const o of a) {
    const other = map.get(o.date)
    if (o.value == null || other == null) {
      out.push({ date: o.date, value: null })
    } else {
      out.push({ date: o.date, value: o.value - other })
    }
  }
  return out
}

export default function MacroPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [payload, setPayload] = useState<MacroPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('5Y')

  const t = useTranslation(language)

  useEffect(() => {
    const langFromUrl = router.query.lang as string | undefined
    setLanguage(langFromUrl === 'zh' ? 'zh' : 'en')
  }, [router.query.lang])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/macro-indicators')
        if (!res.ok) {
          if (res.status === 503) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body?.error || 'Service unavailable')
          }
          throw new Error(`HTTP ${res.status}`)
        }
        const data: MacroPayload = await res.json()
        if (!cancelled) setPayload(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setLanguage(lang)
    router.push(lang === 'zh' ? '/macro?lang=zh' : '/macro', undefined, { shallow: true })
  }

  const cutoff = cutoffFor(range)

  const ranged = useMemo(() => {
    const s = payload?.series
    const dgs2 = filterByRange(s?.dgs2?.observations, cutoff)
    const dgs10 = filterByRange(s?.dgs10?.observations, cutoff)
    return {
      dgs2,
      dgs10,
      dgs30: filterByRange(s?.dgs30?.observations, cutoff),
      spread: alignSpread(dgs10, dgs2),
      cpiYoy: filterByRange(s?.cpiYoy?.observations, cutoff),
      coreCpiYoy: filterByRange(s?.coreCpiYoy?.observations, cutoff),
      pceYoy: filterByRange(s?.pceYoy?.observations, cutoff),
      corePceYoy: filterByRange(s?.corePceYoy?.observations, cutoff),
      dff: filterByRange(s?.dff?.observations, cutoff),
      fedFundsUpper: filterByRange(s?.fedFundsUpper?.observations, cutoff),
      bojRate: filterByRange(s?.bojRate?.observations, cutoff),
      boeRate: filterByRange(s?.boeRate?.observations, cutoff),
      usdIndex: filterByRange(s?.usdIndex?.observations, cutoff),
    }
  }, [payload, cutoff])

  const baseLineOptions = (
    yTitle: string,
    opts: { unit?: 'percent' | 'raw'; tooltipSuffix?: string } = {}
  ) => {
    const unit = opts.unit ?? 'percent'
    const suffix = opts.tooltipSuffix ?? (unit === 'percent' ? '%' : '')
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { position: 'top' as const, labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            title: (items: any[]) => {
              const raw = items?.[0]?.label
              return formatDate(raw, language)
            },
            label: (ctx: any) => {
              const v = ctx.parsed?.y
              if (v == null) return `${ctx.dataset.label}: —`
              return `${ctx.dataset.label}: ${v.toFixed(2)}${suffix}`
            },
          },
        },
      },
      scales: {
        x: {
          type: 'category' as const,
          ticks: {
            maxTicksLimit: 8,
            autoSkip: true,
            maxRotation: 0,
            minRotation: 0,
            callback: function (this: any, _value: any, index: number) {
              const label = this.getLabelForValue ? this.getLabelForValue(index) : ''
              return formatShortDate(label, language)
            },
          },
        },
        y: {
          title: { display: true, text: yTitle },
          ticks: {
            callback: (v: any) =>
              unit === 'percent' ? `${Number(v).toFixed(1)}%` : Number(v).toFixed(0),
          },
        },
      },
    }
  }

  const yieldsLabels = ranged.dgs10.map(o => o.date)
  const yieldsData = {
    labels: yieldsLabels,
    datasets: [
      {
        label: t.macro.legend.dgs2,
        data: alignTo(ranged.dgs10, ranged.dgs2),
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
        yAxisID: 'y',
      },
      {
        label: t.macro.legend.dgs10,
        data: ranged.dgs10.map(o => o.value),
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
        yAxisID: 'y',
      },
      {
        label: t.macro.legend.dgs30,
        data: alignTo(ranged.dgs10, ranged.dgs30),
        borderColor: '#8b5cf6',
        backgroundColor: '#8b5cf6',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
        yAxisID: 'y',
      },
      {
        label: t.macro.legend.spread,
        data: ranged.spread.map(o => o.value),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.18)',
        borderWidth: 1,
        pointRadius: 0,
        spanGaps: true,
        fill: { target: { value: 0 }, above: 'rgba(16,185,129,0.12)', below: 'rgba(239,68,68,0.18)' },
        yAxisID: 'y1',
      },
    ],
  }

  const yieldsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { boxWidth: 12 } },
      tooltip: {
        callbacks: {
          title: (items: any[]) => formatDate(items?.[0]?.label, language),
          label: (ctx: any) => {
            const v = ctx.parsed?.y
            if (v == null) return `${ctx.dataset.label}: —`
            return `${ctx.dataset.label}: ${v.toFixed(2)}%`
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 8,
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          callback: function (this: any, _value: any, index: number) {
            const label = this.getLabelForValue ? this.getLabelForValue(index) : ''
            return formatShortDate(label, language)
          },
        },
      },
      y: {
        position: 'left' as const,
        title: { display: true, text: t.macro.axis.percent },
        ticks: { callback: (v: any) => `${Number(v).toFixed(1)}%` },
      },
      y1: {
        position: 'right' as const,
        title: { display: true, text: t.macro.axis.spread },
        grid: { drawOnChartArea: false },
        ticks: { callback: (v: any) => `${Number(v).toFixed(1)}` },
      },
    },
  }

  const cpiData = {
    labels: ranged.cpiYoy.map(o => o.date),
    datasets: [
      {
        label: t.macro.legend.cpi,
        data: ranged.cpiYoy.map(o => o.value),
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: t.macro.legend.coreCpi,
        data: alignTo(ranged.cpiYoy, ranged.coreCpiYoy),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
    ],
  }

  const pceData = {
    labels: ranged.pceYoy.map(o => o.date),
    datasets: [
      {
        label: t.macro.legend.pce,
        data: ranged.pceYoy.map(o => o.value),
        borderColor: '#0ea5e9',
        backgroundColor: '#0ea5e9',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: t.macro.legend.corePce,
        data: alignTo(ranged.pceYoy, ranged.corePceYoy),
        borderColor: '#ec4899',
        backgroundColor: '#ec4899',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
    ],
  }

  const fedData = {
    labels: ranged.dff.map(o => o.date),
    datasets: [
      {
        label: t.macro.legend.dff,
        data: ranged.dff.map(o => o.value),
        borderColor: '#111827',
        backgroundColor: '#111827',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: t.macro.legend.fedFundsUpper,
        data: alignTo(ranged.dff, ranged.fedFundsUpper),
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 1.5,
        pointRadius: 0,
        stepped: true as const,
        spanGaps: true,
      },
    ],
  }

  const cbLabels = ranged.bojRate.length >= ranged.boeRate.length
    ? ranged.bojRate.map(o => o.date)
    : ranged.boeRate.map(o => o.date)
  const cbReference: Observation[] = cbLabels.map(d => ({ date: d, value: null }))
  const cbData = {
    labels: cbLabels,
    datasets: [
      {
        label: t.macro.legend.dff,
        data: alignTo(cbReference, ranged.dff),
        borderColor: '#111827',
        backgroundColor: '#111827',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: t.macro.legend.bojRate,
        data: alignTo(cbReference, ranged.bojRate),
        borderColor: '#dc2626',
        backgroundColor: '#dc2626',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
      {
        label: t.macro.legend.boeRate,
        data: alignTo(cbReference, ranged.boeRate),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
      },
    ],
  }

  const usdData = {
    labels: ranged.usdIndex.map(o => o.date),
    datasets: [
      {
        label: t.macro.legend.usdIndex,
        data: ranged.usdIndex.map(o => o.value),
        borderColor: '#0f766e',
        backgroundColor: 'rgba(15,118,110,0.15)',
        borderWidth: 1.5,
        pointRadius: 0,
        spanGaps: true,
        fill: true,
      },
    ],
  }

  return (
    <>
      <Head>
        <title>{t.macro.title}</title>
        <meta name="description" content={t.macro.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://www.qdiiquota.pro/macro" />
      </Head>

      <Navigation language={language} onLanguageChange={handleLanguageChange} />

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{t.macro.heading}</h1>
            <p className="text-gray-600">{t.macro.subheading}</p>
          </header>

          {loading && (
            <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-4" />
              <p>{t.macro.loading}</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-red-600 font-medium mb-1">{t.macro.error}</p>
              <p className="text-sm text-gray-500">
                {error.includes('FRED_API_KEY') ? t.macro.missingKey : error}
              </p>
            </div>
          )}

          {!loading && !error && payload && (
            <>
              {payload.warnings && payload.warnings.length > 0 && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-1">{t.macro.partialWarning}</p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside">
                    {payload.warnings.map(w => (
                      <li key={w.id}>
                        <span className="font-mono">{w.id}</span>: {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm p-1">
                  {(Object.keys(RANGE_YEARS) as RangeKey[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                        range === r
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {r === '1Y' && t.macro.range.oneYear}
                      {r === '5Y' && t.macro.range.fiveYear}
                      {r === '10Y' && t.macro.range.tenYear}
                      {r === 'MAX' && t.macro.range.max}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-gray-500">
                  {t.macro.lastUpdated}: {formatDate(payload.lastUpdated.slice(0, 10), language)}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900">{t.macro.charts.yields}</h2>
                  <p className="text-xs text-gray-500 mb-3">{t.macro.charts.yieldsSubtitle}</p>
                  <div className="relative h-80">
                    <Line data={yieldsData} options={yieldsOptions as any} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.macro.charts.inflationCpi}</h2>
                  <div className="relative h-80">
                    <Line data={cpiData} options={baseLineOptions(t.macro.axis.percent) as any} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.macro.charts.inflationPce}</h2>
                  <div className="relative h-80">
                    <Line data={pceData} options={baseLineOptions(t.macro.axis.percent) as any} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.macro.charts.fedFunds}</h2>
                  <div className="relative h-80">
                    <Line data={fedData} options={baseLineOptions(t.macro.axis.percent) as any} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.macro.charts.centralBanks}</h2>
                  <div className="relative h-80">
                    <Line data={cbData} options={baseLineOptions(t.macro.axis.percent) as any} />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.macro.charts.usdIndex}</h2>
                  <div className="relative h-80">
                    <Line
                      data={usdData}
                      options={baseLineOptions(t.macro.axis.index, { unit: 'raw' }) as any}
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                {t.macro.dataSource}:{' '}
                <a
                  href="https://fred.stlouisfed.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {t.macro.fred}
                </a>
              </p>
            </>
          )}
        </div>
      </main>

      <Footer language={language} />
      <Analytics />
    </>
  )
}

function alignTo(reference: Observation[], series: Observation[]): Array<number | null> {
  const map = new Map<string, number | null>()
  for (const o of series) map.set(o.date, o.value)
  return reference.map(o => {
    const v = map.get(o.date)
    return v == null ? null : v
  })
}
