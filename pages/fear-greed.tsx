import React, { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
)

interface FngPoint {
  x: number
  y: number
  rating?: string
}

interface FngGauge {
  score: number
  rating: string
  timestamp: string
  previousClose?: number
  previous1Week?: number
  previous1Month?: number
  previous1Year?: number
}

interface FngComponent {
  key: string
  score: number | null
  rating: string | null
  data: FngPoint[]
}

interface FngPayload {
  current: FngGauge
  historical: FngPoint[]
  components: FngComponent[]
}

const RATING_COLORS: Record<string, string> = {
  'extreme fear': '#dc2626',
  fear: '#f97316',
  neutral: '#eab308',
  greed: '#84cc16',
  'extreme greed': '#16a34a',
}

function ratingKey(rating: string | null | undefined): string {
  return (rating ?? '').trim().toLowerCase()
}

function colorForScore(score: number): string {
  if (score < 25) return RATING_COLORS['extreme fear']
  if (score < 45) return RATING_COLORS.fear
  if (score < 55) return RATING_COLORS.neutral
  if (score < 75) return RATING_COLORS.greed
  return RATING_COLORS['extreme greed']
}

function formatDate(ms: number | string | undefined, lang: 'en' | 'zh'): string {
  if (ms == null || ms === '') return ''
  const date = typeof ms === 'number' ? new Date(ms) : new Date(ms)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

interface BarometerProps {
  score: number
  ratingLabel: string
}

function Barometer({ score, ratingLabel }: BarometerProps) {
  const clamped = Math.max(0, Math.min(100, score))
  const cx = 150
  const cy = 150
  const r = 120
  const strokeW = 26

  // Map a 0..100 value to an angle in degrees for a 180° dial.
  // 0 -> 180° (left), 100 -> 360°/0° (right).
  const valueToAngle = (v: number) => 180 + (v / 100) * 180
  const polar = (angleDeg: number, radius: number) => {
    const a = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) }
  }
  const arcPath = (from: number, to: number, radius: number) => {
    const start = polar(valueToAngle(from), radius)
    const end = polar(valueToAngle(to), radius)
    const largeArc = to - from > 50 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const segments = [
    { from: 0, to: 25, color: RATING_COLORS['extreme fear'] },
    { from: 25, to: 45, color: RATING_COLORS.fear },
    { from: 45, to: 55, color: RATING_COLORS.neutral },
    { from: 55, to: 75, color: RATING_COLORS.greed },
    { from: 75, to: 100, color: RATING_COLORS['extreme greed'] },
  ]

  const needleAngle = valueToAngle(clamped)
  const needleTip = polar(needleAngle, r - strokeW / 2 - 6)
  const needleColor = colorForScore(clamped)

  const ticks = [0, 25, 50, 75, 100]

  return (
    <svg viewBox="0 -20 300 190" className="w-full max-w-sm" role="img" aria-label={`Fear and Greed ${score}`}>
      {segments.map(seg => (
        <path
          key={seg.from}
          d={arcPath(seg.from, seg.to, r)}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeW}
          strokeLinecap="butt"
        />
      ))}

      {ticks.map(tv => {
        const p = polar(valueToAngle(tv), r + strokeW / 2 + 12)
        return (
          <text
            key={tv}
            x={p.x}
            y={p.y}
            fontSize="12"
            fill="#9ca3af"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {tv}
          </text>
        )
      })}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={needleTip.x}
        y2={needleTip.y}
        stroke={needleColor}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={9} fill={needleColor} />

      {/* Center readout */}
      <text x={cx} y={cy - 34} fontSize="40" fontWeight="700" fill={needleColor} textAnchor="middle">
        {Math.round(clamped)}
      </text>
      <text x={cx} y={cy - 8} fontSize="14" fontWeight="600" fill="#4b5563" textAnchor="middle">
        {ratingLabel}
      </text>
    </svg>
  )
}

