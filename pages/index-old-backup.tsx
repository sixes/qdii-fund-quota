import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useForm } from '@formspree/react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import React from 'react';
import { Switch } from '@headlessui/react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TableSortLabel from '@mui/material/TableSortLabel';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import { useRouter } from 'next/router';
import Footer from '../components/Footer';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Home() {
  const router = useRouter();
  const [filters, setFilters] = useState({ fund_company: '', fund_name: '纳斯达克100ETF', fund_code: '', country: '' });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('quota');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [fundSortKey, setFundSortKey] = useState<string>('quota');
  const [fundSortDirection, setFundSortDirection] = useState<'asc' | 'desc'>('desc');
  const [stockSortKey, setStockSortKey] = useState<string>('changeFromAthPercent');
  const [stockSortDirection, setStockSortDirection] = useState<'asc' | 'desc'>('asc');
  const [fundCompanies, setFundCompanies] = useState<string[]>([]);
  const [state, handleSubmit] = useForm("xyzdlpln");
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'index' | 'funds' | 'stocks'>('funds');
  
  // Set default language to EN on mount
  useEffect(() => {
    // Check if language parameter is in URL
    const langFromUrl = router.query.lang as string;
    if (langFromUrl === 'zh') {
      setLanguage('zh');
      setActiveTab('funds'); // Default to funds for Chinese version
    } else {
      setLanguage('en');
      setActiveTab('index');
    }
    setActiveIndex('nasdaq100');
  }, [router.query.lang]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockMarket, setStockMarket] = useState<'US' | 'HK'>('US');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);
  const [activeIndex, setActiveIndex] = useState<'nasdaq100' | 'sp500' | 'dow'>('nasdaq100');
  const [indexData, setIndexData] = useState<any[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexSortKey, setIndexSortKey] = useState<string>('no');
  const [indexSortDirection, setIndexSortDirection] = useState<'asc' | 'desc'>('asc');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [openMenu, setOpenMenu] = useState<null | 'nasdaq100' | 'sp500' | 'dow'>(null);
  
  // Index chart data states
  const [nasdaq100ChartData, setNasdaq100ChartData] = useState<any>(null);
  const [sp500ChartData, setSp500ChartData] = useState<any>(null);
  const [dowChartData, setDowChartData] = useState<any>(null);
  const [chartsLoading, setChartsLoading] = useState(false);
  
  // ETF chart data states
  const [qqqChartData, setQqqChartData] = useState<any>(null);
  const [spyChartData, setSpyChartData] = useState<any>(null);
  const [diaChartData, setDiaChartData] = useState<any>(null);
  
  // 2x Leveraged ETF chart data states
  const [qldChartData, setQldChartData] = useState<any>(null);
  const [ssoChartData, setSsoChartData] = useState<any>(null);
  const [ddmChartData, setDdmChartData] = useState<any>(null);
  
  // 3x Leveraged ETF chart data states
  const [tqqqChartData, setTqqqChartData] = useState<any>(null);
  const [uproChartData, setUproChartData] = useState<any>(null);
  const [udowChartData, setUdowChartData] = useState<any>(null);
  
  // -1x Inverse ETF chart data states
  const [psqChartData, setPsqChartData] = useState<any>(null);
  const [shChartData, setShChartData] = useState<any>(null);
  const [dogChartData, setDogChartData] = useState<any>(null);
  
  // -2x Inverse Leveraged ETF chart data states
  const [qidChartData, setQidChartData] = useState<any>(null);
  const [sdsChartData, setSdsChartData] = useState<any>(null);
  const [dowChartData2, setDowChartData2] = useState<any>(null);
  
  // -3x Inverse Leveraged ETF chart data states
  const [sqqqChartData, setSqqqChartData] = useState<any>(null);
  const [spxuChartData, setSpxuChartData] = useState<any>(null);
  const [sdowChartData, setSdowChartData] = useState<any>(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const companyList = ["易方达", "长城", "景顺长城", "华泰证券", "国海富兰克林", "鹏华", "中银", "博时", "嘉实", "华夏", "汇添富", "天弘", "工银瑞信", "摩根", "大成", "国泰", "建信", "宝盈", "华泰柏瑞", "南方", "万家", "广发", "华安", "华宝", "招商", "海富通"].sort((a, b) => a.charAt(0).localeCompare(b.charAt(0), 'zh'));

  // Language support
  const t = {
    en: {
      title: "US Index Constituents",
      description: "View constituents of major US stock indices",
      indexConstituents: "Index Constituents",
      qdii: "QDII Funds",
      mega7: "Mega 7+ Stocks",
      loading: "Loading...",
      noData: "No data available",
      no: "No.",
      symbol: "Symbol",
      companyName: "Company Name",
      weight: "Weight %",
      price: "Price",
      change: "Change %",
      marketCap: "Market Cap",
      athPrice: "ATH Price",
      peRatio: "P/E Ratio",
      epsTtm: "EPS TTM",
      psRatio: "P/S Ratio",
      pbRatio: "P/B Ratio",
      forwardPe: "Forward P/E",
      athDate: "ATH Date"
    },
    zh: {
      title: "QDII基金申购额度查询",
      description: "快速查询各QDII基金额度，支持多条件筛选",
      indexConstituents: "指数成分股",
      qdii: "基金额度",
      mega7: "Mega 7+ 股票",
      loading: "加载中...",
      noData: "暂无数据",
      no: "No.",
      symbol: "Symbol",
      companyName: "Company Name",
      weight: "Weight %",
      price: "Price",
      change: "Change %",
      marketCap: "Market Cap",
      athPrice: "ATH Price",
      peRatio: "P/E Ratio",
      epsTtm: "EPS TTM",
      psRatio: "P/S Ratio",
      pbRatio: "P/B Ratio",
      forwardPe: "Forward P/E",
      athDate: "ATH Date"
    }
  };

  useEffect(() => {
    console.log('🚀 Initial setup useEffect triggered');
    setFundCompanies(companyList);
    setIsInitialized(true);
    console.log('✅ Initial setup completed, isInitialized set to true');
  }, []);

  const fetchData = async (customFilters = filters) => {
    console.log('📊 fetchData called with:', { activeTab, customFilters, isInitialized });
    if (activeTab !== 'funds') {
      console.log('❌ fetchData skipped: not on funds tab');
      return;
    }
    console.log('🔄 Starting fetchData request...');
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(customFilters).forEach(([k, v]) => { if (v) params.append(k, v); });
    const res = await fetch('/api/quotas?' + params.toString());
    const fetchedData = await res.json();
    setData(sortData(fetchedData, fundSortKey, fundSortDirection));
    setLoading(false);
    console.log('✅ fetchData completed');
  };

  const sortData = (data: any[], key: string, direction: 'asc' | 'desc') => {
    if (!key) return data;
    return [...data].sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];
      if (activeTab === 'funds' && key === 'quota') {
        const aQuota = a.currency === 'USD' ? Number(a.quota) * 7 : Number(a.quota);
        const bQuota = b.currency === 'USD' ? Number(b.quota) * 7 : Number(b.quota);
        return direction === 'asc' ? aQuota - bQuota : bQuota - aQuota;
      }
      if (typeof aVal === 'string' && !isNaN(Number(aVal))) {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    if (activeTab === 'stocks') {
      setStockSortKey(key);
      setStockSortDirection(newDirection);
      setStockData(sortData(stockData, key, newDirection));
    } else if (activeTab === 'index') {
      setIndexSortKey(key);
      setIndexSortDirection(newDirection);
      setIndexData(sortData(indexData, key, newDirection));
    } else {
      setFundSortKey(key);
      setFundSortDirection(newDirection);
      setData(sortData(data, key, newDirection));
    }
    setSortKey(key);
    setSortDirection(newDirection);
  };

  const handleSearch = () => fetchData(filters);

  const resetFilters = () => {
    const clearedFilters = { fund_company: '', fund_name: '', fund_code: '', country: '' };
    setFilters(clearedFilters);
    fetchData(clearedFilters);
  };

  const openPdf = (pdfId: number) => {
    const url = `http://eid.csrc.gov.cn/fund/disclose/instance_html_view.do?instanceid=${pdfId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    if (!email.trim()) {
      const confirmed = window.confirm('您未提供邮箱，我们无法回复您的留言。确定要继续提交吗？');
      if (!confirmed) {
        e.preventDefault();
        return;
      }
    }
    handleSubmit(e);
  };

  const fetchIndexData = async (index = activeIndex) => {
    console.log('📊 fetchIndexData called with:', { activeTab, index, isInitialized });
    if (activeTab !== 'index') {
      console.log('❌ fetchIndexData skipped: not on index tab');
      return;
    }
    console.log('🔄 Starting fetchIndexData request...');
    setIndexLoading(true);
    
    const res = await fetch(`/api/index-constituents?index=${index}`);
    const fetchedIndexData = await res.json();
    console.log('📊 Fetched index data:', fetchedIndexData);
    
    let sortedIndexData: any[] = [];
    if (Array.isArray(fetchedIndexData)) {
      sortedIndexData = sortData(fetchedIndexData, indexSortKey, indexSortDirection);
    } else {
      sortedIndexData = [];
    }
    setIndexData(sortedIndexData);
    setIndexLoading(false);
    console.log('✅ fetchIndexData completed');
  };

  const fetchStockData = async () => {
    console.log('📈 fetchStockData called with:', { activeTab, selectedDate, stockMarket, isInitialized });
    if (activeTab !== 'stocks') {
      console.log('❌ fetchStockData skipped: not on stocks tab');
      return;
    }
    console.log('🔄 Starting fetchStockData request...');
    setStockLoading(true); // Re-added to indicate loading state
    console.log('🕒 Original selectedDate:', selectedDate);

    // Simplify date formatting using toLocaleDateString
    const formattedDate = selectedDate.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD

    console.log('📅 Formatted date for API:', formattedDate);
    const res = await fetch(`/api/stocks?date=${formattedDate}`);
    const fetchedStockData = await res.json();
    console.log('📊 Fetched stock data:', fetchedStockData);
    let sortedStockData: any[] = [];
    if (Array.isArray(fetchedStockData)) {
      sortedStockData = sortData(fetchedStockData, stockSortKey, stockSortDirection);
    } else {
      sortedStockData = [];
    }
    setStockData(sortedStockData);
    setStockLoading(false);
    console.log('✅ fetchStockData completed');
  };

  const minDate = new Date('2025-09-12');
  const maxDate = new Date();

  const filteredStockData = stockData.filter(stock => stockMarket === 'US' ? stock.market === 'US' : stock.market === 'HK');

  const datePickerRef = useRef<DatePicker>(null);

  const DatePickerCustomInput = React.forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
    <div className="flex items-center justify-end w-full bg-transparent cursor-pointer" onClick={onClick} ref={ref}>
      <span className="mr-1">📅</span>
      <span className="text-right w-full">{value}</span>
    </div>
  ));

  const [fundsPage, setFundsPage] = useState(1);
  const [stocksPage, setStocksPage] = useState(1);
  const [indexPage, setIndexPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => { setFundsPage(1); }, [filters, activeTab]);
  useEffect(() => { setStocksPage(1); }, [selectedDate, stockMarket, activeTab]);
  useEffect(() => { setIndexPage(1); }, [activeIndex, activeTab, indexData.length]);

  const pagedFunds = data;
  const pagedStocks = filteredStockData.slice((stocksPage-1)*ITEMS_PER_PAGE, stocksPage*ITEMS_PER_PAGE);
  const pagedIndexData = indexData.slice((indexPage-1)*ITEMS_PER_PAGE, indexPage*ITEMS_PER_PAGE);
  const fundsTotalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const stocksTotalPages = Math.ceil(filteredStockData.length / ITEMS_PER_PAGE);
  const indexTotalPages = Math.ceil(indexData.length / ITEMS_PER_PAGE);

  function getPageNumbers(current: number, total: number) {
    if (total <= 4) return Array.from({length: total}, (_,i) => i+1);
    if (current <= 2) return [1,2,3,4];
    if (current >= total-1) return [total-3, total-2, total-1, total];
    return [current-1, current, current+1, current+2];
  }

  // Initial data load and tab switching
  useEffect(() => {
    console.log('🎯 Tab switching useEffect triggered:', { activeTab, isInitialized, hasLoadedInitialData });
    if (!isInitialized) {
      console.log('⏳ Skipping: not initialized yet');
      return;
    }
    
    if (activeTab === 'index') {
      console.log('📊 Switching to index tab');
      setSortKey(indexSortKey);
      setSortDirection(indexSortDirection);
      fetchIndexData(activeIndex);
      setHasLoadedInitialData(true);
    } else if (activeTab === 'funds') {
      console.log('💰 Switching to funds tab');
      setSortKey(fundSortKey);
      setSortDirection(fundSortDirection);
      fetchData(filters);
      setHasLoadedInitialData(true);
    } else if (activeTab === 'stocks') {
      console.log('📈 Switching to stocks tab');
      setSortKey(stockSortKey);
      setSortDirection(stockSortDirection);
      fetchStockData();
      setHasLoadedInitialData(true);
    }
  }, [activeTab, isInitialized]);

  // Filter changes for funds only (skip if not initialized, not on funds tab, or initial load)
  useEffect(() => {
    console.log('🔍 Filters useEffect triggered:', { filters, isInitialized, activeTab, hasLoadedInitialData });
    if (!isInitialized || activeTab !== 'funds' || !hasLoadedInitialData) {
      console.log('⏳ Skipping filters useEffect: not ready, not on funds tab, or initial load');
      return;
    }
    console.log('🔍 Fetching data due to filter change');
    fetchData(filters);
  }, [filters, isInitialized]);

  // Stock parameters changes (skip if not initialized, not on stocks tab, or initial load)
  useEffect(() => {
    console.log('📊 Stock params useEffect triggered:', { selectedDate, stockMarket, isInitialized, activeTab, hasLoadedInitialData });
    if (!isInitialized || activeTab !== 'stocks' || !hasLoadedInitialData) {
      console.log('⏳ Skipping stock params useEffect: not ready, not on stocks tab, or initial load');
      return;
    }
    console.log('📊 Fetching stock data due to parameter change');
    fetchStockData();
  }, [selectedDate, stockMarket, isInitialized]);

  const handleDateChange = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  // Chart options generator for ETFs
  const getETFChartOptions = (label: string, previousClose: number) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y;
            const percentChangeValue = ((value - previousClose) / previousClose * 100);
            const percentChange = percentChangeValue.toFixed(2);
            return `${label}: $${value.toLocaleString()} (${percentChangeValue > 0 ? '+' : ''}${percentChange}%)`;
          }
        }
      }
    },
    scales: {
      x: { display: false },
      y: { 
        position: 'left' as const,
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          }
        }
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        grid: { display: false },
        // Link Y1 axis to Y axis so they share the same scale
        afterDataLimits: function(axis: any) {
          const chart = axis.chart;
          const yAxis = chart.scales.y;
          // Set Y1 min/max to match Y axis
          axis.min = yAxis.min;
          axis.max = yAxis.max;
        },
        ticks: {
          callback: function(tickValue: any) {
            // tickValue is the Y-axis price value at this tick position
            const percentChange = ((tickValue - previousClose) / previousClose * 100).toFixed(1);
            return percentChange + '%';
          }
        }
      }
    }
  });

  // Helper function to render ETF data display
  const renderETFDataDisplay = (chartData: any, label: string) => {
    if (!chartData || !chartData.datasets[0].data.length) return null;
    const data = chartData.datasets[0].data;
    const latestValue = data[data.length - 1]; // Last minute value
    const previousClose = chartData.datasets[0].firstValue; // Previous day's closing price
    const percentChange = ((latestValue - previousClose) / previousClose * 100);
    
    return (
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          Latest: <span className="font-semibold">${latestValue.toFixed(2)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Day Change: <span className={`font-semibold ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
          </span>
        </p>
        <p className="text-xs text-gray-500">
          Prev Close: ${previousClose.toFixed(2)}
        </p>
      </div>
    );
  };

  // Fetch index chart data using API route
  useEffect(() => {
    if (language === 'en') {
      const fetchIndexCharts = async () => {
        setChartsLoading(true);
        try {
          // Fetch intraday data (1 day period with minute intervals) for all indices, ETFs, and leveraged ETFs
          const [nasdaq, sp500, dow, qqq, spy, dia, qld, sso, ddm, tqqq, upro, udow, psq, sh, dog, qid, sds, dxd, sqqq, spxu, sdow] = await Promise.all([
            fetch('/api/index-chart?symbol=^NDX&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=^GSPC&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=^DJI&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=QQQ&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SPY&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=DIA&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=QLD&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SSO&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=DDM&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=TQQQ&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=UPRO&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=UDOW&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=PSQ&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SH&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=DOG&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=QID&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SDS&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=DXD&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SQQQ&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SPXU&period=1d&interval=1m').then(r => r.json()),
            fetch('/api/index-chart?symbol=SDOW&period=1d&interval=1m').then(r => r.json())
          ]);
          
          console.log('🔥 RAW API RESPONSE FOR NASDAQ:', JSON.stringify(nasdaq, null, 2));

          // Helper function to filter to only last trading day
          const filterLastTradingDay = (dates: string[], prices: number[], previousClose?: number) => {
            if (!dates || !prices || dates.length === 0) return { dates: [], prices: [], previousClose };
            
            console.log('🔍 Raw dates sample (first 3):', dates.slice(0, 3));
            console.log('🔍 Raw dates sample (last 3):', dates.slice(-3));
            console.log('🔍 First date full string:', dates[0]);
            console.log('📊 Total data points received:', dates.length);
            console.log('📊 Previous close from API:', previousClose);
            
            // Parse dates as ISO timestamps and group by calendar date
            const dateCounts: { [key: string]: { count: number, indices: number[] } } = {};
            
            for (let i = 0; i < dates.length; i++) {
              const date = new Date(dates[i]);
              // Get just the date part (YYYY-MM-DD) for grouping
              const dateKey = date.toISOString().split('T')[0];
              if (!dateCounts[dateKey]) {
                dateCounts[dateKey] = { count: 0, indices: [] };
              }
              dateCounts[dateKey].count++;
              dateCounts[dateKey].indices.push(i);
            }
            
            // Find the date with the maximum count (most data points = most recent trading day)
            let maxCount = 0;
            let mostRecentDateKey = '';
            let mostRecentIndices: number[] = [];
            
            // Sort dates to get the most recent one with substantial data
            const sortedDates = Object.entries(dateCounts).sort((a, b) => b[0].localeCompare(a[0]));
            
            for (const [dateKey, info] of sortedDates) {
              console.log(`📅 ${dateKey}: ${info.count} data points`);
              // Pick the most recent date with at least 50 data points (to avoid partial days)
              if (info.count > maxCount && info.count > 50) {
                maxCount = info.count;
                mostRecentDateKey = dateKey;
                mostRecentIndices = info.indices;
              }
            }
            
            // If no date has >50 points, just pick the one with most data
            if (maxCount === 0) {
              for (const [dateKey, info] of sortedDates) {
                if (info.count > maxCount) {
                  maxCount = info.count;
                  mostRecentDateKey = dateKey;
                  mostRecentIndices = info.indices;
                }
              }
            }
            
            console.log('🔍 Most recent trading day (with most data):', mostRecentDateKey, `(${maxCount} points)`);
            
            // Filter to only include data from the most recent trading day
            const filteredData: { dates: string[], prices: number[], previousClose?: number } = { 
              dates: [], 
              prices: [], 
              previousClose // Use the previousClose from Yahoo Finance API directly
            };
            
            // Sort indices by timestamp to ensure chronological order
            mostRecentIndices.sort((a, b) => {
              const dateA = new Date(dates[a]).getTime();
              const dateB = new Date(dates[b]).getTime();
              return dateA - dateB;
            });
            
            for (const idx of mostRecentIndices) {
              filteredData.dates.push(dates[idx]);
              filteredData.prices.push(prices[idx]);
            }
            
            console.log('✅ Filtered to', filteredData.dates.length, 'data points for', mostRecentDateKey);
            console.log('📈 First timestamp:', filteredData.dates[0]);
            console.log('📈 Last timestamp:', filteredData.dates[filteredData.dates.length - 1]);
            console.log('📈 Previous close:', previousClose?.toFixed(2));
            console.log('📈 Current price:', filteredData.prices[filteredData.prices.length - 1]?.toFixed(2));
            
            if (previousClose && filteredData.prices[filteredData.prices.length - 1]) {
              const dayChange = ((filteredData.prices[filteredData.prices.length - 1] - previousClose) / previousClose * 100).toFixed(2);
              console.log('📈 Day change from previous close:', dayChange + '%');
            }
            
            return filteredData;
          };

          // Process Nasdaq 100 - show only last trading day minute data
          if (nasdaq.dates && nasdaq.prices && nasdaq.prices.length > 0) {
            const filtered = filterLastTradingDay(nasdaq.dates, nasdaq.prices, nasdaq.previousClose);
            if (filtered.prices.length > 0) {
              setNasdaq100ChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'Nasdaq 100',
                  data: filtered.prices,
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }

          // Process S&P 500 - show only last trading day minute data
          if (sp500.dates && sp500.prices && sp500.prices.length > 0) {
            const filtered = filterLastTradingDay(sp500.dates, sp500.prices, sp500.previousClose);
            if (filtered.prices.length > 0) {
              setSp500ChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'S&P 500',
                  data: filtered.prices,
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }

          // Process Dow Jones - show only last trading day minute data
          if (dow.dates && dow.prices && dow.prices.length > 0) {
            const filtered = filterLastTradingDay(dow.dates, dow.prices, dow.previousClose);
            if (filtered.prices.length > 0) {
              setDowChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'Dow Jones',
                  data: filtered.prices,
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process QQQ ETF - show only last trading day minute data
          if (qqq.dates && qqq.prices && qqq.prices.length > 0) {
            const filtered = filterLastTradingDay(qqq.dates, qqq.prices, qqq.previousClose);
            if (filtered.prices.length > 0) {
              setQqqChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'QQQ ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(59, 130, 246)',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SPY ETF - show only last trading day minute data
          if (spy.dates && spy.prices && spy.prices.length > 0) {
            const filtered = filterLastTradingDay(spy.dates, spy.prices, spy.previousClose);
            if (filtered.prices.length > 0) {
              setSpyChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SPY ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(16, 185, 129)',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process DIA ETF - show only last trading day minute data
          if (dia.dates && dia.prices && dia.prices.length > 0) {
            const filtered = filterLastTradingDay(dia.dates, dia.prices, dia.previousClose);
            if (filtered.prices.length > 0) {
              setDiaChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'DIA ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(239, 68, 68)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process QLD 2x Leveraged ETF - show only last trading day minute data
          if (qld.dates && qld.prices && qld.prices.length > 0) {
            const filtered = filterLastTradingDay(qld.dates, qld.prices, qld.previousClose);
            if (filtered.prices.length > 0) {
              setQldChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'QLD 2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(99, 102, 241)',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SSO 2x Leveraged ETF - show only last trading day minute data
          if (sso.dates && sso.prices && sso.prices.length > 0) {
            const filtered = filterLastTradingDay(sso.dates, sso.prices, sso.previousClose);
            if (filtered.prices.length > 0) {
              setSsoChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SSO 2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(34, 197, 94)',
                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process DDM 2x Leveraged ETF - show only last trading day minute data
          if (ddm.dates && ddm.prices && ddm.prices.length > 0) {
            const filtered = filterLastTradingDay(ddm.dates, ddm.prices, ddm.previousClose);
            if (filtered.prices.length > 0) {
              setDdmChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'DDM 2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(249, 115, 22)',
                  backgroundColor: 'rgba(249, 115, 22, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process TQQQ 3x Leveraged ETF - show only last trading day minute data
          if (tqqq.dates && tqqq.prices && tqqq.prices.length > 0) {
            const filtered = filterLastTradingDay(tqqq.dates, tqqq.prices, tqqq.previousClose);
            if (filtered.prices.length > 0) {
              setTqqqChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'TQQQ 3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(147, 51, 234)',
                  backgroundColor: 'rgba(147, 51, 234, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process UPRO 3x Leveraged ETF - show only last trading day minute data
          if (upro.dates && upro.prices && upro.prices.length > 0) {
            const filtered = filterLastTradingDay(upro.dates, upro.prices, upro.previousClose);
            if (filtered.prices.length > 0) {
              setUproChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'UPRO 3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(5, 150, 105)',
                  backgroundColor: 'rgba(5, 150, 105, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process UDOW 3x Leveraged ETF - show only last trading day minute data
          if (udow.dates && udow.prices && udow.prices.length > 0) {
            const filtered = filterLastTradingDay(udow.dates, udow.prices, udow.previousClose);
            if (filtered.prices.length > 0) {
              setUdowChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'UDOW 3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(220, 38, 38)',
                  backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process PSQ -1x Inverse ETF - show only last trading day minute data
          if (psq.dates && psq.prices && psq.prices.length > 0) {
            const filtered = filterLastTradingDay(psq.dates, psq.prices, psq.previousClose);
            if (filtered.prices.length > 0) {
              setPsqChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'PSQ -1x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(168, 85, 247)',
                  backgroundColor: 'rgba(168, 85, 247, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SH -1x Inverse ETF - show only last trading day minute data
          if (sh.dates && sh.prices && sh.prices.length > 0) {
            const filtered = filterLastTradingDay(sh.dates, sh.prices, sh.previousClose);
            if (filtered.prices.length > 0) {
              setShChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SH -1x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(20, 184, 166)',
                  backgroundColor: 'rgba(20, 184, 166, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process DOG -1x Inverse ETF - show only last trading day minute data
          if (dog.dates && dog.prices && dog.prices.length > 0) {
            const filtered = filterLastTradingDay(dog.dates, dog.prices, dog.previousClose);
            if (filtered.prices.length > 0) {
              setDogChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'DOG -1x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(251, 113, 133)',
                  backgroundColor: 'rgba(251, 113, 133, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process QID -2x Inverse Leveraged ETF - show only last trading day minute data
          if (qid.dates && qid.prices && qid.prices.length > 0) {
            const filtered = filterLastTradingDay(qid.dates, qid.prices, qid.previousClose);
            if (filtered.prices.length > 0) {
              setQidChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'QID -2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(251, 146, 60)',
                  backgroundColor: 'rgba(251, 146, 60, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SDS -2x Inverse Leveraged ETF - show only last trading day minute data
          if (sds.dates && sds.prices && sds.prices.length > 0) {
            const filtered = filterLastTradingDay(sds.dates, sds.prices, sds.previousClose);
            if (filtered.prices.length > 0) {
              setSdsChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SDS -2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(234, 88, 12)',
                  backgroundColor: 'rgba(234, 88, 12, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process DOG -2x Inverse Leveraged ETF - show only last trading day minute data
          if (dxd.dates && dxd.prices && dxd.prices.length > 0) {
            const filtered = filterLastTradingDay(dxd.dates, dxd.prices, dxd.previousClose);
            if (filtered.prices.length > 0) {
              setDowChartData2({
                labels: filtered.dates,
                datasets: [{
                  label: 'DXD -2x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(217, 70, 70)',
                  backgroundColor: 'rgba(217, 70, 70, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SQQQ -3x Inverse Leveraged ETF - show only last trading day minute data
          if (sqqq.dates && sqqq.prices && sqqq.prices.length > 0) {
            const filtered = filterLastTradingDay(sqqq.dates, sqqq.prices, sqqq.previousClose);
            if (filtered.prices.length > 0) {
              setSqqqChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SQQQ -3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(124, 58, 237)',
                  backgroundColor: 'rgba(124, 58, 237, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SPXU -3x Inverse Leveraged ETF - show only last trading day minute data
          if (spxu.dates && spxu.prices && spxu.prices.length > 0) {
            const filtered = filterLastTradingDay(spxu.dates, spxu.prices, spxu.previousClose);
            if (filtered.prices.length > 0) {
              setSpxuChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SPXU -3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(194, 65, 12)',
                  backgroundColor: 'rgba(194, 65, 12, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
          
          // Process SDOW -3x Inverse Leveraged ETF - show only last trading day minute data
          if (sdow.dates && sdow.prices && sdow.prices.length > 0) {
            const filtered = filterLastTradingDay(sdow.dates, sdow.prices, sdow.previousClose);
            if (filtered.prices.length > 0) {
              setSdowChartData({
                labels: filtered.dates,
                datasets: [{
                  label: 'SDOW -3x ETF',
                  data: filtered.prices,
                  borderColor: 'rgb(185, 28, 28)',
                  backgroundColor: 'rgba(185, 28, 28, 0.1)',
                  fill: true,
                  tension: 0.4,
                  pointRadius: 0,
                  borderWidth: 2,
                  firstValue: filtered.previousClose || filtered.prices[0]
                }]
              });
            }
          }
        } catch (error) {
          console.error('Error fetching index chart data:', error);
        } finally {
          setChartsLoading(false);
        }
      };

      fetchIndexCharts();
    }
  }, [language]);

  return (
    <>
      <Head>
        <title>{language === 'en' ? t.en.title : t.zh.title}</title>
        <meta name="description" content={language === 'en' ? t.en.description : t.zh.description} />
        <meta name="keywords" content={language === 'en' ? "US stock indices, Nasdaq 100, S&P 500, Dow Jones, stock constituents" : "QDII基金, 申购额度查询, 纳指, 纳斯达克指数，标普, 纳指额度, 标普额度, 特斯拉, META， 苹果， 谷歌, MEGA， 亚马逊， 英伟达， 腾讯"} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Script src="https://www.googletagmanager.com/gtag/js?id=G-KYCK18CLKM" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-KYCK18CLKM');
        `}
      </Script>

      {language === 'en' ? (
        <div className="min-h-screen bg-gray-100 flex flex-col">
          <Navigation language={language} onLanguageChange={setLanguage} />
          <main className="flex-grow py-10">
            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">US Stock Market Indices</h1>
                <p className="text-gray-600 text-lg">Real-time overview of major US stock indices</p>
              </div>
              
              {/* View Mode Toggle and Mag7 Link */}
              <div className="mb-6 flex justify-between items-center gap-3">
                <Link href="/mag7" className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition">
                  View Magnificent 7 →
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">View:</span>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      viewMode === 'grid'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      viewMode === 'table'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>
              
              {viewMode === 'grid' ? (
                <>
              {/* Index Charts Grid */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Major Indices</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Nasdaq 100 */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Nasdaq 100</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : nasdaq100ChartData ? (
                      <Line 
                        data={nasdaq100ChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                label: function(context: any) {
                                  const label = context.dataset.label || '';
                                  const value = context.parsed.y;
                                  const previousClose = context.dataset.firstValue;
                                  const percentChangeValue = ((value - previousClose) / previousClose * 100);
                                  const percentChange = percentChangeValue.toFixed(2);
                                  return `${label}: ${value.toLocaleString()} (${percentChangeValue > 0 ? '+' : ''}${percentChange}%)`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { 
                              position: 'left',
                              ticks: {
                                callback: function(value) {
                                  return value.toLocaleString();
                                }
                              }
                            },
                            y1: {
                              type: 'linear' as const,
                              position: 'right',
                              grid: { display: false },
                              afterDataLimits: function(axis: any) {
                                const chart = axis.chart;
                                const yAxis = chart.scales.y;
                                axis.min = yAxis.min;
                                axis.max = yAxis.max;
                              },
                              ticks: {
                                callback: function(value: any) {
                                  const chart = (this as any).chart;
                                  const previousClose = chart.data.datasets[0].firstValue;
                                  const percentChange = ((value - previousClose) / previousClose * 100).toFixed(1);
                                  return percentChange + '%';
                                }
                              }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {nasdaq100ChartData && nasdaq100ChartData.datasets[0].data.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          Latest: <span className="font-semibold">{nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1].toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Day Change: <span className={`font-semibold ${((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Prev Close: {nasdaq100ChartData.datasets[0].firstValue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Link href="/nasdaq100" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                      View Details
                    </Link>
                  </div>
                </div>

                {/* S&P 500 */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">S&P 500</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : sp500ChartData ? (
                      <Line 
                        data={sp500ChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                label: function(context: any) {
                                  const label = context.dataset.label || '';
                                  const value = context.parsed.y;
                                  const previousClose = context.dataset.firstValue;
                                  const percentChangeValue = ((value - previousClose) / previousClose * 100);
                                  const percentChange = percentChangeValue.toFixed(2);
                                  return `${label}: ${value.toLocaleString()} (${percentChangeValue > 0 ? '+' : ''}${percentChange}%)`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { 
                              position: 'left',
                              ticks: {
                                callback: function(value) {
                                  return value.toLocaleString();
                                }
                              }
                            },
                            y1: {
                              type: 'linear' as const,
                              position: 'right',
                              grid: { display: false },
                              afterDataLimits: function(axis: any) {
                                const chart = axis.chart;
                                const yAxis = chart.scales.y;
                                axis.min = yAxis.min;
                                axis.max = yAxis.max;
                              },
                              ticks: {
                                callback: function(value: any) {
                                  const chart = (this as any).chart;
                                  const previousClose = chart.data.datasets[0].firstValue;
                                  const percentChange = ((value - previousClose) / previousClose * 100).toFixed(1);
                                  return percentChange + '%';
                                }
                              }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {sp500ChartData && sp500ChartData.datasets[0].data.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          Latest: <span className="font-semibold">{sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1].toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Day Change: <span className={`font-semibold ${((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Prev Close: {sp500ChartData.datasets[0].firstValue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Link href="/sp500" className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition">
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Dow Jones */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Dow Jones</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : dowChartData ? (
                      <Line 
                        data={dowChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                label: function(context: any) {
                                  const label = context.dataset.label || '';
                                  const value = context.parsed.y;
                                  const previousClose = context.dataset.firstValue;
                                  const percentChangeValue = ((value - previousClose) / previousClose * 100);
                                  const percentChange = percentChangeValue.toFixed(2);
                                  return `${label}: ${value.toLocaleString()} (${percentChangeValue > 0 ? '+' : ''}${percentChange}%)`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: { display: false },
                            y: { 
                              position: 'left',
                              ticks: {
                                callback: function(value) {
                                  return value.toLocaleString();
                                }
                              }
                            },
                            y1: {
                              type: 'linear' as const,
                              position: 'right',
                              grid: { display: false },
                              afterDataLimits: function(axis: any) {
                                const chart = axis.chart;
                                const yAxis = chart.scales.y;
                                axis.min = yAxis.min;
                                axis.max = yAxis.max;
                              },
                              ticks: {
                                callback: function(value: any) {
                                  const chart = (this as any).chart;
                                  const previousClose = chart.data.datasets[0].firstValue;
                                  const percentChange = ((value - previousClose) / previousClose * 100).toFixed(1);
                                  return percentChange + '%';
                                }
                              }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {dowChartData && dowChartData.datasets[0].data.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          Latest: <span className="font-semibold">{dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1].toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-gray-600">
                          Day Change: <span className={`font-semibold ${((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Prev Close: {dowChartData.datasets[0].firstValue.toLocaleString()}
                        </p>
                      </div>
                    )}
                    <Link href="/dow" className="inline-block bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition">
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
              </div>

              {/* ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Index Tracking ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* QQQ ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">QQQ ETF</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : qqqChartData ? (
                        <Line data={qqqChartData} options={getETFChartOptions('QQQ', qqqChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(qqqChartData, 'QQQ')}
                      <p className="text-sm text-gray-600">Tracks Nasdaq 100 Index</p>
                    </div>
                  </div>

                  {/* SPY ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SPY ETF</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : spyChartData ? (
                        <Line data={spyChartData} options={getETFChartOptions('SPY', spyChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(spyChartData, 'SPY')}
                      <p className="text-sm text-gray-600">Tracks S&P 500 Index</p>
                    </div>
                  </div>

                  {/* DIA ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">DIA ETF</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : diaChartData ? (
                        <Line data={diaChartData} options={getETFChartOptions('DIA', diaChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(diaChartData, 'DIA')}
                      <p className="text-sm text-gray-600">Tracks Dow Jones Index</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2x Leveraged ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">2x Leveraged ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* QLD 2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">QLD (2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : qldChartData ? (
                        <Line data={qldChartData} options={getETFChartOptions('QLD', qldChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(qldChartData, 'QLD')}
                      <p className="text-sm text-gray-600">2x Nasdaq 100</p>
                    </div>
                  </div>

                  {/* SSO 2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SSO (2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : ssoChartData ? (
                        <Line data={ssoChartData} options={getETFChartOptions('SSO', ssoChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(ssoChartData, 'SSO')}
                      <p className="text-sm text-gray-600">2x S&P 500</p>
                    </div>
                  </div>

                  {/* DDM 2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">DDM (2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : ddmChartData ? (
                        <Line data={ddmChartData} options={getETFChartOptions('DDM', ddmChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(ddmChartData, 'DDM')}
                      <p className="text-sm text-gray-600">2x Dow Jones</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3x Leveraged ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">3x Leveraged ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* TQQQ 3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">TQQQ (3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : tqqqChartData ? (
                        <Line data={tqqqChartData} options={getETFChartOptions('TQQQ', tqqqChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(tqqqChartData, 'TQQQ')}
                      <p className="text-sm text-gray-600">3x Nasdaq 100</p>
                    </div>
                  </div>

                  {/* UPRO 3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">UPRO (3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : uproChartData ? (
                        <Line data={uproChartData} options={getETFChartOptions('UPRO', uproChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(uproChartData, 'UPRO')}
                      <p className="text-sm text-gray-600">3x S&P 500</p>
                    </div>
                  </div>

                  {/* UDOW 3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">UDOW (3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : udowChartData ? (
                        <Line data={udowChartData} options={getETFChartOptions('UDOW', udowChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(udowChartData, 'UDOW')}
                      <p className="text-sm text-gray-600">3x Dow Jones</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* -1x Inverse ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">-1x Inverse ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* PSQ -1x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">PSQ (-1x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : psqChartData ? (
                        <Line data={psqChartData} options={getETFChartOptions('PSQ', psqChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(psqChartData, 'PSQ')}
                      <p className="text-sm text-gray-600">-1x Nasdaq 100 (Short)</p>
                    </div>
                  </div>

                  {/* SH -1x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SH (-1x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : shChartData ? (
                        <Line data={shChartData} options={getETFChartOptions('SH', shChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(shChartData, 'SH')}
                      <p className="text-sm text-gray-600">-1x S&P 500 (Short)</p>
                    </div>
                  </div>

                  {/* DOG -1x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">DOG (-1x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : dogChartData ? (
                        <Line data={dogChartData} options={getETFChartOptions('DOG', dogChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(dogChartData, 'DOG')}
                      <p className="text-sm text-gray-600">-1x Dow Jones (Short)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* -2x Inverse Leveraged ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">-2x Inverse Leveraged ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* QID -2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">QID (-2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : qidChartData ? (
                        <Line data={qidChartData} options={getETFChartOptions('QID', qidChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(qidChartData, 'QID')}
                      <p className="text-sm text-gray-600">-2x Nasdaq 100 (Short)</p>
                    </div>
                  </div>

                  {/* SDS -2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SDS (-2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : sdsChartData ? (
                        <Line data={sdsChartData} options={getETFChartOptions('SDS', sdsChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(sdsChartData, 'SDS')}
                      <p className="text-sm text-gray-600">-2x S&P 500 (Short)</p>
                    </div>
                  </div>

                  {/* DOG -2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">DXD (-2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : dowChartData2 ? (
                        <Line data={dowChartData2} options={getETFChartOptions('DXD', dowChartData2.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(dowChartData2, 'DXD')}
                      <p className="text-sm text-gray-600">-2x Dow Jones (Short)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* -3x Inverse Leveraged ETF Charts Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">-3x Inverse Leveraged ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* SQQQ -3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SQQQ (-3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : sqqqChartData ? (
                        <Line data={sqqqChartData} options={getETFChartOptions('SQQQ', sqqqChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(sqqqChartData, 'SQQQ')}
                      <p className="text-sm text-gray-600">-3x Nasdaq 100 (Short)</p>
                    </div>
                  </div>

                  {/* SPXU -3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SPXU (-3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : spxuChartData ? (
                        <Line data={spxuChartData} options={getETFChartOptions('SPXU', spxuChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(spxuChartData, 'SPXU')}
                      <p className="text-sm text-gray-600">-3x S&P 500 (Short)</p>
                    </div>
                  </div>

                  {/* SDOW -3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">SDOW (-3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : sdowChartData ? (
                        <Line data={sdowChartData} options={getETFChartOptions('SDOW', sdowChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderETFDataDisplay(sdowChartData, 'SDOW')}
                      <p className="text-sm text-gray-600">-3x Dow Jones (Short)</p>
                    </div>
                  </div>
                </div>
              </div>
                </>
              ) : (
                /* Table View */
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">All Indices and ETFs</h2>
                  
                  {/* Nasdaq 100 Family Table */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Nasdaq 100 Index & Related ETFs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Leverage</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Close</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Nasdaq 100 Index */}
                          {nasdaq100ChartData && nasdaq100ChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-blue-50 bg-blue-25">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Nasdaq 100 Index</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{nasdaq100ChartData.datasets[0].firstValue.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1].toLocaleString()}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((nasdaq100ChartData.datasets[0].data[nasdaq100ChartData.datasets[0].data.length - 1] - nasdaq100ChartData.datasets[0].firstValue) / nasdaq100ChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* QQQ 1x */}
                          {qqqChartData && qqqChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">QQQ</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${qqqChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${qqqChartData.datasets[0].data[qqqChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((qqqChartData.datasets[0].data[qqqChartData.datasets[0].data.length - 1] - qqqChartData.datasets[0].firstValue) / qqqChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((qqqChartData.datasets[0].data[qqqChartData.datasets[0].data.length - 1] - qqqChartData.datasets[0].firstValue) / qqqChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((qqqChartData.datasets[0].data[qqqChartData.datasets[0].data.length - 1] - qqqChartData.datasets[0].firstValue) / qqqChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* QLD 2x */}
                          {qldChartData && qldChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">QLD</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${qldChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${qldChartData.datasets[0].data[qldChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((qldChartData.datasets[0].data[qldChartData.datasets[0].data.length - 1] - qldChartData.datasets[0].firstValue) / qldChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((qldChartData.datasets[0].data[qldChartData.datasets[0].data.length - 1] - qldChartData.datasets[0].firstValue) / qldChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((qldChartData.datasets[0].data[qldChartData.datasets[0].data.length - 1] - qldChartData.datasets[0].firstValue) / qldChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* TQQQ 3x */}
                          {tqqqChartData && tqqqChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">TQQQ</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${tqqqChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${tqqqChartData.datasets[0].data[tqqqChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((tqqqChartData.datasets[0].data[tqqqChartData.datasets[0].data.length - 1] - tqqqChartData.datasets[0].firstValue) / tqqqChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((tqqqChartData.datasets[0].data[tqqqChartData.datasets[0].data.length - 1] - tqqqChartData.datasets[0].firstValue) / tqqqChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((tqqqChartData.datasets[0].data[tqqqChartData.datasets[0].data.length - 1] - tqqqChartData.datasets[0].firstValue) / tqqqChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* PSQ -1x */}
                          {psqChartData && psqChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">PSQ</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${psqChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${psqChartData.datasets[0].data[psqChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((psqChartData.datasets[0].data[psqChartData.datasets[0].data.length - 1] - psqChartData.datasets[0].firstValue) / psqChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((psqChartData.datasets[0].data[psqChartData.datasets[0].data.length - 1] - psqChartData.datasets[0].firstValue) / psqChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((psqChartData.datasets[0].data[psqChartData.datasets[0].data.length - 1] - psqChartData.datasets[0].firstValue) / psqChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* QID -2x */}
                          {qidChartData && qidChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">QID</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${qidChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${qidChartData.datasets[0].data[qidChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((qidChartData.datasets[0].data[qidChartData.datasets[0].data.length - 1] - qidChartData.datasets[0].firstValue) / qidChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((qidChartData.datasets[0].data[qidChartData.datasets[0].data.length - 1] - qidChartData.datasets[0].firstValue) / qidChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((qidChartData.datasets[0].data[qidChartData.datasets[0].data.length - 1] - qidChartData.datasets[0].firstValue) / qidChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SQQQ -3x */}
                          {sqqqChartData && sqqqChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SQQQ</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${sqqqChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${sqqqChartData.datasets[0].data[sqqqChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((sqqqChartData.datasets[0].data[sqqqChartData.datasets[0].data.length - 1] - sqqqChartData.datasets[0].firstValue) / sqqqChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((sqqqChartData.datasets[0].data[sqqqChartData.datasets[0].data.length - 1] - sqqqChartData.datasets[0].firstValue) / sqqqChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((sqqqChartData.datasets[0].data[sqqqChartData.datasets[0].data.length - 1] - sqqqChartData.datasets[0].firstValue) / sqqqChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* S&P 500 Family Table */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">S&P 500 Index & Related ETFs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-green-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Leverage</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Close</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* S&P 500 Index */}
                          {sp500ChartData && sp500ChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-green-50 bg-green-25">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">S&P 500 Index</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{sp500ChartData.datasets[0].firstValue.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1].toLocaleString()}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((sp500ChartData.datasets[0].data[sp500ChartData.datasets[0].data.length - 1] - sp500ChartData.datasets[0].firstValue) / sp500ChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SPY 1x */}
                          {spyChartData && spyChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SPY</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${spyChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${spyChartData.datasets[0].data[spyChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((spyChartData.datasets[0].data[spyChartData.datasets[0].data.length - 1] - spyChartData.datasets[0].firstValue) / spyChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((spyChartData.datasets[0].data[spyChartData.datasets[0].data.length - 1] - spyChartData.datasets[0].firstValue) / spyChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((spyChartData.datasets[0].data[spyChartData.datasets[0].data.length - 1] - spyChartData.datasets[0].firstValue) / spyChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SSO 2x */}
                          {ssoChartData && ssoChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SSO</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${ssoChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${ssoChartData.datasets[0].data[ssoChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((ssoChartData.datasets[0].data[ssoChartData.datasets[0].data.length - 1] - ssoChartData.datasets[0].firstValue) / ssoChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((ssoChartData.datasets[0].data[ssoChartData.datasets[0].data.length - 1] - ssoChartData.datasets[0].firstValue) / ssoChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((ssoChartData.datasets[0].data[ssoChartData.datasets[0].data.length - 1] - ssoChartData.datasets[0].firstValue) / ssoChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* UPRO 3x */}
                          {uproChartData && uproChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">UPRO</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${uproChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${uproChartData.datasets[0].data[uproChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((uproChartData.datasets[0].data[uproChartData.datasets[0].data.length - 1] - uproChartData.datasets[0].firstValue) / uproChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((uproChartData.datasets[0].data[uproChartData.datasets[0].data.length - 1] - uproChartData.datasets[0].firstValue) / uproChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((uproChartData.datasets[0].data[uproChartData.datasets[0].data.length - 1] - uproChartData.datasets[0].firstValue) / uproChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SH -1x */}
                          {shChartData && shChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SH</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${shChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${shChartData.datasets[0].data[shChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((shChartData.datasets[0].data[shChartData.datasets[0].data.length - 1] - shChartData.datasets[0].firstValue) / shChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((shChartData.datasets[0].data[shChartData.datasets[0].data.length - 1] - shChartData.datasets[0].firstValue) / shChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((shChartData.datasets[0].data[shChartData.datasets[0].data.length - 1] - shChartData.datasets[0].firstValue) / shChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SDS -2x */}
                          {sdsChartData && sdsChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SDS</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${sdsChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${sdsChartData.datasets[0].data[sdsChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((sdsChartData.datasets[0].data[sdsChartData.datasets[0].data.length - 1] - sdsChartData.datasets[0].firstValue) / sdsChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((sdsChartData.datasets[0].data[sdsChartData.datasets[0].data.length - 1] - sdsChartData.datasets[0].firstValue) / sdsChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((sdsChartData.datasets[0].data[sdsChartData.datasets[0].data.length - 1] - sdsChartData.datasets[0].firstValue) / sdsChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SPXU -3x */}
                          {spxuChartData && spxuChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SPXU</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${spxuChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${spxuChartData.datasets[0].data[spxuChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((spxuChartData.datasets[0].data[spxuChartData.datasets[0].data.length - 1] - spxuChartData.datasets[0].firstValue) / spxuChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((spxuChartData.datasets[0].data[spxuChartData.datasets[0].data.length - 1] - spxuChartData.datasets[0].firstValue) / spxuChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((spxuChartData.datasets[0].data[spxuChartData.datasets[0].data.length - 1] - spxuChartData.datasets[0].firstValue) / spxuChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Dow Jones Family Table */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Dow Jones Index & Related ETFs</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-red-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Leverage</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Close</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Price</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Dow Jones Index */}
                          {dowChartData && dowChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-red-50 bg-red-25">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">Dow Jones Index</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{dowChartData.datasets[0].firstValue.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1].toLocaleString()}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((dowChartData.datasets[0].data[dowChartData.datasets[0].data.length - 1] - dowChartData.datasets[0].firstValue) / dowChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* DIA 1x */}
                          {diaChartData && diaChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">DIA</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${diaChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${diaChartData.datasets[0].data[diaChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((diaChartData.datasets[0].data[diaChartData.datasets[0].data.length - 1] - diaChartData.datasets[0].firstValue) / diaChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((diaChartData.datasets[0].data[diaChartData.datasets[0].data.length - 1] - diaChartData.datasets[0].firstValue) / diaChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((diaChartData.datasets[0].data[diaChartData.datasets[0].data.length - 1] - diaChartData.datasets[0].firstValue) / diaChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* DDM 2x */}
                          {ddmChartData && ddmChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">DDM</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${ddmChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${ddmChartData.datasets[0].data[ddmChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((ddmChartData.datasets[0].data[ddmChartData.datasets[0].data.length - 1] - ddmChartData.datasets[0].firstValue) / ddmChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((ddmChartData.datasets[0].data[ddmChartData.datasets[0].data.length - 1] - ddmChartData.datasets[0].firstValue) / ddmChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((ddmChartData.datasets[0].data[ddmChartData.datasets[0].data.length - 1] - ddmChartData.datasets[0].firstValue) / ddmChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* UDOW 3x */}
                          {udowChartData && udowChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">UDOW</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${udowChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${udowChartData.datasets[0].data[udowChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((udowChartData.datasets[0].data[udowChartData.datasets[0].data.length - 1] - udowChartData.datasets[0].firstValue) / udowChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((udowChartData.datasets[0].data[udowChartData.datasets[0].data.length - 1] - udowChartData.datasets[0].firstValue) / udowChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((udowChartData.datasets[0].data[udowChartData.datasets[0].data.length - 1] - udowChartData.datasets[0].firstValue) / udowChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* DOG -1x */}
                          {dogChartData && dogChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">DOG</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-1x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${dogChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${dogChartData.datasets[0].data[dogChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((dogChartData.datasets[0].data[dogChartData.datasets[0].data.length - 1] - dogChartData.datasets[0].firstValue) / dogChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((dogChartData.datasets[0].data[dogChartData.datasets[0].data.length - 1] - dogChartData.datasets[0].firstValue) / dogChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((dogChartData.datasets[0].data[dogChartData.datasets[0].data.length - 1] - dogChartData.datasets[0].firstValue) / dogChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* DXD -2x */}
                          {dowChartData2 && dowChartData2.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">DXD</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-2x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${dowChartData2.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${dowChartData2.datasets[0].data[dowChartData2.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((dowChartData2.datasets[0].data[dowChartData2.datasets[0].data.length - 1] - dowChartData2.datasets[0].firstValue) / dowChartData2.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((dowChartData2.datasets[0].data[dowChartData2.datasets[0].data.length - 1] - dowChartData2.datasets[0].firstValue) / dowChartData2.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((dowChartData2.datasets[0].data[dowChartData2.datasets[0].data.length - 1] - dowChartData2.datasets[0].firstValue) / dowChartData2.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                          {/* SDOW -3x */}
                          {sdowChartData && sdowChartData.datasets[0].data.length > 0 && (
                            <tr className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">SDOW</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-3x</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${sdowChartData.datasets[0].firstValue.toFixed(2)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${sdowChartData.datasets[0].data[sdowChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                              <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((sdowChartData.datasets[0].data[sdowChartData.datasets[0].data.length - 1] - sdowChartData.datasets[0].firstValue) / sdowChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {((sdowChartData.datasets[0].data[sdowChartData.datasets[0].data.length - 1] - sdowChartData.datasets[0].firstValue) / sdowChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((sdowChartData.datasets[0].data[sdowChartData.datasets[0].data.length - 1] - sdowChartData.datasets[0].firstValue) / sdowChartData.datasets[0].firstValue * 100).toFixed(2)}%
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden table container for compatibility */}
              <TableContainer component={Paper} className="rounded-xl shadow-lg bg-white overflow-x-auto" style={{ display: 'none' }}>
                <Table size="small" sx={{ minWidth: { xs: 320, sm: 650 } }}>
                  <TableHead>
                    <TableRow className="bg-gray-50 text-gray-600" sx={{ height: { xs: 28, sm: 32 } }}>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 30, sm: 40 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'no'} direction={sortKey === 'no' ? sortDirection : 'asc'} onClick={() => handleSort('no')}>{t.en.no}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 50, sm: 70 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'symbol'} direction={sortKey === 'symbol' ? sortDirection : 'asc'} onClick={() => handleSort('symbol')}>{t.en.symbol}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 80, sm: 120 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'name'} direction={sortKey === 'name' ? sortDirection : 'asc'} onClick={() => handleSort('name')}>{t.en.companyName}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'ath_price'} direction={sortKey === 'ath_price' ? sortDirection : 'desc'} onClick={() => handleSort('ath_price')}>{t.en.athPrice}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'ath_date'} direction={sortKey === 'ath_date' ? sortDirection : 'desc'} onClick={() => handleSort('ath_date')}>{t.en.athDate}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'price'} direction={sortKey === 'price' ? sortDirection : 'desc'} onClick={() => handleSort('price')}>{t.en.price}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'change'} direction={sortKey === 'change' ? sortDirection : 'desc'} onClick={() => handleSort('change')}>{t.en.change}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'weight'} direction={sortKey === 'weight' ? sortDirection : 'desc'} onClick={() => handleSort('weight')}>{t.en.weight}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 50, sm: 70 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'marketCap'} direction={sortKey === 'marketCap' ? sortDirection : 'desc'} onClick={() => handleSort('marketCap')}>{t.en.marketCap}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'pe_ratio'} direction={sortKey === 'pe_ratio' ? sortDirection : 'desc'} onClick={() => handleSort('pe_ratio')}>{t.en.peRatio}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'forward_pe'} direction={sortKey === 'forward_pe' ? sortDirection : 'desc'} onClick={() => handleSort('forward_pe')}>{t.en.forwardPe}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'ps_ratio'} direction={sortKey === 'ps_ratio' ? sortDirection : 'desc'} onClick={() => handleSort('ps_ratio')}>{t.en.psRatio}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'pb_ratio'} direction={sortKey === 'pb_ratio' ? sortDirection : 'desc'} onClick={() => handleSort('pb_ratio')}>{t.en.pbRatio}</TableSortLabel>
                      </TableCell>
                      <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                        <TableSortLabel active={sortKey === 'eps_ttm'} direction={sortKey === 'eps_ttm' ? sortDirection : 'desc'} onClick={() => handleSort('eps_ttm')}>{t.en.epsTtm}</TableSortLabel>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {indexLoading ? (
                      <TableRow>
                        <TableCell colSpan={13} align="center" className="py-8 text-gray-500">{t.en.loading}</TableCell>
                      </TableRow>
                    ) : indexData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} align="center" className="py-8 text-gray-500">{t.en.noData}</TableCell>
                      </TableRow>
                    ) : (
                      pagedIndexData.map((row, i) => (
                        <TableRow key={i} className="hover:bg-gray-50 transition" sx={{ height: { xs: 20, sm: 32 } }}>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.no}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.symbol}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.name}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.ath_price ? `$${row.ath_price.toFixed(2)}` : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.ath_date || '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.price ? `$${row.price.toFixed(2)}` : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 }, color: row.change > 0 ? 'green' : row.change < 0 ? 'red' : 'inherit' }}>{row.change ? `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}%` : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.weight ? `${row.weight.toFixed(2)}%` : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.marketCap || '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.pe_ratio ? row.pe_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.forward_pe ? row.forward_pe.toFixed(2) : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.ps_ratio ? row.ps_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.pb_ratio ? row.pb_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.eps_ttm ? row.eps_ttm.toFixed(2) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {indexData.length > 0 && (
                  <div className="relative flex flex-row flex-nowrap items-center w-full py-4 px-2 gap-2">
                    <div className="flex-1 order-2 sm:order-1" />
                    <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center gap-2 flex-none mx-auto order-1 sm:order-2">
                      {indexData.length > ITEMS_PER_PAGE && (
                        <Pagination count={indexTotalPages} page={indexPage} onChange={(_, value) => setIndexPage(value)} color="primary" shape="rounded" siblingCount={0} boundaryCount={1} size="small" />
                      )}
                    </div>
                    <div className="flex-1 flex justify-end order-3">
                      <span className="text-gray-500 text-xs sm:text-sm md:text-base whitespace-nowrap">Showing {(indexPage-1)*ITEMS_PER_PAGE+1} to {Math.min(indexPage*ITEMS_PER_PAGE, indexData.length)} of {indexData.length.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </TableContainer>
            </div>
          </main>
          <Footer language={language} />
        </div>
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-0 flex flex-col">
          <Navigation 
            language={language} 
            onLanguageChange={setLanguage} 
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <div className="max-w-5xl mx-auto px-2 py-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700 mb-2 tracking-tight">{t.zh.title}</h1>
              <p className="text-gray-600 text-lg">{t.zh.description}</p>
            </div>

            {activeTab === 'funds' && (
              <>
                <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-4 sm:p-6 mb-8 flex flex-col gap-4 items-stretch">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Autocomplete options={['标普', '标普500ETF', '道琼斯', '精选', '黄金', '恒生科技', '恒生互联网', '日经', '纳斯达克100ETF', '生物科技', '石油', '债券']} value={filters.fund_name} onChange={(_, value) => { const newFilters = { ...filters, fund_name: value || '' }; setFilters(newFilters); }} onInputChange={(_, value) => { const newFilters = { ...filters, fund_name: value || '' }; setFilters(newFilters); }} freeSolo renderInput={(params) => <TextField {...params} label="基金名称" variant="outlined" size="small" className="text-xs sm:text-sm" />} clearOnEscape />
                    </div>
                    <div className="flex-1">
                      <Autocomplete options={['', ...fundCompanies]} value={filters.fund_company} onChange={(_, value) => { const newFilters = { ...filters, fund_company: value || '' }; setFilters(newFilters); fetchData(newFilters); }} renderInput={(params) => <TextField {...params} label="基金公司" variant="outlined" size="small" className="text-xs sm:text-sm" />} clearOnEscape />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Autocomplete options={['', '法国', '美国', '欧洲', '日本', '越南', '印度', '亚洲', '中国']} value={filters.country} onChange={(_, value) => { const newFilters = { ...filters, country: value || '' }; setFilters(newFilters); fetchData(newFilters); }} renderInput={(params) => <TextField {...params} label="投资地区" variant="outlined" size="small" className="text-xs sm:text-sm" />} clearOnEscape />
                    </div>
                    <div className="flex-1">
                      <TextField label="基金代码" variant="outlined" size="small" className="text-xs sm:text-sm" value={filters.fund_code} onChange={e => setFilters(f => ({ ...f, fund_code: e.target.value }))} InputProps={{ startAdornment: <span style={{ color: '#9ca3af', marginRight: 4 }}>#</span> }} fullWidth />
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-4">
                    <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-2 py-2 rounded-md font-medium shadow transition text-xs sm:text-sm" onClick={resetFilters}>重置</button>
                    <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-2 rounded-md font-medium shadow transition text-xs sm:text-sm" onClick={handleSearch} disabled={loading}>{loading ? '查询中...' : '查询'}</button>
                  </div>
                </div>
                <TableContainer component={Paper} className="rounded-xl shadow-lg bg-white/90 overflow-x-auto">
                  <Table size="small" sx={{ minWidth: { xs: 320, sm: 650 } }}>
                    <TableHead>
                      <TableRow className="bg-indigo-100 text-indigo-800" sx={{ height: { xs: 28, sm: 32 } }}>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 80, sm: 120 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'fund_name'} direction={sortKey === 'fund_name' ? sortDirection : 'asc'} onClick={() => handleSort('fund_name')}>基金名称</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 60, sm: 85 }, fontSize: { xs: '0.6rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'fund_code'} direction={sortKey === 'fund_code' ? sortDirection : 'asc'} onClick={() => handleSort('fund_code')}>代码</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 50, sm: 70 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'quota'} direction={sortKey === 'quota' ? sortDirection : 'desc'} onClick={() => handleSort('quota')}>额度</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 35, sm: 50 }, fontSize: { xs: '0.6rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'share_class'} direction={sortKey === 'share_class' ? sortDirection : 'asc'} onClick={() => handleSort('share_class')}>类别</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'currency'} direction={sortKey === 'currency' ? sortDirection : 'asc'} onClick={() => handleSort('currency')}>币种</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ minWidth: { xs: 30, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>公告</TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'fund_company'} direction={sortKey === 'fund_company' ? sortDirection : 'asc'} onClick={() => handleSort('fund_company')}>公司</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 35, sm: 55 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'otc'} direction={sortKey === 'otc' ? sortDirection : 'asc'} onClick={() => handleSort('otc')}>OTC</TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={8} align="center" className="py-8 text-indigo-400">加载中...</TableCell></TableRow>
                      ) : data.length === 0 ? (
                        <TableRow><TableCell colSpan={8} align="center" className="py-8 text-gray-400">暂无数据</TableCell></TableRow>
                      ) : (
                        data.slice((fundsPage-1)*ITEMS_PER_PAGE, fundsPage*ITEMS_PER_PAGE).map((row, i) => (
                          <TableRow key={i} className="hover:bg-indigo-50 transition" sx={{ height: { xs: 20, sm: 32 } }}>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.fund_name}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.fund_code}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.quota.toLocaleString()}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.share_class}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.currency}</TableCell>
                            <TableCell sx={{ py: 0, px: { xs: 0.5, sm: 1 } }}><button className="text-blue-600 hover:underline text-sm sm:text-base" onClick={() => openPdf(row.pdf_id)}>📄</button></TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.fund_company}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{row.otc}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {data.length > 0 && (
                    <div className="relative flex flex-row flex-nowrap items-center w-full py-4 px-2 gap-2">
                      <div className="flex-1 order-2 sm:order-1" />
                      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center gap-2 flex-none mx-auto order-1 sm:order-2">
                        {data.length > ITEMS_PER_PAGE && (
                          <Pagination count={fundsTotalPages} page={fundsPage} onChange={(_, value) => setFundsPage(value)} color="primary" shape="rounded" siblingCount={0} boundaryCount={1} size="small" />
                        )}
                      </div>
                      <div className="flex-1 flex justify-end order-3">
                        <span className="text-gray-500 text-xs sm:text-sm md:text-base whitespace-nowrap">显示 {(fundsPage-1)*ITEMS_PER_PAGE+1} 到 {Math.min(fundsPage*ITEMS_PER_PAGE, data.length)} ，共 {data.length.toLocaleString()} 条</span>
                      </div>
                    </div>
                  )}
                </TableContainer>
              </>
            )}

            {activeTab === 'stocks' && (
              <>
                <div className="mb-2 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="w-full sm:w-auto" />
                  <div className="flex items-center justify-end w-full sm:w-auto gap-2">
                    <span className={`font-semibold text-sm ${stockMarket === 'US' ? 'text-indigo-700' : 'text-gray-500'}`}>美股</span>
                    <Switch
                      checked={stockMarket === 'HK'}
                      onChange={checked => setStockMarket(checked ? 'HK' : 'US')}
                      className={`${stockMarket === 'HK' ? 'bg-indigo-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${stockMarket === 'HK' ? 'translate-x-5' : 'translate-x-1'}`} />
                    </Switch>
                    <span className={`font-semibold text-sm ${stockMarket === 'HK' ? 'text-indigo-700' : 'text-gray-500'}`}>港股</span>
                    <DatePicker
                      selected={selectedDate}
                      onChange={handleDateChange}
                      minDate={minDate}
                      maxDate={maxDate}
                      dateFormat="MM-dd"
                      className="bg-transparent cursor-pointer text-right text-sm w-16"
                      ref={datePickerRef}
                      popperPlacement="bottom-end"
                      customInput={<DatePickerCustomInput />}
                    />
                  </div>
                </div>
                <TableContainer component={Paper} className="rounded-xl shadow-lg bg-white/90 overflow-x-auto">
                  <Table size="small" sx={{ minWidth: { xs: 320, sm: 650 } }}>
                    <TableHead>
                      <TableRow className="bg-indigo-100 text-indigo-800" sx={{ height: { xs: 28, sm: 32 } }}>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'ticker'} direction={sortKey === 'ticker' ? sortDirection : 'asc'} onClick={() => handleSort('ticker')}>Ticker</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 80, sm: 120 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'name'} direction={sortKey === 'name' ? sortDirection : 'asc'} onClick={() => handleSort('name')}>Name</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 40, sm: 60 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'changeFromAthPercent'} direction={sortKey === 'changeFromAthPercent' ? sortDirection : 'asc'} onClick={() => handleSort('changeFromAthPercent')}>Change % from ATH</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 60, sm: 85 }, fontSize: { xs: '0.6rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'lastClosingPrice'} direction={sortKey === 'lastClosingPrice' ? sortDirection : 'asc'} onClick={() => handleSort('lastClosingPrice')}>Last Closing Price</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 35, sm: 50 }, fontSize: { xs: '0.6rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'lastChangePercent'} direction={sortKey === 'lastChangePercent' ? sortDirection : 'asc'} onClick={() => handleSort('lastChangePercent')}>Last Change %</TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ m: 0, p: 0, minWidth: { xs: 50, sm: 70 }, fontSize: { xs: '0.65rem', sm: '0.875rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>
                          <TableSortLabel active={sortKey === 'allTimeHigh'} direction={sortKey === 'allTimeHigh' ? sortDirection : 'asc'} onClick={() => handleSort('allTimeHigh')}>All Time High Price</TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockLoading ? (
                        <TableRow><TableCell colSpan={6} align="center" className="py-8 text-indigo-400">加载中...</TableCell></TableRow>
                      ) : filteredStockData.length === 0 ? (
                        <TableRow><TableCell colSpan={6} align="center" className="py-8 text-gray-400">暂无数据。<br />T日数据于T+1日8:30更新。<br />选择右上角日历可查看其他日期数据。</TableCell></TableRow>
                      ) : (
                        pagedStocks.map((stock, i) => (
                          <TableRow key={i} className="hover:bg-indigo-50 transition" sx={{ height: { xs: 20, sm: 32 }, backgroundColor: stock.changeFromAthPercent <= -30 ? 'rgba(255, 0, 0, 0.2)' : stock.changeFromAthPercent <= -20 ? 'rgba(255, 165, 0, 0.2)' : stock.changeFromAthPercent <= -10 ? 'rgba(255, 255, 0, 0.2)' : 'transparent' }}>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.ticker}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.name}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.changeFromAthPercent}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.lastClosingPrice}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.lastChangePercent}</TableCell>
                            <TableCell sx={{ fontSize: { xs: '0.6rem', sm: '0.925rem' }, py: 0, px: { xs: 0.5, sm: 1 } }}>{stock.allTimeHigh}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {filteredStockData.length > 0 && (
                    <div className="relative flex flex-row flex-nowrap items-center w-full py-4 px-2 gap-2">
                      <div className="flex-1 order-2 sm:order-1" />
                      <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center gap-2 flex-none mx-auto order-1 sm:order-2">
                        {filteredStockData.length > ITEMS_PER_PAGE && (
                          <Pagination count={stocksTotalPages} page={stocksPage} onChange={(_, value) => setStocksPage(value)} color="primary" shape="rounded" siblingCount={0} boundaryCount={1} size="small" />
                        )}
                      </div>
                      <div className="flex-1 flex justify-end order-3">
                        <span className="text-gray-500 text-xs sm:text-sm md:text-base whitespace-nowrap">显示 {(stocksPage-1)*ITEMS_PER_PAGE+1} 到 {Math.min(stocksPage*ITEMS_PER_PAGE, filteredStockData.length)} ，共 {filteredStockData.length.toLocaleString()} 条</span>
                      </div>
                    </div>
                  )}
                </TableContainer>
              </>
            )}

            {activeTab === 'funds' && (
              <div className="bg-white/80 backdrop-blur rounded-xl shadow-lg p-4 sm:p-6 mb-8 mt-6">
                <h2 className="text-lg sm:text-xl font-semibold text-indigo-700 mb-4">常见问题（QA）</h2>
              {[
                { question: "什么是QDII基金？", answer: "QDII基金是指合格境内机构投资者（Qualified Domestic Institutional Investor）通过境内基金公司募集资金，投资于境外市场的基金产品。" },
                { question: "QDII基金和普通基金有什么区别？", answer: "QDII基金和普通基金都是投资于股票的基金，但是QDII基金是境外股票投资，而普通基金是境内股票投资。" },
                { question: "QDII基金有哪些风险？", answer: "QDII基金主要有汇率风险、市场风险、流动性风险和政策风险等。" },
                { question: "什么是A/C/D/E/F/I类等份额？有什么区别？", answer: "在银行渠道和第三方基金销售平台中，一般只展示A类和C类份额。他们的区别主要是申赎费用的区别，一般建议申购C类份额，前端收费更低。其他份额类别，如D类、E类、F类、I类份额，并没有定义，一般是这两年兴起的发起式基金份额。" },
                { question: "为什么有些基金没有C类份额？", answer: "有些基金公司可能没有发行C类份额，或者C类份额的申购额度已用完。" },
                { question: "表格里显示某基金公司的纳斯达克100ETF额度高达200万，可是在银行和第三方基金销售平台却无法找到？", answer: "根据上述表格(2025年9月20日)，可以看到南方基金纳斯达克100指数I类每日申购额度为200万，广发基金F类的为100万。这两类份额均只能从直销渠道(官方APP/微信)购买，银行和第三方基金销售平台不展示也不能购买。" },
                { question: "为啥做这个网站？这个列表的用途是什么？", answer: "一般可以通过银行APP、第三方基金销售平台或基金公司申购基金，但各渠道展示的数据有限。例如，某只基金有A类和C类份，A类收取申购费，C类不收取。在银行和第三方平台通常只展示A类，C类则不显示。本网站致力于消除信息差，方便投资者快速找到满足自己申购额度的基金。" },
                { question: "有推荐的交易平台吗？", answer: "本网站不提供任何交易平台，只提供数据展示。致力于不偏不倚。" },
                { question: "申购额度是什么？", answer: "申购额度是指基金公司允许投资者购买该基金的最大金额。额度用完后，可能无法继续申购该基金。" },
                { question: "为什么有些基金额度是0？", answer: "额度为0表示该基金当前无法申购，可能是因为额度已用完或基金公司暂停申购。" },
                { question: "为什么没有列出场内ETF？", answer: "暂时不包含场内ETF，因为场内ETF在二级市场交易，没有申购额度限制。" },
                { question: "如何与场内ETF进行套利？", answer: "场内ETF套利涉及在二级市场买卖ETF份额与在一级市场申购赎回ETF份额之间的价差交易。套利者通过低买高卖获取利润，但需考虑交易费用、税务影响及市场风险。建议有经验的投资者参与，初学者应谨慎。" },
                { question: "列出的申购额度一定可以购买吗？", answer: "不一定。实际可申购额度可能因渠道、时间等因素有所不同。建议在申购前通过银行APP或第三方平台确认实际可申购额度。另外，我们发现，某基金公司在公告中列出D类份额及其申购额度，但在银行APP和第三方平台均不显示D类份额，经咨询官方客服，确认D类份额无法申购 :( 因此，建议在申购前务必确认份额类别和额度的有效性。" },
                { question: "投资纳斯达克指数或者标普500指数回报有多少？", answer: "根据历史数据（截至2025年9月13日），纳斯达克100指数过去10年年化回报约18.56%，30年约13.44%，波动性较高，适合高风险偏好者。标普500指数过去10年年化回报约9–13%，30年约10.2%，行业分散，较稳定。2024年，纳斯达克100上涨24.88%，标普500涨25.02%；2025年初至今，分别涨14.66%和12.98%。相比之下，香港分红保险IRR(Internal Rate of Return)约3–4%，内地约2%，流动性差，适合低风险需求。指数基金长期回报远超分红保险，建议根据风险偏好选择：激进型选纳斯达克100，稳健型选标普500，或混合配置。若遇保险推销，无需焦虑 :) Anyway, they serve different needs:)" },
                { question: "这些数据来自哪里？可靠吗？", answer: "数据均来自基金公司发布的官方公告。尽管如此，我们发现部分公告偶有数据错误，可能导致列表中个别数据不准确。我们力求数据准确，若发现错误，欢迎通过下方表格或交流群反馈。" },
                { question: "这些数据多久更新一次？", answer: "QDII基金申购额度每天3:00(北京时间，下同)和18:00更新，MEGA 7+股票数据每天8:30更新。" },
                { question: "MEGA 7+是用来干什么的？", answer: "方便每日观察美股/港股核心科技龙头的表现，数据与QDII额度整合，便于投资决策。" },
                { question: "MEGA 7+包含哪些股票？", answer: "MEGA 7指纳斯达克100指数中的7只核心科技龙头（苹果、微软、亚马逊、谷歌、Meta、英伟达、特斯拉）。本表中包含了部分杠杆ETF及港股核心科技龙头（腾讯、阿里巴巴等），故称为MEGA 7+。" },
                { question: "MEGA 7+为啥没有9月11日以前的数据？", answer: "9月11日以前的数据未存入数据库，仅保存在个人邮箱。从9月12日起，每天数据会自动保存并可按日期查询。" },
                { question: "MEGA 7+的数据来源？", answer: "数据来源于开源库 AKSHARE。" },
                { question: "可以安装APP到手机/电脑吗？", answer: "可以。在手机浏览器中打开本网站，选择“分享” -> “添加到主屏幕”即可。在电脑浏览器中打开本网站，点击地址栏右侧的安装图标（+号），或通过浏览器菜单选择“安装应用”。" },
              ].map((faq, i) => (
                <Accordion key={i}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight="bold">{faq.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" color="textSecondary">{faq.answer}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
              </div>
            )}
          </div>
          <Footer language={language} />
        </div>
      )}

      <Analytics />
    </>
  )
}