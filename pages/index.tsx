import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import { useForm } from '@formspree/react'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import React from 'react'

export default function Home() {
  const [filters, setFilters] = useState({ fund_company: '', fund_name: '', fund_code: '', country: '' })
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('changeFromAthPercent')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [fundCompanies, setFundCompanies] = useState<string[]>([]) // State to store unique fund companies
  const [state, handleSubmit] = useForm("xyzdlpln")
  const [message, setMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'funds' | 'stocks'>('funds')
  const [stockData, setStockData] = useState<any[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [stockMarket, setStockMarket] = useState<'US' | 'HK'>('US')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const companyList = ["易方达", "长城", "景顺长城", "华泰证券", "国海富兰克林", "鹏华", "中银", "博时", "嘉实", "华夏", "汇添富", "天弘", "工银瑞信", "摩根", "大成", "国泰", "建信", "宝盈", "华泰柏瑞", "南方", "万家", "广发", "华安", "华宝", "招商", "海富通"].sort((a, b) => a.charAt(0).localeCompare(b.charAt(0), 'zh'))

  // Fetch all data on mount
  useEffect(() => {
    fetchData()
    setFundCompanies(companyList) // Set companies directly from the list
    // eslint-disable-next-line
  }, [])

  const fetchData = async (customFilters = filters) => {
    setLoading(true)
    const params = new URLSearchParams()
    Object.entries(customFilters).forEach(([k, v]) => { if (v) params.append(k, v) })
    const res = await fetch('/api/quotas?' + params.toString())
    const fetchedData = await res.json()
    setData(sortData(fetchedData, 'quota', 'desc'))
    setLoading(false)
  }

  const sortData = (data: any[], key: string, direction: 'asc' | 'desc') => {
    if (!key) return data
    return [...data].sort((a, b) => {
      let aVal = a[key]
      let bVal = b[key]
      if (typeof aVal === 'string' && !isNaN(Number(aVal))) {
        aVal = Number(aVal)
        bVal = Number(bVal)
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    })
  }

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDirection(newDirection)
    setData(sortData(data, key, newDirection))
  }

  const handleSearch = () => fetchData()

  const resetFilters = () => {
    const clearedFilters = { fund_company: '', fund_name: '', fund_code: '', country: '' }
    setFilters(clearedFilters)
    fetchData(clearedFilters) // Pass cleared filters directly to fetchData
  }

  const openPdf = (pdfId: number) => {
    const url = `http://eid.csrc.gov.cn/fund/disclose/instance_html_view.do?instanceid=${pdfId}`
    window.open(url, '_blank', 'noopener,noreferrer') // Open the PDF in a new tab
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    if (!email.trim()) {
      const confirmed = window.confirm('您未提供邮箱，我们无法回复您的留言。确定要继续提交吗？')
      if (!confirmed) {
        e.preventDefault()
        return
      }
    }
    handleSubmit(e)
  }

  const fetchStockData = async () => {
    setStockLoading(true)
    const formattedDate = selectedDate.toISOString().split('T')[0]
    const res = await fetch(`/api/stocks?date=${formattedDate}`)
    const fetchedStockData = await res.json()
    // Always sort the newly fetched data
    const sortedStockData = sortData(fetchedStockData, sortKey, sortDirection)
    setStockData(sortedStockData)
    setStockLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'stocks') {
      fetchStockData()
    }
  }, [activeTab])

  // Add this useEffect to fetch stock data when selectedDate changes
  useEffect(() => {
    if (activeTab === 'stocks') {
      fetchStockData()
    }
  }, [selectedDate])

  useEffect(() => {
    if (activeTab === 'stocks' && stockData.length > 0) {
      setStockData(sortData(stockData, sortKey, sortDirection))
    }
    // eslint-disable-next-line
  }, [sortKey, sortDirection])

  const formatDate = (date: Date) => {
    return date.getDate().toString().padStart(2, '0')
  }

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const minDate = new Date('2025-09-12')
  const maxDate = new Date()

  const filteredStockData = stockData.filter(stock => stockMarket === 'US' ? stock.market === 'US' : stock.market === 'HK')

  // Ref for the date picker
  const datePickerRef = useRef<DatePicker>(null);

  // Custom input for DatePicker
  const DatePickerCustomInput = React.forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
    <div className="flex items-center justify-end w-full bg-transparent cursor-pointer" onClick={onClick} ref={ref}>
      <span className="mr-1">📅</span>
      <span className="text-right w-full">{value}</span>
    </div>
  ))

  return (
    <>
      <Head>
        <title>QDII基金申购额度查询</title>
        <meta name="description" content="快速查询QDII基金申购额度，支持多条件筛选." />
        <meta name="keywords" content="QDII基金, 申购额度查询, 纳斯达克指数，标普指数, 纳指额度, 标普额度" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-2">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700 mb-2 tracking-tight">QDII基金额度查询</h1>
            <p className="text-gray-600 text-lg">快速查询各QDII基金额度，支持多条件筛选</p>
          </div>
          <div className="mb-4 flex justify-center">
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === 'funds' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setActiveTab('funds')}
            >
              基金额度
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold transition ml-4 ${activeTab === 'stocks' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setActiveTab('stocks')}
            >
              Mega 7 股票
            </button>
          </div>
          {activeTab === 'funds' && (
            <>
              <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
                <select
                  className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
                  value={filters.fund_company}
                  onChange={e => {
                    const newFilters = { ...filters, fund_company: e.target.value }
                    setFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="">基金公司</option>
                  {fundCompanies.map((company, index) => (
                    <option key={index} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
                <input
                  list="fund-names"
                  className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
                  placeholder="基金名称"
                  value={filters.fund_name}
                  onChange={e => {
                    const newFilters = { ...filters, fund_name: e.target.value }
                    setFilters(newFilters)
                    fetchData(newFilters)
                  }}
                />
                <datalist id="fund-names">
                  <option value="标普" />
                  <option value="标普500ETF" />
                  <option value="道琼斯" />
                  <option value="精选" />
                  <option value="黄金" />
                  <option value="恒生科技" />
                  <option value="恒生互联网" />
                  <option value="日经" />
                  <option value="纳斯达克100ETF" />
                  <option value="生物科技" />
                  <option value="石油" />
                  <option value="债券" />
                </datalist>
                <select
                  className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
                  value={filters.country}
                  onChange={e => {
                    const newFilters = { ...filters, country: e.target.value }
                    setFilters(newFilters)
                    fetchData(newFilters)
                  }}
                >
                  <option value="">国家</option>
                  <option value="法国">法国</option>
                  <option value="美国">美国</option>
                  <option value="欧洲">欧洲</option>
                  <option value="日本">日本</option>
                  <option value="越南">越南</option>
                  <option value="印度">印度</option>
                  <option value="亚洲">亚洲</option>
                  <option value="中国">中国</option>
                </select>
                <input
                  className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
                  placeholder="基金代码"
                  value={filters.fund_code}
                  onChange={e => setFilters(f => ({ ...f, fund_code: e.target.value }))}
                />
                <button
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? '查询中...' : '查询'}
                </button>
                <button
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition"
                  onClick={resetFilters}
                >
                  重置
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl shadow-lg bg-white/90">
                <table className="min-w-full text-sm md:text-base table-auto">
                  <thead>
                    <tr className="bg-indigo-100 text-indigo-800">
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('fund_company')}>
                        基金公司 {sortKey === 'fund_company' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('fund_name')}>
                        基金简称 {sortKey === 'fund_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('share_class')}>
                        份额类别 {sortKey === 'share_class' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('fund_code')}>
                        基金代码 {sortKey === 'fund_code' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('quota')}>
                        额度 {sortKey === 'quota' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('currency')}>
                        币种 {sortKey === 'currency' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left cursor-pointer hover:bg-indigo-200" onClick={() => handleSort('otc')}>
                        OTC {sortKey === 'otc' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="p-3 font-semibold text-left">公告</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-indigo-400">加载中...</td>
                      </tr>
                    ) : data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-gray-400">暂无数据</td>
                      </tr>
                    ) : (
                      data.map((row, i) => (
                        <tr key={i} className="hover:bg-indigo-50 transition">
                          <td className="p-3 border-b border-gray-100 text-left">{row.fund_company}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.fund_name}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.share_class}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.fund_code}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.quota.toLocaleString()}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.currency}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{row.otc}</td>
                          <td className="p-3 border-b border-gray-100 text-left">
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => openPdf(row.pdf_id)}
                            >
                              📄
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {activeTab === 'stocks' && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`mr-2 font-semibold ${stockMarket === 'US' ? 'text-indigo-700' : 'text-gray-500'}`}>美股</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={stockMarket === 'HK'} onChange={() => setStockMarket(m => m === 'US' ? 'HK' : 'US')} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500 rounded-full peer peer-checked:bg-indigo-600 transition"></div>
                    <span className="ml-3 font-semibold text-gray-500">港股</span>
                  </label>
                </div>
                <div className="relative flex items-center justify-end w-40">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    minDate={minDate}
                    maxDate={maxDate}
                    dateFormat="yyyy-MM-dd"
                    className="bg-transparent cursor-pointer text-right w-full pr-7"
                    ref={datePickerRef}
                    calendarClassName="right-0"
                    customInput={<DatePickerCustomInput />}
                  />
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl shadow-lg bg-white/90">
                <table className="min-w-full text-sm md:text-base table-auto">
                  <thead>
                    <tr className="bg-indigo-100 text-indigo-800">
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('ticker')}>Ticker {sortKey === 'ticker' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('name')}>Name {sortKey === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('lastClosingPrice')}>Last Closing Price {sortKey === 'lastClosingPrice' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('allTimeHigh')}>All Time High Price {sortKey === 'allTimeHigh' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('lastChangePercent')}>Last Change % {sortKey === 'lastChangePercent' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                      <th className="p-3 font-semibold text-left cursor-pointer" onClick={() => handleSort('changeFromAthPercent')}>Change % from ATH {sortKey === 'changeFromAthPercent' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-indigo-400">加载中...</td>
                      </tr>
                    ) : filteredStockData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-400">暂无数据</td>
                      </tr>
                    ) : (
                      filteredStockData.map((stock, i) => (
                        <tr key={i} className="hover:bg-indigo-50 transition">
                          <td className="p-3 border-b border-gray-100 text-left">{stock.ticker}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{stock.name}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{stock.lastClosingPrice}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{stock.allTimeHigh}</td>
                          <td className="p-3 border-b border-gray-100 text-left">{stock.lastChangePercent}%</td>
                          <td className="p-3 border-b border-gray-100 text-left">{stock.changeFromAthPercent}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6 mb-8 mt-6">
            <h2 className="text-xl font-semibold text-indigo-700 mb-4">留言反馈</h2>
            <p className="text-gray-600 mb-4">有任何问题或建议，请留下您的信息。我们会尽快回复。</p>
            {state.succeeded && (
              <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">
                感谢您的留言！我们会尽快回复。
              </div>
            )}
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">姓名</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="mt-1 block w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg transition"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">邮箱</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="mt-1 block w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg transition"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  留言 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg transition"
                />
              </div>
              <button
                type="submit"
                disabled={state.submitting || !message.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition disabled:opacity-50"
              >
                {state.submitting ? '发送中...' : '发送留言'}
              </button>
            </form>
          </div>
          <div className="mt-6 text-left text-gray-400 text-xs">
            <p>额度排序按人民币等值计算，美元汇率为7。</p>
            <p>基金公司直销额度往往高于第三方渠道额度。第三方渠道一般只展示渠道额度。</p>
            <p>数据来源：基金公司公告。</p>
          </div>
        </div>
      </div>
    </>
  )
}