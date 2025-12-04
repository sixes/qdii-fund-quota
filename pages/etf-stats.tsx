import React, { useEffect, useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Navigation from '../components/Navigation'
import Footer from '../components/Footer'
import { Analytics } from '@vercel/analytics/react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface MarketStats {
  totalAUM: number
  totalETFCount: number
  issuers: Array<{
    issuer: string
    aum: number
    count: number
  }>
  expenseRatios: Record<string, number>
  timestamp: string
}

interface LeverageStat {
  leverageType: string
  aum: number
  count: number
  timestamp: string
}

export default function ETFStats() {
  const router = useRouter()
  const [language, setLanguage] = useState<'en' | 'zh'>('en')
  const [stats, setStats] = useState<MarketStats | null>(null)
  const [leverageStats, setLeverageStats] = useState<LeverageStat[]>([])
  const [issuerByLeverage, setIssuerByLeverage] = useState<{
    [leverageType: string]: Array<{ issuer: string; aum: number; count: number }>
  }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Language translations
  const t = {
    en: {
      title: 'ETF Market Statistics',
      description: 'Comprehensive overview of the leveraged ETF market',
      totalAUM: 'Total Market AUM',
      totalProducts: 'Total ETF Products',
      topIssuers: 'Top Issuers by AUM',
      feeStructure: 'Expense Ratio Distribution',
      issuerComparison: 'Issuer Market Share',
      productCount: 'Products',
      expenseRatio: 'Expense Ratio (%)',
      count: 'ETF Count',
      aum: 'AUM',
      loading: 'Loading market statistics...',
      error: 'Failed to load market statistics',
      trillion: 'T',
      billion: 'B',
      lastUpdated: 'Last Updated'
    },
    zh: {
      title: 'ETF市场统计',
      description: '杠杆ETF市场的全面概览',
      totalAUM: '市场总AUM',
      totalProducts: '总ETF产品数',
      topIssuers: '发行商AUM排名',
      feeStructure: '费率分布',
      issuerComparison: '发行商市场份额',
      productCount: '产品数',
      expenseRatio: '费率(%)',
      count: 'ETF数量',
      aum: 'AUM',
      loading: '加载市场统计中...',
      error: '加载市场统计失败',
      trillion: '万亿',
      billion: '十亿',
      lastUpdated: '最后更新'
    }
  }

  const translations = t[language]

  // Handle language change from URL
  useEffect(() => {
    const langFromUrl = router.query.lang as string
    if (langFromUrl === 'zh') {
      setLanguage('zh')
    } else {
      setLanguage('en')
    }
  }, [router.query.lang])

    // Fetch market statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)
        const [marketRes, leverageRes] = await Promise.all([
          fetch('/api/etf-market-stats'),
          fetch('/api/etf-stats-by-leverage')
        ])
        
        if (!marketRes.ok) {
          throw new Error('Failed to fetch statistics')
        }
        
        const marketData: MarketStats = await marketRes.json()
        setStats(marketData)
        
        if (leverageRes.ok) {
          const leverageData = await leverageRes.json()
          setLeverageStats(leverageData.leverageStats || [])
          setIssuerByLeverage(leverageData.issuerByLeverage || {})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setLanguage(lang)
    router.push(`/etf-stats?lang=${lang}`, undefined, { shallow: true })
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>{translations.title} | ETF Market Statistics</title>
          <meta name="description" content={translations.description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="canonical" href="https://www.qdiiquota.pro/etf-stats" />
        </Head>
        <Navigation language={language} onLanguageChange={handleLanguageChange} />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">{translations.loading}</p>
          </div>
        </main>
        <Footer language={language} />
        <Analytics />
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        <Head>
          <title>{translations.title} | ETF Market Statistics</title>
          <meta name="description" content={translations.description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="canonical" href="https://www.qdiiquota.pro/etf-stats" />
        </Head>
        <Navigation language={language} onLanguageChange={handleLanguageChange} />
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{translations.error}</p>
            {error && <p className="text-gray-500 text-sm">{error}</p>}
          </div>
        </main>
        <Footer language={language} />
        <Analytics />
      </>
    )
  }

  // Prepare data for charts
  const topIssuers = stats.issuers.slice(0, 10)
  const issuerLabels = topIssuers.map(i => i.issuer)
  const issuerAUM = topIssuers.map(i => i.aum / 1e9) // Convert to billions
  const issuerCounts = topIssuers.map(i => i.count)

  // Issuer market share (pie chart)
  const issuerShareLabels = stats.issuers.slice(0, 8).map(i => i.issuer)
  const issuerShareData = stats.issuers.slice(0, 8).map(i => i.aum)

  // Expense ratio data
  const expenseRatioLabels = Object.keys(stats.expenseRatios)
  const expenseRatioCounts = Object.values(stats.expenseRatios)

  // Leverage type data (already sorted correctly by API)
  const leverageLabels = leverageStats.map(l => l.leverageType)
  const leverageAUM = leverageStats.map(l => l.aum / 1e9) // Convert to billions
  const leverageCounts = leverageStats.map(l => l.count)

  // Chart colors
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#6366f1', '#84cc16', '#f97316'
  ]

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12 },
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 14 },
        bodyFont: { size: 13 }
      }
    }
  }

  return (
    <>
      <Head>
        <title>{translations.title} | ETF Market Statistics</title>
        <meta name="description" content={translations.description} />
        <meta name="keywords" content="ETF market statistics, leverage ETF, issuer comparison, expense ratio" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={translations.title} />
        <meta property="og:description" content={translations.description} />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://www.qdiiquota.pro/etf-stats" />
      </Head>

      <Navigation language={language} onLanguageChange={handleLanguageChange} />

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{translations.title}</h1>
            <p className="text-gray-600 mb-4">{translations.description}</p>
            <p className="text-sm text-gray-500">
              {translations.lastUpdated}: {new Date(stats.timestamp).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US')}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Total AUM Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">{translations.totalAUM}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                ${(stats.totalAUM / 1e12).toFixed(2)}{translations.trillion}
              </p>
              <p className="text-xs text-gray-500">
                {(stats.totalAUM / 1e9).toFixed(0)}B USD
              </p>
            </div>

            {/* Total Products Card */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <h3 className="text-gray-600 text-sm font-medium mb-2">{translations.totalProducts}</h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stats.totalETFCount.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                {language === 'en' ? 'active ETF products' : '个活跃ETF产品'}
              </p>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Issuers Bar Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{translations.topIssuers}</h2>
              <div className="relative h-80">
                <Bar
                  data={{
                    labels: issuerLabels,
                    datasets: [
                      {
                        label: `${translations.aum} (${translations.billion})`,
                        data: issuerAUM,
                        backgroundColor: '#3b82f6',
                        borderColor: '#2563eb',
                        borderWidth: 1,
                        borderRadius: 4
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                    scales: {
                      x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                      },
                      y: {
                        grid: { display: false }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Issuer Market Share Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{translations.issuerComparison}</h2>
              <div className="relative h-80">
                <Doughnut
                  data={{
                    labels: issuerShareLabels,
                    datasets: [
                      {
                        data: issuerShareData,
                        backgroundColor: colors.slice(0, issuerShareLabels.length),
                        borderColor: 'white',
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        ...chartOptions.plugins.legend,
                        position: 'right' as const
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Expense Ratio Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{translations.feeStructure}</h2>
            <div className="relative h-80">
              <Bar
                data={{
                  labels: expenseRatioLabels,
                  datasets: [
                    {
                      label: `${translations.count}`,
                      data: expenseRatioCounts,
                      backgroundColor: [
                        '#10b981', '#34d399', '#6ee7b7', '#a7f3d0',
                        '#f59e0b', '#ef4444', '#fecaca'
                      ],
                      borderColor: 'rgba(0, 0, 0, 0.1)',
                      borderWidth: 1,
                      borderRadius: 4
                    }
                  ]
                }}
                options={{
                  ...chartOptions,
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: {
                      grid: { display: false }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Leverage Type Distribution */}
          {leverageStats.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Leverage Type AUM Bar Chart */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{language === 'en' ? 'Leverage Type Distribution' : '杠杆类型分布'}</h2>
                <div className="relative" style={{ height: `${Math.max(400, leverageLabels.length * 25)}px` }}>
                  <Bar
                    data={{
                      labels: leverageLabels,
                      datasets: [
                        {
                          label: `${translations.aum} (${translations.billion})`,
                          data: leverageAUM,
                          backgroundColor: '#10b981',
                          borderColor: '#059669',
                          borderWidth: 1,
                          borderRadius: 4
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      maintainAspectRatio: false,
                      indexAxis: 'y' as const,
                      scales: {
                        x: {
                          type: 'logarithmic' as const,
                          grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        },
                        y: {
                          grid: { display: false },
                          ticks: {
                            font: { size: 11 }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{language === 'en' ? 'Note: Logarithmic scale used for better comparison' : '注：使用对数刻度以便更好比较'}</p>
              </div>

              {/* Leverage Type Product Count */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {language === 'en' ? 'ETF Count by Leverage Type' : '杠杆类型ETF数量'}
                </h2>
                <div className="relative" style={{ height: `${Math.max(400, leverageLabels.length * 25)}px` }}>
                  <Bar
                    data={{
                      labels: leverageLabels,
                      datasets: [
                        {
                          label: translations.count,
                          data: leverageCounts,
                          backgroundColor: '#f59e0b',
                          borderColor: '#d97706',
                          borderWidth: 1,
                          borderRadius: 4
                        }
                      ]
                    }}
                    options={{
                      ...chartOptions,
                      maintainAspectRatio: false,
                      indexAxis: 'y' as const,
                      scales: {
                        x: {
                          type: 'logarithmic' as const,
                          grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        },
                        y: {
                          grid: { display: false },
                          ticks: {
                            font: { size: 11 }
                          }
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">{language === 'en' ? 'Note: Logarithmic scale used for better comparison' : '注：使用对数刻度以便更好比较'}</p>
              </div>
            </div>
          )}

          {/* Issuer Breakdown by Leverage Type - Chart */}
          {Object.keys(issuerByLeverage).length > 0 && leverageStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {language === 'en' ? 'Top Issuers by Leverage Type' : '按杠杆类型分类的顶级发行商'}
              </h2>
              <div className="relative" style={{ height: '500px' }}>
                <Bar
                  data={{
                    labels: leverageStats.map(l => l.leverageType),
                    datasets: (() => {
                      // Get unique top issuers across all leverage types
                      const issuerSet = new Set<string>()
                      Object.values(issuerByLeverage).forEach(issuers => {
                        issuers.slice(0, 3).forEach(i => issuerSet.add(i.issuer))
                      })
                      const topIssuers = Array.from(issuerSet).slice(0, 8)
                      
                      // Create dataset for each issuer
                      return topIssuers.map((issuer, idx) => ({
                        label: issuer,
                        data: leverageStats.map(leverage => {
                          const issuerData = (issuerByLeverage[leverage.leverageType] || []).find(
                            i => i.issuer === issuer
                          )
                          return issuerData ? issuerData.aum / 1e9 : 0
                        }),
                        backgroundColor: colors[idx % colors.length],
                        borderColor: 'rgba(0, 0, 0, 0.1)',
                        borderWidth: 1,
                        borderRadius: 4
                      }))
                    })()
                  }}
                  options={{
                    ...chartOptions,
                    maintainAspectRatio: false,
                    indexAxis: 'y' as const,
                    plugins: {
                      ...chartOptions.plugins,
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        callbacks: {
                          label: function(context: any) {
                            const label = context.dataset.label || ''
                            const value = context.parsed.x
                            return `${label}: $${value.toFixed(2)}B`
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        stacked: true,
                        type: 'logarithmic',
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        title: {
                          display: true,
                          text: language === 'en' ? 'AUM (Billions USD)' : 'AUM（十亿美元）'
                        }
                      },
                      y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: {
                          font: { size: 11 }
                        }
                      }
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{language === 'en' ? 'Note: Shows top issuers (up to 8) for each leverage type with logarithmic scale' : '注：显示每个杠杆类型的顶级发行商（最多5个），使用对数刻度'}</p>
            </div>
          )}

          {/* Detailed Statistics Table */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{translations.topIssuers}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      {language === 'en' ? 'Issuer' : '发行商'}
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {translations.aum}
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {language === 'en' ? 'Market Share' : '市场份额'}
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      {translations.productCount}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.issuers.slice(0, 15).map((issuer, idx) => {
                    const marketShare = ((issuer.aum / stats.totalAUM) * 100).toFixed(2)
                    return (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{issuer.issuer}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">
                          ${(issuer.aum / 1e9).toFixed(2)}B
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {marketShare}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right">{issuer.count}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer language={language} />
      <Analytics />
    </>
  )
}
