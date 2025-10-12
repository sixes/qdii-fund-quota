import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Pagination from '@mui/material/Pagination';
import Script from 'next/script';
import { Analytics } from '@vercel/analytics/react';
import Navigation from '../components/Navigation';
import IndexReturnsChart from '../components/IndexReturnsChart';

function DowPage() {
  const router = useRouter();
  const view = (router.query.view as string) || 'constituents';
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<string>('no');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const ITEMS_PER_PAGE = 20;

  const sortData = (arr: any[], key: string, direction: 'asc' | 'desc') => {
    if (!key) return arr;
    return [...arr].sort((a, b) => {
      let aVal: any = a[key];
      let bVal: any = b[key];
      if (typeof aVal === 'string' && !isNaN(Number(aVal))) { aVal = Number(aVal); bVal = Number(bVal); }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return direction === 'asc' ? (aVal ?? 0) - (bVal ?? 0) : (bVal ?? 0) - (aVal ?? 0);
    });
  };

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDir);
    setData(sortData(data, key, newDir));
  };

  useEffect(() => {
    if (view !== 'constituents') return;
    setLoading(true);
    fetch('/api/index-constituents?index=dow')
      .then(r => r.json())
      .then(json => Array.isArray(json) ? sortData(json, sortKey, sortDirection) : [])
      .then(sorted => setData(sorted))
      .finally(() => setLoading(false));
  }, [view]);

  useEffect(() => { setPage(1); }, [data.length, view]);

  const paged = data.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);

  return (
    <>
      <Head>
        <title>Dow Jones Industrial Average - 30 Constituents & Historical Returns | DJIA Analysis</title>
        <meta name="description" content="View Dow Jones Industrial Average (DJIA) 30 constituents with real-time data, prices, ATH analysis, and historical returns. Track America's most established blue chip companies including Boeing, Goldman Sachs, Coca-Cola, and Disney with financial metrics." />
        <meta name="keywords" content="Dow Jones, DJIA, Dow 30, Dow Jones Industrial Average, blue chip stocks, DJI, index constituents, stock prices, historical returns, P/E ratio, market cap, ATH analysis, industrial stocks, US stock market, investment analysis, dividend stocks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Dow Jones Industrial Average - 30 Constituents & Historical Returns" />
        <meta property="og:description" content="Comprehensive Dow Jones analysis with real-time data on all 30 blue chip constituents, prices, and historical performance charts." />
        <meta property="og:type" content="website" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="canonical" href="https://yoursite.com/dow" />
      </Head>

      <Script src="https://www.googletagmanager.com/gtag/js?id=G-KYCK18CLKM" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-KYCK18CLKM');
        `}
      </Script>

            <div className="min-h-screen bg-gray-100">
        <Navigation language={language} onLanguageChange={setLanguage} />

        <main className="py-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <div className="mb-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dow Jones 30 Index Constituents</h1>
              <p className="text-gray-600 text-lg">View all Dow Jones 30 stocks with weights, last closing prices, ATH data, and key financial ratios</p>
            </div>
            {view === 'returns' ? (
              <IndexReturnsChart indexKey="dow" indexName="Dow Jones 30" />
            ) : (
              <TableContainer component={Paper} className="rounded-xl shadow bg-white overflow-x-auto">
                <Table stickyHeader size="small" sx={{ minWidth: { xs: 320, sm: 900 } }}>
                  <TableHead>
                    <TableRow className="bg-gray-100 text-gray-700">
                      <TableCell><TableSortLabel active={sortKey==='no'} direction={sortKey==='no'?sortDirection:'asc'} onClick={()=>handleSort('no')}>No.</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='symbol'} direction={sortKey==='symbol'?sortDirection:'asc'} onClick={()=>handleSort('symbol')}>Symbol</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='name'} direction={sortKey==='name'?sortDirection:'asc'} onClick={()=>handleSort('name')}>Company Name</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='ath_price'} direction={sortKey==='ath_price'?sortDirection:'desc'} onClick={()=>handleSort('ath_price')}>ATH Price</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='ath_date'} direction={sortKey==='ath_date'?sortDirection:'desc'} onClick={()=>handleSort('ath_date')}>ATH Date</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='ath_change_percent'} direction={sortKey==='ath_change_percent'?sortDirection:'asc'} onClick={()=>handleSort('ath_change_percent')}>ATH Change %</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='price'} direction={sortKey==='price'?sortDirection:'desc'} onClick={()=>handleSort('price')}>Price</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='change'} direction={sortKey==='change'?sortDirection:'desc'} onClick={()=>handleSort('change')}>Change %</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='weight'} direction={sortKey==='weight'?sortDirection:'desc'} onClick={()=>handleSort('weight')}>Weight %</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='marketCap'} direction={sortKey==='marketCap'?sortDirection:'desc'} onClick={()=>handleSort('marketCap')}>Market Cap</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='pe_ratio'} direction={sortKey==='pe_ratio'?sortDirection:'desc'} onClick={()=>handleSort('pe_ratio')}>P/E Ratio</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='forward_pe'} direction={sortKey==='forward_pe'?sortDirection:'desc'} onClick={()=>handleSort('forward_pe')}>Forward P/E</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='ps_ratio'} direction={sortKey==='ps_ratio'?sortDirection:'desc'} onClick={()=>handleSort('ps_ratio')}>P/S Ratio</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='pb_ratio'} direction={sortKey==='pb_ratio'?sortDirection:'desc'} onClick={()=>handleSort('pb_ratio')}>P/B Ratio</TableSortLabel></TableCell>
                      <TableCell><TableSortLabel active={sortKey==='eps_ttm'} direction={sortKey==='eps_ttm'?sortDirection:'desc'} onClick={()=>handleSort('eps_ttm')}>EPS TTM</TableSortLabel></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={15} align="center" className="py-8 text-gray-500">Loading...</TableCell></TableRow>
                    ) : data.length === 0 ? (
                      <TableRow><TableCell colSpan={15} align="center" className="py-8 text-gray-500">No data available</TableCell></TableRow>
                    ) : (
                      paged.map((row, i) => (
                        <TableRow key={i} className="hover:bg-gray-50 transition">
                          <TableCell>{row.no}</TableCell>
                          <TableCell>{row.symbol}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.ath_price ? `$${row.ath_price.toFixed(2)}` : '-'}</TableCell>
                          <TableCell>{row.ath_date || '-'}</TableCell>
                          <TableCell style={{ color: row.ath_change_percent && row.ath_change_percent < 0 ? 'red' : row.ath_change_percent && row.ath_change_percent >= 0 ? 'green' : undefined }}>
                            {row.ath_change_percent !== null && row.ath_change_percent !== undefined ? `${row.ath_change_percent > 0 ? '+' : ''}${row.ath_change_percent.toFixed(2)}%` : '-'}
                          </TableCell>
                          <TableCell>{row.price ? `$${row.price.toFixed(2)}` : '-'}</TableCell>
                          <TableCell style={{ color: row.change > 0 ? 'green' : row.change < 0 ? 'red' : undefined }}>{row.change ? `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}%` : '-'}</TableCell>
                          <TableCell>{row.weight ? `${row.weight.toFixed(2)}%` : '-'}</TableCell>
                          <TableCell>{row.marketCap || '-'}</TableCell>
                          <TableCell>{row.pe_ratio ? row.pe_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell>{row.forward_pe ? row.forward_pe.toFixed(2) : '-'}</TableCell>
                          <TableCell>{row.ps_ratio ? row.ps_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell>{row.pb_ratio ? row.pb_ratio.toFixed(2) : '-'}</TableCell>
                          <TableCell>{row.eps_ttm ? row.eps_ttm.toFixed(2) : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {data.length > 0 && (
                  <div className="relative flex items-center w-full py-4 px-2">
                    <div className="flex-1" />
                    {data.length > ITEMS_PER_PAGE && (
                      <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" siblingCount={0} boundaryCount={1} size="small" />
                    )}
                    <div className="flex-1 flex justify-end">
                      <span className="text-gray-500 text-xs sm:text-sm">Showing {(page-1)*ITEMS_PER_PAGE+1} to {Math.min(page*ITEMS_PER_PAGE, data.length)} of {data.length.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </TableContainer>
            )}
          </div>
        </main>
      </div>
      <Analytics />
    </>
  );
}

export default DowPage;
