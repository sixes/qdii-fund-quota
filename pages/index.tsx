import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function Home() {
  const [filters, setFilters] = useState({ fund_company: '', fund_name: '', fund_code: '' })
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('quota')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [fundCompanies, setFundCompanies] = useState<string[]>([]) // State to store unique fund companies

  const companyList = ["易方达", "中银", "博时", "嘉实", "华夏", "汇添富", "天弘", "工银瑞信", "摩根", "大成", "国泰", "建信", "宝盈", "华泰柏瑞", "南方", "万家", "广发", "华安", "招商", "海富通"].sort((a, b) => a.charAt(0).localeCompare(b.charAt(0), 'zh'))

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
      if (key === 'quota') {
        aVal = a.quota * (a.currency === 'CNY' ? 1 : 7)
        bVal = b.quota * (b.currency === 'CNY' ? 1 : 7)
      }
      if (typeof aVal === 'string') {
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
    const clearedFilters = { fund_company: '', fund_name: '', fund_code: '' }
    setFilters(clearedFilters)
    fetchData(clearedFilters) // Pass cleared filters directly to fetchData
  }

  const openPdf = (pdfId: number) => {
    const url = `http://eid.csrc.gov.cn/fund/disclose/instance_show_pdf_id.do?instanceid=${pdfId}`
    window.open(url, '_blank', 'noopener,noreferrer') // Open the PDF in a new tab
  }

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
            <select
              className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
              value={filters.fund_name}
              onChange={e => {
                const newFilters = { ...filters, fund_name: e.target.value }
                setFilters(newFilters)
                fetchData(newFilters)
              }}
            >
              <option value="">基金名称</option>
              <option value="标普500ETF">标普500ETF</option>
              <option value="纳斯达克100ETF">纳斯达克100ETF</option>
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
                    基金名称 {sortKey === 'fund_name' && (sortDirection === 'asc' ? '↑' : '↓')}
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
          <div className="mt-6 text-left text-gray-400 text-xs">
            <p>额度排序按人民币等值计算，人民币汇率为1，美元汇率为7。</p>
            <p>除非于份额类别中额外注明，USD指现汇。</p>
            <p>基金公司直销额度往往高于第三方渠道额度。第三方渠道一般只展示渠道额度。</p>
            <p>数据来源：基金公司公告。</p>
          </div>
        </div>
      </div>
    </>
  )
}