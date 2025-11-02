import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { useRouter } from 'next/router';
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

export default function Mag7() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [chartsLoading, setChartsLoading] = useState(false);
  
  // Chart data states for Magnificent 7
  const [aaplChartData, setAaplChartData] = useState<any>(null);
  const [msftChartData, setMsftChartData] = useState<any>(null);
  const [googChartData, setGoogChartData] = useState<any>(null);
  const [amznChartData, setAmznChartData] = useState<any>(null);
  const [nvdaChartData, setNvdaChartData] = useState<any>(null);
  const [metaChartData, setMetaChartData] = useState<any>(null);
  const [tslaChartData, setTslaChartData] = useState<any>(null);
  
  // FANG+ ETF chart data states
  const [fngChartData, setFngChartData] = useState<any>(null);
  const [fnguChartData, setFnguChartData] = useState<any>(null);
  const [fngdChartData, setFngdChartData] = useState<any>(null);
  
  // MAG7 ETF chart data states
  const [magsChartData, setMagsChartData] = useState<any>(null);
  const [magxChartData, setMagxChartData] = useState<any>(null);

  useEffect(() => {
    const langFromUrl = router.query.lang as string;
    if (langFromUrl === 'zh') {
      setLanguage('zh');
    } else {
      setLanguage('en');
    }
  }, [router.query.lang]);

  // Chart options generator
  const getChartOptions = (label: string, previousClose: number) => ({
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
        afterDataLimits: function(axis: any) {
          const chart = axis.chart;
          const yAxis = chart.scales.y;
          axis.min = yAxis.min;
          axis.max = yAxis.max;
        },
        ticks: {
          callback: function(tickValue: any) {
            const percentChange = ((tickValue - previousClose) / previousClose * 100).toFixed(1);
            return percentChange + '%';
          }
        }
      }
    }
  });

  // Helper function to render stock data display
  const renderStockDataDisplay = (chartData: any, label: string) => {
    if (!chartData || !chartData.datasets[0].data.length) return null;
    const data = chartData.datasets[0].data;
    const latestValue = data[data.length - 1];
    const previousClose = chartData.datasets[0].firstValue;
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

  // Fetch stock chart data
  useEffect(() => {
    const fetchStockCharts = async () => {
      setChartsLoading(true);
      try {
        const [aapl, msft, goog, amzn, nvda, meta, tsla, fang, fngu, fngd, mags, magx] = await Promise.all([
          fetch('/api/index-chart?symbol=AAPL&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=MSFT&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=GOOG&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=AMZN&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=NVDA&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=META&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=TSLA&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=FANG&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=FNGU&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=FNGD&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=MAGS&period=1d&interval=1m').then(r => r.json()),
          fetch('/api/index-chart?symbol=MAGX&period=1d&interval=1m').then(r => r.json())
        ]);

        // Helper function to filter to only last trading day
        const filterLastTradingDay = (dates: string[], prices: number[], previousClose?: number) => {
          if (!dates || !prices || dates.length === 0) return { dates: [], prices: [], previousClose };
          
          const dateCounts: { [key: string]: { count: number, indices: number[] } } = {};
          
          for (let i = 0; i < dates.length; i++) {
            const date = new Date(dates[i]);
            const dateKey = date.toISOString().split('T')[0];
            if (!dateCounts[dateKey]) {
              dateCounts[dateKey] = { count: 0, indices: [] };
            }
            dateCounts[dateKey].count++;
            dateCounts[dateKey].indices.push(i);
          }
          
          let maxCount = 0;
          let mostRecentDateKey = '';
          let mostRecentIndices: number[] = [];
          
          const sortedDates = Object.entries(dateCounts).sort((a, b) => b[0].localeCompare(a[0]));
          
          for (const [dateKey, info] of sortedDates) {
            if (info.count > maxCount && info.count > 50) {
              maxCount = info.count;
              mostRecentDateKey = dateKey;
              mostRecentIndices = info.indices;
            }
          }
          
          if (maxCount === 0) {
            for (const [dateKey, info] of sortedDates) {
              if (info.count > maxCount) {
                maxCount = info.count;
                mostRecentDateKey = dateKey;
                mostRecentIndices = info.indices;
              }
            }
          }
          
          const filteredData: { dates: string[], prices: number[], previousClose?: number } = { 
            dates: [], 
            prices: [], 
            previousClose
          };
          
          mostRecentIndices.sort((a, b) => {
            const dateA = new Date(dates[a]).getTime();
            const dateB = new Date(dates[b]).getTime();
            return dateA - dateB;
          });
          
          for (const idx of mostRecentIndices) {
            filteredData.dates.push(dates[idx]);
            filteredData.prices.push(prices[idx]);
          }
          
          return filteredData;
        };

        // Process each stock
        if (aapl.dates && aapl.prices && aapl.prices.length > 0) {
          const filtered = filterLastTradingDay(aapl.dates, aapl.prices, aapl.previousClose);
          if (filtered.prices.length > 0) {
            setAaplChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Apple (AAPL)',
                data: filtered.prices,
                borderColor: 'rgb(0, 0, 0)',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (msft.dates && msft.prices && msft.prices.length > 0) {
          const filtered = filterLastTradingDay(msft.dates, msft.prices, msft.previousClose);
          if (filtered.prices.length > 0) {
            setMsftChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Microsoft (MSFT)',
                data: filtered.prices,
                borderColor: 'rgb(0, 120, 212)',
                backgroundColor: 'rgba(0, 120, 212, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (goog.dates && goog.prices && goog.prices.length > 0) {
          const filtered = filterLastTradingDay(goog.dates, goog.prices, goog.previousClose);
          if (filtered.prices.length > 0) {
            setGoogChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Alphabet (GOOG)',
                data: filtered.prices,
                borderColor: 'rgb(234, 67, 53)',
                backgroundColor: 'rgba(234, 67, 53, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (amzn.dates && amzn.prices && amzn.prices.length > 0) {
          const filtered = filterLastTradingDay(amzn.dates, amzn.prices, amzn.previousClose);
          if (filtered.prices.length > 0) {
            setAmznChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Amazon (AMZN)',
                data: filtered.prices,
                borderColor: 'rgb(255, 153, 0)',
                backgroundColor: 'rgba(255, 153, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (nvda.dates && nvda.prices && nvda.prices.length > 0) {
          const filtered = filterLastTradingDay(nvda.dates, nvda.prices, nvda.previousClose);
          if (filtered.prices.length > 0) {
            setNvdaChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'NVIDIA (NVDA)',
                data: filtered.prices,
                borderColor: 'rgb(118, 185, 0)',
                backgroundColor: 'rgba(118, 185, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (meta.dates && meta.prices && meta.prices.length > 0) {
          const filtered = filterLastTradingDay(meta.dates, meta.prices, meta.previousClose);
          if (filtered.prices.length > 0) {
            setMetaChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Meta (META)',
                data: filtered.prices,
                borderColor: 'rgb(24, 119, 242)',
                backgroundColor: 'rgba(24, 119, 242, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }

        if (tsla.dates && tsla.prices && tsla.prices.length > 0) {
          const filtered = filterLastTradingDay(tsla.dates, tsla.prices, tsla.previousClose);
          if (filtered.prices.length > 0) {
            setTslaChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'Tesla (TSLA)',
                data: filtered.prices,
                borderColor: 'rgb(204, 0, 0)',
                backgroundColor: 'rgba(204, 0, 0, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                firstValue: filtered.previousClose || filtered.prices[0]
              }]
            });
          }
        }
        
        // Process FANG+ ETFs
        if (fang.dates && fang.prices && fang.prices.length > 0) {
          const filtered = filterLastTradingDay(fang.dates, fang.prices, fang.previousClose);
          if (filtered.prices.length > 0) {
            setFngChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'FANG ETF',
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
        
        if (fngu.dates && fngu.prices && fngu.prices.length > 0) {
          const filtered = filterLastTradingDay(fngu.dates, fngu.prices, fngu.previousClose);
          if (filtered.prices.length > 0) {
            setFnguChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'FNGU 3x ETF',
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
        
        if (fngd.dates && fngd.prices && fngd.prices.length > 0) {
          const filtered = filterLastTradingDay(fngd.dates, fngd.prices, fngd.previousClose);
          if (filtered.prices.length > 0) {
            setFngdChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'FNGD -3x ETF',
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
        
        // Process MAG7 ETFs
        if (mags.dates && mags.prices && mags.prices.length > 0) {
          const filtered = filterLastTradingDay(mags.dates, mags.prices, mags.previousClose);
          if (filtered.prices.length > 0) {
            setMagsChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'MAGS ETF',
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
        
        if (magx.dates && magx.prices && magx.prices.length > 0) {
          const filtered = filterLastTradingDay(magx.dates, magx.prices, magx.previousClose);
          if (filtered.prices.length > 0) {
            setMagxChartData({
              labels: filtered.dates,
              datasets: [{
                label: 'MAGX 2x ETF',
                data: filtered.prices,
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
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
        console.error('Error fetching stock chart data:', error);
      } finally {
        setChartsLoading(false);
      }
    };

    fetchStockCharts();
  }, []);

  return (
    <>
      <Head>
        <title>Magnificent 7 Stocks - Real-time Charts</title>
        <meta name="description" content="Real-time intraday charts for the Magnificent 7 tech stocks: Apple, Microsoft, Alphabet, Amazon, NVIDIA, Meta, and Tesla" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Navigation language={language} onLanguageChange={setLanguage} />
        <main className="flex-grow py-10">
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Magnificent 7 Stocks</h1>
              <p className="text-gray-600 text-lg">Real-time intraday performance of the top tech giants</p>
              <Link href="/" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium">
                ← Back to Home
              </Link>
            </div>
            
            {/* View Mode Toggle */}
            <div className="mb-6 flex justify-end items-center gap-3">
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
            
            {viewMode === 'grid' ? (
              /* Grid View */
              <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Magnificent 7 Stocks</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Apple */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Apple (AAPL)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : aaplChartData ? (
                      <Line data={aaplChartData} options={getChartOptions('AAPL', aaplChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(aaplChartData, 'AAPL')}
                  </div>
                </div>

                {/* Microsoft */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Microsoft (MSFT)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : msftChartData ? (
                      <Line data={msftChartData} options={getChartOptions('MSFT', msftChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(msftChartData, 'MSFT')}
                  </div>
                </div>

                {/* Alphabet */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Alphabet (GOOG)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : googChartData ? (
                      <Line data={googChartData} options={getChartOptions('GOOG', googChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(googChartData, 'GOOG')}
                  </div>
                </div>

                {/* Amazon */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Amazon (AMZN)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : amznChartData ? (
                      <Line data={amznChartData} options={getChartOptions('AMZN', amznChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(amznChartData, 'AMZN')}
                  </div>
                </div>

                {/* NVIDIA */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">NVIDIA (NVDA)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : nvdaChartData ? (
                      <Line data={nvdaChartData} options={getChartOptions('NVDA', nvdaChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(nvdaChartData, 'NVDA')}
                  </div>
                </div>

                {/* Meta */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Meta (META)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : metaChartData ? (
                      <Line data={metaChartData} options={getChartOptions('META', metaChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(metaChartData, 'META')}
                  </div>
                </div>

                {/* Tesla */}
                <div className="bg-white rounded-xl shadow-lg p-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">Tesla (TSLA)</h2>
                  <div style={{ height: '300px' }}>
                    {chartsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                    ) : tslaChartData ? (
                      <Line data={tslaChartData} options={getChartOptions('TSLA', tslaChartData.datasets[0].firstValue)} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                    )}
                  </div>
                  <div className="mt-4 text-center">
                    {renderStockDataDisplay(tslaChartData, 'TSLA')}
                  </div>
                </div>
                </div>
              </div>

              {/* FANG+ ETFs Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">FANG+ ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* FANG 1x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">FANG (1x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : fngChartData ? (
                        <Line data={fngChartData} options={getChartOptions('FANG', fngChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderStockDataDisplay(fngChartData, 'FANG')}
                      <p className="text-sm text-gray-600">FANG+ Index Tracker</p>
                    </div>
                  </div>

                  {/* FNGU 3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">FNGU (3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : fnguChartData ? (
                        <Line data={fnguChartData} options={getChartOptions('FNGU', fnguChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderStockDataDisplay(fnguChartData, 'FNGU')}
                      <p className="text-sm text-gray-600">3x FANG+ (Long)</p>
                    </div>
                  </div>

                  {/* FNGD -3x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">FNGD (-3x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : fngdChartData ? (
                        <Line data={fngdChartData} options={getChartOptions('FNGD', fngdChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderStockDataDisplay(fngdChartData, 'FNGD')}
                      <p className="text-sm text-gray-600">-3x FANG+ (Short)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* MAG7 ETFs Grid */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">MAG7 ETFs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* MAGS 1x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">MAGS (1x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : magsChartData ? (
                        <Line data={magsChartData} options={getChartOptions('MAGS', magsChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderStockDataDisplay(magsChartData, 'MAGS')}
                      <p className="text-sm text-gray-600">MAG7 Index Tracker</p>
                    </div>
                  </div>

                  {/* MAGX 2x ETF */}
                  <div className="bg-white rounded-xl shadow-lg p-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 text-center">MAGX (2x)</h2>
                    <div style={{ height: '300px' }}>
                      {chartsLoading ? (
                        <div className="flex items-center justify-center h-full text-gray-500">Loading...</div>
                      ) : magxChartData ? (
                        <Line data={magxChartData} options={getChartOptions('MAGX', magxChartData.datasets[0].firstValue)} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {renderStockDataDisplay(magxChartData, 'MAGX')}
                      <p className="text-sm text-gray-600">2x MAG7 (Long)</p>
                    </div>
                  </div>
                </div>
              </div>
              </>
            ) : (
              /* Table View */
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">All Stocks</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Close</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Apple */}
                      {aaplChartData && aaplChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Apple</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">AAPL</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${aaplChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${aaplChartData.datasets[0].data[aaplChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((aaplChartData.datasets[0].data[aaplChartData.datasets[0].data.length - 1] - aaplChartData.datasets[0].firstValue) / aaplChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((aaplChartData.datasets[0].data[aaplChartData.datasets[0].data.length - 1] - aaplChartData.datasets[0].firstValue) / aaplChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((aaplChartData.datasets[0].data[aaplChartData.datasets[0].data.length - 1] - aaplChartData.datasets[0].firstValue) / aaplChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* Microsoft */}
                      {msftChartData && msftChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Microsoft</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">MSFT</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${msftChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${msftChartData.datasets[0].data[msftChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((msftChartData.datasets[0].data[msftChartData.datasets[0].data.length - 1] - msftChartData.datasets[0].firstValue) / msftChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((msftChartData.datasets[0].data[msftChartData.datasets[0].data.length - 1] - msftChartData.datasets[0].firstValue) / msftChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((msftChartData.datasets[0].data[msftChartData.datasets[0].data.length - 1] - msftChartData.datasets[0].firstValue) / msftChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* Alphabet */}
                      {googChartData && googChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Alphabet</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">GOOG</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${googChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${googChartData.datasets[0].data[googChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((googChartData.datasets[0].data[googChartData.datasets[0].data.length - 1] - googChartData.datasets[0].firstValue) / googChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((googChartData.datasets[0].data[googChartData.datasets[0].data.length - 1] - googChartData.datasets[0].firstValue) / googChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((googChartData.datasets[0].data[googChartData.datasets[0].data.length - 1] - googChartData.datasets[0].firstValue) / googChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* Amazon */}
                      {amznChartData && amznChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Amazon</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">AMZN</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${amznChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${amznChartData.datasets[0].data[amznChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((amznChartData.datasets[0].data[amznChartData.datasets[0].data.length - 1] - amznChartData.datasets[0].firstValue) / amznChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((amznChartData.datasets[0].data[amznChartData.datasets[0].data.length - 1] - amznChartData.datasets[0].firstValue) / amznChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((amznChartData.datasets[0].data[amznChartData.datasets[0].data.length - 1] - amznChartData.datasets[0].firstValue) / amznChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* NVIDIA */}
                      {nvdaChartData && nvdaChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">NVIDIA</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">NVDA</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${nvdaChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${nvdaChartData.datasets[0].data[nvdaChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((nvdaChartData.datasets[0].data[nvdaChartData.datasets[0].data.length - 1] - nvdaChartData.datasets[0].firstValue) / nvdaChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((nvdaChartData.datasets[0].data[nvdaChartData.datasets[0].data.length - 1] - nvdaChartData.datasets[0].firstValue) / nvdaChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((nvdaChartData.datasets[0].data[nvdaChartData.datasets[0].data.length - 1] - nvdaChartData.datasets[0].firstValue) / nvdaChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* Meta */}
                      {metaChartData && metaChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Meta</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">META</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${metaChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${metaChartData.datasets[0].data[metaChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((metaChartData.datasets[0].data[metaChartData.datasets[0].data.length - 1] - metaChartData.datasets[0].firstValue) / metaChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((metaChartData.datasets[0].data[metaChartData.datasets[0].data.length - 1] - metaChartData.datasets[0].firstValue) / metaChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((metaChartData.datasets[0].data[metaChartData.datasets[0].data.length - 1] - metaChartData.datasets[0].firstValue) / metaChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      {/* Tesla */}
                      {tslaChartData && tslaChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Tesla</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">TSLA</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${tslaChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${tslaChartData.datasets[0].data[tslaChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((tslaChartData.datasets[0].data[tslaChartData.datasets[0].data.length - 1] - tslaChartData.datasets[0].firstValue) / tslaChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((tslaChartData.datasets[0].data[tslaChartData.datasets[0].data.length - 1] - tslaChartData.datasets[0].firstValue) / tslaChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((tslaChartData.datasets[0].data[tslaChartData.datasets[0].data.length - 1] - tslaChartData.datasets[0].firstValue) / tslaChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      
                      {/* Separator Row */}
                      <tr className="bg-gray-100">
                        <td colSpan={5} className="px-6 py-2 text-center text-sm font-semibold text-gray-700">FANG+ ETFs</td>
                      </tr>
                      
                      {/* FANG 1x */}
                      {fngChartData && fngChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">FANG</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">1x</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${fngChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${fngChartData.datasets[0].data[fngChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((fngChartData.datasets[0].data[fngChartData.datasets[0].data.length - 1] - fngChartData.datasets[0].firstValue) / fngChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((fngChartData.datasets[0].data[fngChartData.datasets[0].data.length - 1] - fngChartData.datasets[0].firstValue) / fngChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((fngChartData.datasets[0].data[fngChartData.datasets[0].data.length - 1] - fngChartData.datasets[0].firstValue) / fngChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      
                      {/* FNGU 3x */}
                      {fnguChartData && fnguChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">FNGU</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">3x</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${fnguChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${fnguChartData.datasets[0].data[fnguChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((fnguChartData.datasets[0].data[fnguChartData.datasets[0].data.length - 1] - fnguChartData.datasets[0].firstValue) / fnguChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((fnguChartData.datasets[0].data[fnguChartData.datasets[0].data.length - 1] - fnguChartData.datasets[0].firstValue) / fnguChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((fnguChartData.datasets[0].data[fnguChartData.datasets[0].data.length - 1] - fnguChartData.datasets[0].firstValue) / fnguChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      
                      {/* FNGD -3x */}
                      {fngdChartData && fngdChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">FNGD</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">-3x</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${fngdChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${fngdChartData.datasets[0].data[fngdChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((fngdChartData.datasets[0].data[fngdChartData.datasets[0].data.length - 1] - fngdChartData.datasets[0].firstValue) / fngdChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((fngdChartData.datasets[0].data[fngdChartData.datasets[0].data.length - 1] - fngdChartData.datasets[0].firstValue) / fngdChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((fngdChartData.datasets[0].data[fngdChartData.datasets[0].data.length - 1] - fngdChartData.datasets[0].firstValue) / fngdChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      
                      {/* Separator Row */}
                      <tr className="bg-gray-100">
                        <td colSpan={5} className="px-6 py-2 text-center text-sm font-semibold text-gray-700">MAG7 ETFs</td>
                      </tr>
                      
                      {/* MAGS 1x */}
                      {magsChartData && magsChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">MAGS</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">1x</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${magsChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${magsChartData.datasets[0].data[magsChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((magsChartData.datasets[0].data[magsChartData.datasets[0].data.length - 1] - magsChartData.datasets[0].firstValue) / magsChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((magsChartData.datasets[0].data[magsChartData.datasets[0].data.length - 1] - magsChartData.datasets[0].firstValue) / magsChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((magsChartData.datasets[0].data[magsChartData.datasets[0].data.length - 1] - magsChartData.datasets[0].firstValue) / magsChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                      
                      {/* MAGX 2x */}
                      {magxChartData && magxChartData.datasets[0].data.length > 0 && (
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">MAGX</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">2x</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">${magxChartData.datasets[0].firstValue.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">${magxChartData.datasets[0].data[magxChartData.datasets[0].data.length - 1].toFixed(2)}</td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${((magxChartData.datasets[0].data[magxChartData.datasets[0].data.length - 1] - magxChartData.datasets[0].firstValue) / magxChartData.datasets[0].firstValue * 100) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {((magxChartData.datasets[0].data[magxChartData.datasets[0].data.length - 1] - magxChartData.datasets[0].firstValue) / magxChartData.datasets[0].firstValue * 100) >= 0 ? '+' : ''}{((magxChartData.datasets[0].data[magxChartData.datasets[0].data.length - 1] - magxChartData.datasets[0].firstValue) / magxChartData.datasets[0].firstValue * 100).toFixed(2)}%
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer language={language} />
      </div>
    </>
  );
}
