import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TableSortLabel from '@mui/material/TableSortLabel';
import Pagination from '@mui/material/Pagination';
import { Analytics } from '@vercel/analytics/react';

interface ETF {
  ticker: string;
  etfLeverage: string;
  issuer: string;
  assets: number;
  assetClass: string;
  expenseRatio: number | null;
  close: number | null;
  volume: number | null;
  ch1w: number | null;
  ch1m: number | null;
  ch6m: number | null;
  chYTD: number | null;
  ch1y: number | null;
  ch3y: number | null;
  ch5y: number | null;
  ch10y: number | null;
  high52: number | null;
  low52: number | null;
  allTimeHigh: number | null;
  allTimeHighChange: number | null;
  allTimeHighDate: string | null;
  allTimeLow: number | null;
  allTimeLowChange: number | null;
  allTimeLowDate: string | null;
  etfIndex: string | null;
  lastUpdated?: string | null;
}

interface LeverageSummary {
  leverageType: string;
  count: number;
  totalAssets: number;
  avgCh1m: number | null;
  avgChYTD: number | null;
  avgCh1y: number | null;
}

export default function Home() {
  console.log('🏠 Home component rendering');
  console.time('⏱️ Total Home Page Load');

  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [selectedLeverage, setSelectedLeverage] = useState<string>('all');
  const [selectedIssuer, setSelectedIssuer] = useState<string>('all');
  const [issuers, setIssuers] = useState<string[]>([]);
  const [etfData, setEtfData] = useState<ETF[]>([]);
  const [allEtfData, setAllEtfData] = useState<ETF[]>([]);
  const [summaryData, setSummaryData] = useState<LeverageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('chYTD');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openMenu, setOpenMenu] = useState<null | 'nasdaq100' | 'sp500' | 'dow'>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredCount, setFilteredCount] = useState(0);
  const [delistedETFs, setDelistedETFs] = useState<any[]>([]);
  const [newLaunchETFs, setNewLaunchETFs] = useState<any[]>([]);
  const [gainersLosers, setGainersLosers] = useState<any>(null);
  const [selectedGainersLosersPeriode, setSelectedGainersLosersPeriod] = useState<'ch1w' | 'ch1m' | 'ch6m' | 'ch1y' | 'ch3y' | 'ch5y' | 'ch10y' | 'chYTD'>('chYTD');
  const [dataUpdated, setDataUpdated] = useState<string | null>(null);

  // Prominent issuers for quick filter
  const prominentIssuers = ['Direxion', 'ProShares', 'GraniteShares', 'BlackRock', 'Vanguard', 'State Street', 'Invesco', 'Charles Schwab', 'JPMorgan Chase'];

  // Refs for dual scrollbar sync
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  // Sync scrollbars
  useEffect(() => {
    const topScroll = topScrollRef.current;
    const tableScroll = tableScrollRef.current;

    if (!topScroll || !tableScroll) return;

    const handleTopScroll = () => {
      if (tableScroll) {
        tableScroll.scrollLeft = topScroll.scrollLeft;
      }
    };

    const handleTableScroll = () => {
      if (topScroll) {
        topScroll.scrollLeft = tableScroll.scrollLeft;
      }
    };

    topScroll.addEventListener('scroll', handleTopScroll);
    tableScroll.addEventListener('scroll', handleTableScroll);

    return () => {
      topScroll.removeEventListener('scroll', handleTopScroll);
      tableScroll.removeEventListener('scroll', handleTableScroll);
    };
  }, []);

  // Log when component finishes loading
  useEffect(() => {
    if (!loading && allEtfData.length > 0) {
      console.timeEnd('⏱️ Total Home Page Load');
      console.log('✅ Home page fully loaded and interactive!');
    }
  }, [loading, allEtfData]);

  // Set language from URL
  useEffect(() => {
    const langFromUrl = router.query.lang as string;
    setLanguage(langFromUrl === 'zh' ? 'zh' : 'en');
  }, [router.query.lang]);

  // Fetch issuers and summary data in parallel (non-blocking)
  useEffect(() => {
    const fetchInitialData = async () => {
      console.time('⏱️ Fetch Initial Data (issuers + summary)');
      try {
        console.time('  ⏱️ Parallel API calls');
        // Fetch issuers and summary in parallel
        const [issuersRes, summaryRes] = await Promise.all([
          fetch('/api/etf-issuers'),
          fetch('/api/etf-leverage-summary')
        ]);
        console.timeEnd('  ⏱️ Parallel API calls');

        console.time('  ⏱️ Parse JSON');
        const [issuersData, summaryDataRes] = await Promise.all([
          issuersRes.json(),
          summaryRes.json()
        ]);
        console.timeEnd('  ⏱️ Parse JSON');

        console.time('  ⏱️ Set State');
        setIssuers(issuersData.issuers || []);
        setSummaryData(summaryDataRes.summary || []);
        console.timeEnd('  ⏱️ Set State');
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
      console.timeEnd('⏱️ Fetch Initial Data (issuers + summary)');
    };
    fetchInitialData();
  }, []);

  // Fetch ETF data with optimized loading
  useEffect(() => {
    const fetchETFs = async () => {
      console.time('⏱️ Fetch ETF Data');
      setLoading(true);
      try {
        // Smart limit: initial "all" view shows top 200, filtered views show more
        const isAllFilter = selectedLeverage === 'all' && selectedIssuer === 'all';
        const fetchLimit = isAllFilter ? '5000' : '5000';

        console.log(`📊 Fetching ${fetchLimit} ETFs with filters:`, {
          leverage: selectedLeverage,
          issuer: selectedIssuer,
          sortBy: sortKey
        });

        console.time('  ⏱️ API Call (/api/etf-leverage)');
        const params = new URLSearchParams({
          leverageType: selectedLeverage,
          issuer: selectedIssuer,
          sortBy: sortKey,
          sortOrder: sortDirection,
          limit: fetchLimit,
        });
        const res = await fetch(`/api/etf-leverage?${params}`);
        console.timeEnd('  ⏱️ API Call (/api/etf-leverage)');

        console.time('  ⏱️ Parse JSON');
        const data = await res.json();
        console.timeEnd('  ⏱️ Parse JSON');

        console.time('  ⏱️ Set State');
        setAllEtfData(data.data || []);
        const latest = (data.data || []).reduce((acc: string | null, etf: ETF) => {
          if (!etf.lastUpdated) return acc;
          return acc === null || etf.lastUpdated > acc ? etf.lastUpdated : acc;
        }, null as string | null);
        if (latest) setDataUpdated(latest);
        setPage(1); // Reset to first page when filters change
        console.timeEnd('  ⏱️ Set State');

        console.log(`✅ Loaded ${data.data?.length || 0} ETFs`);
      } catch (error) {
        console.error('Error fetching ETFs:', error);
      } finally {
        setLoading(false);
        console.timeEnd('⏱️ Fetch ETF Data');
      }
    };
    fetchETFs();
  }, [selectedLeverage, selectedIssuer, sortKey, sortDirection]);

  // Filter and paginate data
  useEffect(() => {
    console.time('  ⏱️ Filter and paginate data');
    
    // Filter data based on search term
    let filteredData = allEtfData;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredData = allEtfData.filter(etf =>
        etf.ticker.toLowerCase().includes(searchLower) ||
        etf.issuer.toLowerCase().includes(searchLower) ||
        (etf.etfIndex && etf.etfIndex.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredCount(filteredData.length);
    
    // Paginate filtered data
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    setEtfData(filteredData.slice(startIndex, endIndex));
    console.log(`📄 Page ${page}: Showing ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} of ${filteredData.length} filtered ETFs`);
    console.timeEnd('  ⏱️ Filter and paginate data');
  }, [allEtfData, page, rowsPerPage, searchTerm]);

  // Reset to first page when search term changes
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    // Track sorting in analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'sort_data', {
        sort_by: key,
        sort_order: sortDirection === 'asc' ? 'desc' : 'asc',
        event_category: 'engagement'
      });
    }
  };

  const formatNumber = (num: number | null, decimals: number = 2): string => {
    if (num === null || num === undefined) return '-';
    return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatAssets = (num: number): string => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPercent = (num: number | null): React.ReactElement => {
    if (num === null || num === undefined) return <span>-</span>;
    const color = num >= 0 ? 'text-green-600' : 'text-red-600';
    const sign = num >= 0 ? '+' : '';
    return <span className={color}>{sign}{num.toFixed(2)}%</span>;
  };

  const translations = {
    en: {
      title: 'Leveraged ETF Performance Tracker',
      description: 'Track performance of leveraged ETFs',
      overview: 'Leverage Overview',
      leverageType: 'Leverage Type',
      etfCount: 'ETF Count',
      totalAssets: 'Total Assets',
      avg1m: 'Avg 1M',
      avgYTD: 'Avg YTD',
      avg1y: 'Avg 1Y',
      allETFs: 'All Leveraged ETFs',
      ticker: 'Ticker',
      name: 'Name',
      issuer: 'Issuer',
      assets: 'Assets',
      price: 'Price',
      volume: 'Volume',
      expense: 'Expense',
      week1: '1 Week',
      month1: '1 Month',
      month6: '6 Month',
      ytd: 'YTD',
      year1: '1 Year',
      year3: '3 Year',
      high52: '52W High',
      low52: '52W Low',
      loading: 'Loading...',
      exportExcel: 'Export to Excel',
      exportCSV: 'Export to CSV',
    },
    zh: {
      title: '杠杆ETF表现追踪器',
      description: '实时追踪杠杆ETF表现数据',
      overview: '杠杆概览',
      leverageType: '杠杆类型',
      etfCount: 'ETF数量',
      totalAssets: '总资产',
      avg1m: '平均1月',
      avgYTD: '平均今年',
      avg1y: '平均1年',
      allETFs: '所有杠杆ETF',
      ticker: '代码',
      name: '名称',
      issuer: '发行商',
      assets: '资产',
      price: '价格',
      volume: '成交量',
      expense: '费率',
      week1: '1周',
      month1: '1月',
      month6: '6月',
      ytd: '今年',
      year1: '1年',
      year3: '3年',
      high52: '52周高',
      low52: '52周低',
      loading: '加载中...',
      exportExcel: '导出到Excel',
      exportCSV: '导出到CSV',
    },
  };

  const t = translations[language];

  const handleExport = (format: 'excel' | 'csv') => {
    // Track export event in Google Analytics and Vercel
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'export_data', {
        export_format: format,
        event_category: 'engagement',
        event_label: `${format} export`
      });
    }

    const dataToExport = allEtfData;

    if (format === 'csv') {
      // Create CSV content
      const headers = [
        'Ticker',
        'Leverage Type',
        'Issuer',
        'Assets',
        'Asset Class',
        'Expense Ratio',
        'Price',
        'Volume',
        '1 Week',
        '1 Month',
        '6 Month',
        'YTD',
        '1 Year',
        '3 Year',
        '5 Year',
        '10 Year',
        '52W High',
        '52W Low',
        'All Time High',
        'ATH Change',
        'ATH Date',
        'All Time Low',
        'ATL Change',
        'ATL Date'
      ];

      const csvContent = [
        headers.join(','),
        ...dataToExport.map(etf => [
          etf.ticker,
          etf.etfLeverage,
          etf.issuer,
          etf.assets,
          etf.assetClass || '',
          etf.expenseRatio || '',
          etf.close || '',
          etf.volume || '',
          etf.ch1w || '',
          etf.ch1m || '',
          etf.ch6m || '',
          etf.chYTD || '',
          etf.ch1y || '',
          etf.ch3y || '',
          etf.ch5y || '',
          etf.ch10y || '',
          etf.high52 || '',
          etf.low52 || '',
          etf.allTimeHigh || '',
          etf.allTimeHighChange || '',
          etf.allTimeHighDate || '',
          etf.allTimeLow || '',
          etf.allTimeLowChange || '',
          etf.allTimeLowDate || ''
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leveraged-etfs-${new Date().toISOString().split('T')[0]}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      // For Excel, use the xlsx library to create proper Excel file
      const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(etf => ({
            'Ticker': etf.ticker,
            'Leverage Type': etf.etfLeverage,
            'Issuer': etf.issuer,
            'Assets': etf.assets,
            'Asset Class': etf.assetClass || '',
            'Expense Ratio': etf.expenseRatio || '',
            'Price': etf.close || '',
            'Volume': etf.volume || '',
            '1 Week': etf.ch1w || '',
            '1 Month': etf.ch1m || '',
            '6 Month': etf.ch6m || '',
            'YTD': etf.chYTD || '',
            '1 Year': etf.ch1y || '',
            '3 Year': etf.ch3y || '',
            '5 Year': etf.ch5y || '',
            '10 Year': etf.ch10y || '',
            '52W High': etf.high52 || '',
            '52W Low': etf.low52 || '',
            'All Time High': etf.allTimeHigh || '',
            'ATH Change': etf.allTimeHighChange || '',
            'ATH Date': etf.allTimeHighDate || '',
            'All Time Low': etf.allTimeLow || '',
            'ATL Change': etf.allTimeLowChange || '',
            'ATL Date': etf.allTimeLowDate || ''
          })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Leveraged ETFs');
      XLSX.writeFile(workbook, `leveraged-etfs-${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  // Fetch delisted, new launch, and gainers/losers data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [delistedRes, newLaunchRes, gainersLosersRes] = await Promise.all([
          fetch('/api/delisted-etfs'),
          fetch('/api/new-launch-etfs'),
          fetch('/api/etf-gainers-losers')
        ]);

        if (delistedRes.ok) {
          const data = await delistedRes.json();
          setDelistedETFs(data.delistedETFs || []);
        }

        if (newLaunchRes.ok) {
          const data = await newLaunchRes.json();
          setNewLaunchETFs(data.newLaunchETFs || []);
        }

        if (gainersLosersRes.ok) {
          const data = await gainersLosersRes.json();
          setGainersLosers(data);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    };

    fetchMarketData();
  }, []);

  return (
    <>
      <Head>
        <title>{language === 'en' ? 'Leveraged ETF Performance Tracker | Leveraged ETF Tracker' : '杠杆ETF表现追踪器 | Leveraged ETF Tracker'}</title>
        <meta name="description" content={language === 'en' ? 'Track leveraged ETF performance, compare fees, and analyze 2X and 3X leverage funds. Real-time data and export to Excel.' : '追踪杠杆ETF表现，比较费用，分析2倍和3倍杠杆基金。实时数据和导出Excel。'} />
        <meta name="keywords" content={language === 'en' ? 'leveraged ETF, 3X ETF, 2X ETF, Direxion, ProShares, ETF tracker, investment performance, stock performance' : '杠杆ETF，3倍ETF，2倍ETF，Direxion，ProShares，ETF追踪，投资表现，股票表现'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content={t.title} />
        <meta property="og:description" content={language === 'en' ? 'Track and analyze leveraged ETF performance data' : '追踪和分析杠杆ETF表现数据'} />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://www.qdiiquota.pro" />
      </Head>

      <Navigation language={language} onLanguageChange={setLanguage} />

      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.description}</p>
            {dataUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                {language === 'en' ? 'Data updated: ' : '数据更新时间：'}
                {new Date(dataUpdated).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
          </div>
          {/* Gainers and Losers Section */}
        {gainersLosers && (
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{language === 'en' ? 'ETF Gainers & Losers' : 'ETF涨跌榜'}</h2>
            <div className="mb-4 flex gap-2 flex-wrap">
              {(['ch1w', 'ch1m', 'ch6m', 'ch1y', 'ch3y', 'ch5y', 'ch10y', 'chYTD'] as const).map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedGainersLosersPeriod(period)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    selectedGainersLosersPeriode === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {period === 'ch1w' && (language === 'en' ? '1W' : '1周')}
                  {period === 'ch1m' && (language === 'en' ? '1M' : '1月')}
                  {period === 'ch6m' && (language === 'en' ? '6M' : '6月')}
                  {period === 'ch1y' && (language === 'en' ? '1Y' : '1年')}
                  {period === 'ch3y' && (language === 'en' ? '3Y' : '3年')}
                  {period === 'ch5y' && (language === 'en' ? '5Y' : '5年')}
                  {period === 'ch10y' && (language === 'en' ? '10Y' : '10年')}
                  {period === 'chYTD' && (language === 'en' ? 'YTD' : '年初至今')}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Gainers */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-green-600 mb-4">{language === 'en' ? 'Top Gainers' : '涨幅最大'}</h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Ticker' : '代码'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'Return' : '涨幅'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'AUM' : '规模'}</th>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Leverage' : '杠杆类型'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'Index' : '指数'}</th>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Issuer' : '发行商'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gainersLosers.gainers[selectedGainersLosersPeriode]?.slice(0, 10).map((etf: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-green-50">
                          <td className="py-2 px-2 font-medium text-green-600">
                            <a
                              href={`https://stockanalysis.com/etf/${etf.ticker.toLowerCase()}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {etf.ticker}
                            </a>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-green-600">+{etf.return.toFixed(2)}%</td>
                          <td className="py-2 px-2 text-right font-semibold text-green-600">{formatAssets(etf.aum)}</td>
                          <td className="py-2 px-2 text-sm text-gray-700">{etf.etfLeverage}</td>
                          <td className="py-2 px-2 text-right text-sm text-gray-700">{etf.etfIndex}</td>
                          <td className="py-2 px-2 text-sm">{etf.issuer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Top Losers */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">{language === 'en' ? 'Top Losers' : '跌幅最大'}</h3>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Ticker' : '代码'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'Return' : '跌幅'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'AUM' : '规模'}</th>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Leverage' : '杠杆类型'}</th>
                        <th className="text-right py-2 px-2">{language === 'en' ? 'Index' : '指数'}</th>
                        <th className="text-left py-2 px-2">{language === 'en' ? 'Issuer' : '发行商'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gainersLosers.losers[selectedGainersLosersPeriode]?.slice(0, 10).map((etf: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-red-50">
                          <td className="py-2 px-2 font-medium text-red-600">
                            <a
                              href={`https://stockanalysis.com/etf/${etf.ticker.toLowerCase()}/`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              {etf.ticker}
                            </a>
                          </td>
                          <td className="py-2 px-2 text-right font-semibold text-red-600">{etf.return.toFixed(2)}%</td>
                          <td className="py-2 px-2 text-right text-gray-700">{formatAssets(etf.aum)}</td>
                          <td className="py-2 px-2 text-sm text-gray-700">{etf.etfLeverage}</td>
                          <td className="py-2 px-2 text-right text-sm text-gray-700">{etf.etfIndex}</td>
                          <td className="py-2 px-2 text-sm">{etf.issuer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
        )}


          {/* Leverage Overview Cards */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">{t.overview}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {summaryData.map((summary) => (
               <button
                  key={summary.leverageType}
                  onClick={() => {
                    setSelectedLeverage(summary.leverageType);
                    // Track leverage type selection
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'filter_by_leverage', {
                        leverage_type: summary.leverageType,
                        event_category: 'engagement'
                      });
                    }
                  }}
                  className={`p-3 rounded-lg shadow hover:shadow-md transition-all duration-200 text-left ${
                    selectedLeverage === summary.leverageType
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <h3 className={`text-sm font-bold mb-1.5 ${
                    selectedLeverage === summary.leverageType ? 'text-white' : 'text-gray-900'
                  }`}>
                    {summary.leverageType}
                  </h3>
                  <div className="space-y-0.5">
                    <p className={`text-xs ${
                      selectedLeverage === summary.leverageType ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      <span className="font-semibold">{summary.count}</span> ETFs
                    </p>
                    <p className={`text-xs ${
                      selectedLeverage === summary.leverageType ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      <span className="font-semibold">{formatAssets(summary.totalAssets)}</span>
                    </p>
                    {summary.avgCh1m !== null && (
                      <p className={`text-xs ${
                        selectedLeverage === summary.leverageType ? 'text-blue-100' : 'text-gray-600'
                      }`}>
                        <span className={`font-semibold ${
                          selectedLeverage === summary.leverageType
                            ? ''
                            : summary.avgCh1m >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {summary.avgCh1m >= 0 ? '+' : ''}{summary.avgCh1m.toFixed(1)}%
                        </span>
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Filters and Export Buttons */}
          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              {selectedLeverage !== 'all' && (
                <button
                  onClick={() => setSelectedLeverage('all')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  {t.allETFs}
                </button>
              )}

              {/* Issuer Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">
                  {language === 'en' ? 'Issuer:' : '发行商:'}
                </label>
                <select
                  value={selectedIssuer}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSelectedIssuer(newValue);
                    // Track issuer filter change
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'filter_by_issuer', {
                        issuer: newValue,
                        event_category: 'engagement'
                      });
                    }
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{language === 'en' ? 'All Issuers' : '所有发行商'}</option>
                  {issuers.map((issuer) => (
                    <option key={issuer} value={issuer}>
                      {issuer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prominent Issuer Quick Filter Buttons */}
              {prominentIssuers.map((issuer) => (
                <button
                  key={issuer}
                  onClick={() => {
                    setSelectedIssuer(issuer);
                    // Track issuer quick filter click
                    if (typeof window !== 'undefined' && (window as any).gtag) {
                      (window as any).gtag('event', 'quick_filter_issuer', {
                        issuer: issuer,
                        event_category: 'engagement'
                      });
                    }
                  }}
                  className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    selectedIssuer === issuer
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {issuer}
                </button>
              ))}

              {selectedIssuer !== 'all' && (
                <button
                  onClick={() => setSelectedIssuer('all')}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {language === 'en' ? 'Clear filter' : '清除筛选'}
                </button>
              )}
            </div>

          </div>

<div className="mb-4">
  <div className="flex flex-wrap items-center gap-4">
    {/* Search Input */}
    <div className="relative flex-1 min-w-0 max-w-md ">
      <input
        type="text"
        placeholder={language === 'en' ? 'Search ticker, issuer, index...' : '搜索代码、发行商、指数...'}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        value={searchTerm}
        onChange={(e) => {
          const newValue = e.target.value;
          setSearchTerm(newValue);
          // Track search analytics
          if (newValue.trim().length > 0) {
            if (typeof window !== 'undefined' && (window as any).gtag) {
              (window as any).gtag('event', 'search_etf', {
                search_term: newValue,
                search_length: newValue.length,
                event_category: 'engagement'
              });
            }
          }
        }}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
    </div>

<div className="flex-1" />

    {/* Export Buttons */}
    <div className="flex gap-3 ">
      <button
        onClick={() => handleExport('excel')}
        className="px-5 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md whitespace-nowrap"
      >
        {t.exportExcel}
      </button>
      <button
        onClick={() => handleExport('csv')}
        className="px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md whitespace-nowrap"
      >
        {t.exportCSV}
      </button>
    </div>
  </div>
</div>

            {/* ETF Table Header with Export Buttons */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* Top Scrollbar */}
            <div
              ref={topScrollRef}
              className="overflow-x-auto border-b border-gray-200"
              style={{ overflowY: 'hidden', height: '17px' }}
            >
              <div style={{ height: '1px', width: '2400px' }}></div>
            </div>

            <TableContainer
              ref={tableScrollRef}
              component={Paper}
              sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}
            >
              <Table stickyHeader sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #e5e7eb' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1100,
                      backgroundColor: '#f9fafb',
                      boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
                    }}>
                      <TableSortLabel
                        active={sortKey === 'ticker'}
                        direction={sortKey === 'ticker' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ticker')}
                      >
                        <span className="font-semibold">{t.ticker}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortKey === 'etfLeverage'}
                        direction={sortKey === 'etfLeverage' ? sortDirection : 'asc'}
                        onClick={() => handleSort('etfLeverage')}
                      >
                        <span className="font-semibold">{t.leverageType}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortKey === 'issuer'}
                        direction={sortKey === 'issuer' ? sortDirection : 'asc'}
                        onClick={() => handleSort('issuer')}
                      >
                        <span className="font-semibold">{t.issuer}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortKey === 'etfIndex'}
                        direction={sortKey === 'etfIndex' ? sortDirection : 'asc'}
                        onClick={() => handleSort('etfIndex')}
                      >
                        <span className="font-semibold">{language === 'en' ? 'Index' : '指数'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'assets'}
                        direction={sortKey === 'assets' ? sortDirection : 'asc'}
                        onClick={() => handleSort('assets')}
                      >
                        <span className="font-semibold">{t.assets}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell><span className="font-semibold">{language === 'en' ? 'Asset Class' : '资产类别'}</span></TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'expenseRatio'}
                        direction={sortKey === 'expenseRatio' ? sortDirection : 'asc'}
                        onClick={() => handleSort('expenseRatio')}
                      >
                        <span className="font-semibold">{t.expense}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'close'}
                        direction={sortKey === 'close' ? sortDirection : 'asc'}
                        onClick={() => handleSort('close')}
                      >
                        <span className="font-semibold">{t.price}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'volume'}
                        direction={sortKey === 'volume' ? sortDirection : 'asc'}
                        onClick={() => handleSort('volume')}
                      >
                        <span className="font-semibold">{t.volume}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch1w'}
                        direction={sortKey === 'ch1w' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch1w')}
                      >
                        <span className="font-semibold">{t.week1}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch1m'}
                        direction={sortKey === 'ch1m' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch1m')}
                      >
                        <span className="font-semibold">{t.month1}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch6m'}
                        direction={sortKey === 'ch6m' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch6m')}
                      >
                        <span className="font-semibold">{t.month6}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'chYTD'}
                        direction={sortKey === 'chYTD' ? sortDirection : 'asc'}
                        onClick={() => handleSort('chYTD')}
                      >
                        <span className="font-semibold">{t.ytd}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch1y'}
                        direction={sortKey === 'ch1y' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch1y')}
                      >
                        <span className="font-semibold">{t.year1}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch3y'}
                        direction={sortKey === 'ch3y' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch3y')}
                      >
                        <span className="font-semibold">{t.year3}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch5y'}
                        direction={sortKey === 'ch5y' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch5y')}
                      >
                        <span className="font-semibold">{language === 'en' ? '5 Year' : '5年'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'ch10y'}
                        direction={sortKey === 'ch10y' ? sortDirection : 'asc'}
                        onClick={() => handleSort('ch10y')}
                      >
                        <span className="font-semibold">{language === 'en' ? '10 Year' : '10年'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'high52'}
                        direction={sortKey === 'high52' ? sortDirection : 'asc'}
                        onClick={() => handleSort('high52')}
                      >
                        <span className="font-semibold">{t.high52}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'low52'}
                        direction={sortKey === 'low52' ? sortDirection : 'asc'}
                        onClick={() => handleSort('low52')}
                      >
                        <span className="font-semibold">{t.low52}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'allTimeHigh'}
                        direction={sortKey === 'allTimeHigh' ? sortDirection : 'asc'}
                        onClick={() => handleSort('allTimeHigh')}
                      >
                        <span className="font-semibold">{language === 'en' ? 'ATH' : '历史最高'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'allTimeHighChange'}
                        direction={sortKey === 'allTimeHighChange' ? sortDirection : 'asc'}
                        onClick={() => handleSort('allTimeHighChange')}
                      >
                        <span className="font-semibold">{language === 'en' ? 'ATH Change' : 'ATH变化'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell><span className="font-semibold">{language === 'en' ? 'ATH Date' : 'ATH日期'}</span></TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'allTimeLow'}
                        direction={sortKey === 'allTimeLow' ? sortDirection : 'asc'}
                        onClick={() => handleSort('allTimeLow')}
                      >
                        <span className="font-semibold">{language === 'en' ? 'ATL' : '历史最低'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <TableSortLabel
                        active={sortKey === 'allTimeLowChange'}
                        direction={sortKey === 'allTimeLowChange' ? sortDirection : 'asc'}
                        onClick={() => handleSort('allTimeLowChange')}
                      >
                        <span className="font-semibold">{language === 'en' ? 'ATL Change' : 'ATL变化'}</span>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell><span className="font-semibold">{language === 'en' ? 'ATL Date' : 'ATL日期'}</span></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={23} align="center" className="py-12">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                          <span className="ml-4 text-gray-600">{t.loading}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : etfData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={23} align="center" className="py-12 text-gray-500">
                        No ETF data available
                      </TableCell>
                    </TableRow>
                  ) : (
                    etfData.map((etf) => (
                      <TableRow
                        key={etf.ticker}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <TableCell sx={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 100,
                          backgroundColor: 'white',
                          boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                          '&:hover': { backgroundColor: '#f9fafb' }
                        }}>
                          <a
                            href={`https://stockanalysis.com/etf/${etf.ticker.toLowerCase()}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:underline"
                          >
                            {etf.ticker}
                          </a>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            etf.etfLeverage.includes('-')
                              ? 'bg-red-100 text-red-800'
                              : etf.etfLeverage.includes('3X')
                              ? 'bg-purple-100 text-purple-800'
                              : etf.etfLeverage.includes('2X')
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {etf.etfLeverage}
                          </span>
                        </TableCell>
                        <TableCell>{etf.issuer}</TableCell>
                        <TableCell>{etf.etfIndex || '-'}</TableCell>
                        <TableCell align="right">{formatAssets(etf.assets)}</TableCell>
                        <TableCell>{etf.assetClass || '-'}</TableCell>
                        <TableCell align="right">{etf.expenseRatio ? `${etf.expenseRatio}%` : '-'}</TableCell>
                        <TableCell align="right">${formatNumber(etf.close)}</TableCell>
                        <TableCell align="right">{etf.volume ? etf.volume.toLocaleString() : '-'}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch1w)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch1m)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch6m)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.chYTD)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch1y)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch3y)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch5y)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.ch10y)}</TableCell>
                        <TableCell align="right">${formatNumber(etf.high52)}</TableCell>
                        <TableCell align="right">${formatNumber(etf.low52)}</TableCell>
                        <TableCell align="right">${formatNumber(etf.allTimeHigh)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.allTimeHighChange)}</TableCell>
                        <TableCell>{etf.allTimeHighDate || '-'}</TableCell>
                        <TableCell align="right">${formatNumber(etf.allTimeLow)}</TableCell>
                        <TableCell align="right">{formatPercent(etf.allTimeLowChange)}</TableCell>
                        <TableCell>{etf.allTimeLowDate || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </div>


          {/* Pagination and Results */}
          {!loading && allEtfData.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  {language === 'en'
                    ? `Showing ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filteredCount)} of ${filteredCount} ETFs`
                    : `显示第 ${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, filteredCount)} 条，共 ${filteredCount} 个ETF`
                  }
                </div>
                {selectedLeverage === 'all' && selectedIssuer === 'all' && allEtfData.length >= 200 && !searchTerm && (
                  <div className="text-xs text-gray-500 mt-1">
                    {language === 'en'
                      ? 'Showing top 200 by assets. Select a leverage type to see more.'
                      : '显示按资产排名前200个。选择杠杆类型以查看更多。'
                    }
                  </div>
                )}
              </div>
              <Pagination
                count={Math.ceil(filteredCount / rowsPerPage)}
                page={page}
                onChange={(event, value) => setPage(value)}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </div>
          )}
        </div>
      </main>

      {/* Market Data Sections - Delisted, New Launch, Gainers/Losers */}
      <main className="container mx-auto px-4 py-12 bg-gradient-to-b from-white to-gray-50">
        {/* Delisted ETFs Section */}
        {delistedETFs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{language === 'en' ? 'Recently Delisted ETFs' : '最近退市的ETF'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{language === 'en' ? 'Delisted ETFs Count' : '退市ETF数量'}</h3>
                <div className="flex items-center justify-center h-80">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-red-600">{delistedETFs.length}</div>
                    <p className="text-gray-600 mt-2">{language === 'en' ? 'ETFs delisted' : '个ETF已退市'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{language === 'en' ? 'Top Delisted ETFs by AUM' : '按AUM排名的顶级退市ETF'}</h3>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Ticker' : '代码'}</th>
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Issuer' : '发行商'}</th>
                      <th className="text-right py-2 px-2">{language === 'en' ? 'AUM (B)' : 'AUM (十亿)'}</th>
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Expense' : '费率'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {delistedETFs.slice(0, 10).map((etf, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-red-600">
                          <a
                            href={`https://stockanalysis.com/etf/${etf.ticker.toLowerCase()}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {etf.ticker}
                          </a>
                        </td>
                        <td className="py-2 px-2">{etf.issuer}</td>
                        <td className="py-2 px-2 text-right">${(etf.aum / 1e9).toFixed(2)}</td>
                        <td className="py-2 px-2">{etf.expenseRatio?.toFixed(3)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* New Launch ETFs Section */}
        {newLaunchETFs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{language === 'en' ? 'Newly Launched ' : '新推出的ETF（过去10天）'}{newLaunchETFs.length} ETFs(Last 10 Days)</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 overflow-x-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{language === 'en' ? 'Newest Launches' : '最新推出'}</h3>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Ticker' : '代码'}</th>
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Date' : '日期'}</th>
                      <th className="text-right py-2 px-2">{language === 'en' ? 'AUM (B)' : 'AUM (十亿)'}</th>
                      <th className="text-left py-2 px-2">{language === 'en' ? 'Issuer' : '发行商'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {newLaunchETFs.slice(0, 20).map((etf, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 font-medium text-green-600">
                          <a
                            href={`https://stockanalysis.com/etf/${etf.ticker.toLowerCase()}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {etf.ticker}
                          </a>
                        </td>
                        <td className="py-2 px-2 text-sm">{new Date(etf.inceptionDate).toLocaleDateString()}</td>
                        <td className="py-2 px-2 text-right">${(etf.aum / 1e9).toFixed(2)}</td>
                        <td className="py-2 px-2">{etf.issuer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer language={language} />
      <Analytics />
    </>
  );
}
