import { useEffect, useState } from 'react'

export default function Home() {
  const [filters, setFilters] = useState({ fund_company: '', fund_name: '', fund_code: '' })
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<string>('quota')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch all data on mount
  useEffect(() => {
    fetchData()
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
        aVal = a.quota * (a.currency === 'RMB' ? 1 : 7)
        bVal = b.quota * (b.currency === 'RMB' ? 1 : 7)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-2">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700 mb-2 tracking-tight">QDII基金额度查询</h1>
          <p className="text-gray-600 text-lg">快速查询各QDII基金额度，支持多条件筛选，移动端友好</p>
        </div>
        <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row gap-4 items-center">
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
            placeholder="基金公司"
            value={filters.fund_company}
            onChange={e => setFilters(f => ({ ...f, fund_company: e.target.value }))}
          />
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 p-2 rounded-lg flex-1 transition"
            placeholder="基金名称"
            value={filters.fund_name}
            onChange={e => setFilters(f => ({ ...f, fund_name: e.target.value }))}
          />
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-indigo-400">加载中...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400">暂无数据</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-6 text-center text-gray-400 text-xs">
          额度排序按人民币等值计算，人民币汇率为1，美元汇率为7。
        </div>
      </div>
    </div>
  )
}