export default function FearGreedPage() {
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [payload, setPayload] = useState<FngPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        const res = await fetch('/api/fear-greed')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: FngPayload = await res.json()
        if (!cancelled) setPayload(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
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
    router.push(lang === 'zh' ? '/fear-greed?lang=zh' : '/fear-greed', undefined, { shallow: true })
  }

  const translateRating = (rating: string | null | undefined): string => {
    const key = ratingKey(rating) as keyof typeof t.fearGreed.ratings
    return t.fearGreed.ratings[key] ?? (rating ?? '')
  }

  const historyChart = useMemo(() => {
    const hist = payload?.historical ?? []
    return {
      labels: hist.map(p => p.x),
      datasets: [
        {
          label: t.fearGreed.charts.history,
          data: hist.map(p => p.y),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79,70,229,0.12)',
          borderWidth: 1.5,
          pointRadius: 0,
          spanGaps: true,
          fill: true,
        },
      ],
    }
  }, [payload, t])

  const historyOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items: any[]) => formatDate(Number(items?.[0]?.label), language),
            label: (ctx: any) => {
              const v = ctx.parsed?.y
              return v == null ? '—' : `${v.toFixed(0)} / 100`
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
              return formatDate(Number(label), language)
            },
          },
        },
        y: {
          min: 0,
          max: 100,
          ticks: { stepSize: 25 },
        },
      },
    }),
    [language]
  )

  const componentOptions = (_color: string, showLegend = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: showLegend
        ? { display: true, position: 'top' as const, labels: { boxWidth: 12, font: { size: 11 } } }
        : { display: false },
      tooltip: {
        callbacks: {
          title: (items: any[]) => formatDate(Number(items?.[0]?.label), language),
          label: (ctx: any) => {
            const v = ctx.parsed?.y
            const val = v == null ? '—' : v.toFixed(2)
            return showLegend ? `${ctx.dataset.label}: ${val}` : val
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxTicksLimit: 5,
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          callback: function (this: any, _value: any, index: number) {
            const label = this.getLabelForValue ? this.getLabelForValue(index) : ''
            return formatDate(Number(label), language)
          },
        },
      },
      y: { ticks: { maxTicksLimit: 4 } },
    },
  })

  return (
    <>
      <Head>
        <title>{t.fearGreed.title}</title>
        <meta name="description" content={t.fearGreed.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://www.qdiiquota.pro/fear-greed" />
      </Head>

      <Navigation language={language} onLanguageChange={handleLanguageChange} />

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{t.fearGreed.heading}</h1>
            <p className="text-gray-600">{t.fearGreed.subheading}</p>
          </header>

          {loading && (
            <div className="bg-white rounded-lg shadow p-10 text-center text-gray-600">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4" />
              <p>{t.fearGreed.loading}</p>
            </div>
          )}

          {!loading && error && (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <p className="text-red-600 font-medium mb-1">{t.fearGreed.error}</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          )}

          {!loading && !error && payload && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Current gauge */}
                <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
                  <div className="text-sm text-gray-500 mb-2">{t.fearGreed.now}</div>
                  <Barometer
                    score={payload.current.score}
                    ratingLabel={translateRating(payload.current.rating)}
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    {t.fearGreed.lastUpdated}: {formatDate(payload.current.timestamp, language)}
                  </div>
                </div>

                {/* Comparison cards */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4 content-center">
                  {[
                    { label: t.fearGreed.compare.previousClose, val: payload.current.previousClose },
                    { label: t.fearGreed.compare.week, val: payload.current.previous1Week },
                    { label: t.fearGreed.compare.month, val: payload.current.previous1Month },
                    { label: t.fearGreed.compare.year, val: payload.current.previous1Year },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-lg shadow-sm p-4 text-center">
                      <div className="text-xs text-gray-500 mb-2">{card.label}</div>
                      <div
                        className="text-2xl font-bold"
                        style={{ color: card.val == null ? '#6b7280' : colorForScore(card.val) }}
                      >
                        {card.val == null ? '—' : card.val.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical chart */}
              <div className="bg-white rounded-lg shadow p-5 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.fearGreed.charts.history}</h2>
                <div className="relative h-80">
                  <Line data={historyChart} options={historyOptions as any} />
                </div>
              </div>

              {/* Component charts */}
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.fearGreed.charts.components}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const byKey = new Map(payload.components.map(c => [c.key, c]))
                  const overlayFor: Record<string, string> = {
                    market_momentum_sp500: 'market_momentum_sp125',
                    market_volatility_vix: 'market_volatility_vix_50',
                  }
                  const overlayKeys = new Set(Object.values(overlayFor))

                  return payload.components
                    .filter(comp => !overlayKeys.has(comp.key))
                    .map(comp => {
                      const name =
                        t.fearGreed.components[comp.key as keyof typeof t.fearGreed.components] ?? comp.key
                      const color = colorForScore(comp.score ?? 50)
                      const labels = comp.data.map(p => p.x)

                      const datasets: any[] = [
                        {
                          label: name,
                          data: comp.data.map(p => p.y),
                          borderColor: color,
                          backgroundColor: 'rgba(0,0,0,0.04)',
                          borderWidth: 1.5,
                          pointRadius: 0,
                          spanGaps: true,
                          fill: true,
                        },
                      ]

                      const overlayKey = overlayFor[comp.key]
                      const overlay = overlayKey ? byKey.get(overlayKey) : undefined
                      if (overlay) {
                        const overlayMap = new Map(overlay.data.map(p => [p.x, p.y]))
                        const overlayName =
                          t.fearGreed.components[overlay.key as keyof typeof t.fearGreed.components] ??
                          overlay.key
                        datasets.push({
                          label: overlayName,
                          data: labels.map(x => (overlayMap.has(x) ? (overlayMap.get(x) as number) : null)),
                          borderColor: '#6b7280',
                          backgroundColor: 'transparent',
                          borderWidth: 1.5,
                          borderDash: [5, 4],
                          pointRadius: 0,
                          spanGaps: true,
                          fill: false,
                        })
                      }

                      const data = { labels, datasets }
                      const showLegend = Boolean(overlay)

                      return (
                        <div key={comp.key} className="bg-white rounded-lg shadow p-5">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                            <span
                              className="text-xs font-medium px-2 py-0.5 rounded"
                              style={{ color, backgroundColor: `${color}1a` }}
                            >
                              {comp.score == null ? '—' : comp.score.toFixed(0)}
                              {comp.rating ? ` · ${translateRating(comp.rating)}` : ''}
                            </span>
                          </div>
                          <div className="relative h-48">
                            <Line data={data} options={componentOptions(color, showLegend) as any} />
                          </div>
                        </div>
                      )
                    })
                })()}
              </div>

              <p className="text-xs text-gray-500 mt-6">
                {t.fearGreed.dataSource}:{' '}
                <a
                  href="https://www.cnn.com/markets/fear-and-greed"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {t.fearGreed.cnn}
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
