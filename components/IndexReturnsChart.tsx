import React, { useEffect, useRef, useState } from 'react';

interface YearlyReturn {
  return: number;
  start_price: number;
  end_price: number;
  start_date: string;
  end_date: string;
}

interface MonthlyData {
  date: string;
  year: number;
  month: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  index: string;
  name: string;
  ticker: string;
  last_updated: string;
  total_months: number;
  yearly_returns: Record<string, YearlyReturn>;
  monthly_data: MonthlyData[];
}

interface IndexReturnsChartProps {
  indexKey: string;
  indexName: string;
}

type Period = '1y' | '3y' | '5y' | '10y' | 'max';

const IndexReturnsChart: React.FC<IndexReturnsChartProps> = ({ indexKey, indexName }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [tvLoaded, setTvLoaded] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const candidateIdxRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const selectedPeriod: Period = 'max';

  const log = (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log(`[TV][${indexKey}][${selectedPeriod}]`, ...args);
  };

  // Correct TradingView symbols (verified)
  const getTvSymbol = (key: string): string => {
    switch (key) {
      case 'nasdaq100':
        return 'NASDAQ:NDX';
      case 'sp500':
        return 'FRED:SP500';
      case 'dow':
        return 'FRED:DJIA';
      default:
        return 'NASDAQ:NDX';
    }
  };

  const timeframeMap: Record<Period, string> = {
    '1y': '12M',
    '3y': '36M',
    '5y': '60M',
    '10y': '120M',
    'max': 'all',
  };

  const getContainerSize = () => {
    const el = chartContainerRef.current;
    if (!el) return { w: 0, h: 0 };
    const rect = el.getBoundingClientRect();
    return { w: Math.round(rect.width), h: Math.round(rect.height) };
  };

  // Load TradingView script once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).TradingView) {
      log('tv.js already loaded');
      setTvLoaded(true);
      return;
    }
    log('Injecting tv.js script...');
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      log('tv.js loaded');
      setTvLoaded(true);
    };
    script.onerror = (e) => {
      log('tv.js failed to load', e);
      setTvLoaded(false);
    };
    document.body.appendChild(script);
    // keep script in DOM for reuse
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create/refresh TradingView widget with robust retries
  useEffect(() => {
    const tv = (window as any).TradingView;

    const clearRetry = () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const schedule = (ms: number, nextAttempt: number) => {
      clearRetry();
      retryTimerRef.current = window.setTimeout(() => {
        attemptRef.current = nextAttempt;
        tryInit();
      }, ms);
    };

    const tryInit = () => {
      if (!tvLoaded) {
        log('TV not loaded yet, delaying init');
        return; // outer effect will run again when tvLoaded flips
      }
      if (!chartContainerRef.current) {
        log('Container ref missing, retrying in 150ms...');
        schedule(150, attemptRef.current + 1);
        return;
      }
      if (!tv || !tv.widget) {
        log('TradingView.widget not available yet, retrying in 200ms...');
        schedule(200, attemptRef.current + 1);
        return;
      }

      const { w, h } = getContainerSize();
      log(`Init attempt #${attemptRef.current} | container ${w}x${h}`);
      if (w === 0 || h === 0) {
        log('Zero-sized container, retrying in 250ms...');
        schedule(250, attemptRef.current + 1);
        return;
      }

      // Clear previous widget content
      chartContainerRef.current.innerHTML = '';
      const containerId = `tvchart-${indexKey}`;
      chartContainerRef.current.id = containerId;

      const symbol = getTvSymbol(indexKey);
      const timeframe = timeframeMap[selectedPeriod];
      log('Creating widget', { symbol, timeframe });

      try {
        const widget = new tv.widget({
          container_id: containerId,
          symbol: symbol,
          interval: 'D',
          timeframe,
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          withdateranges: true,
          hide_side_toolbar: false,
          allow_symbol_change: false,
          details: true,
          studies: [],
          autosize: true,
          height: 500,
          width: '100%',
        });

        if (widget.onChartReady) {
          widget.onChartReady(() => {
            log('onChartReady fired - chart loaded successfully');
          });
        }

        // Just verify iframe exists
        window.setTimeout(() => {
          const iframe = chartContainerRef.current?.querySelector('iframe');
          if (iframe) {
            log('Widget iframe detected, init complete');
          } else {
            log('No iframe detected after timeout');
          }
        }, 1000);
      } catch (e) {
        log('Widget init error', e);
      }
    };

    // Kick off
    attemptRef.current = 1;
    candidateIdxRef.current = 0;
    tryInit();

    const onResize = () => {
      const { w, h } = getContainerSize();
      log('Resize detected', { w, h });
      if (w > 0 && h > 0) {
        // Recreate to fit new container
        tryInit();
      }
    };

    const onVisibility = () => {
      log('visibilitychange:', document.visibilityState);
      if (document.visibilityState === 'visible') {
        tryInit();
      }
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearRetry();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tvLoaded, indexKey, selectedPeriod]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/index-history?index=${indexKey}&period=${selectedPeriod}`);
        
        if (!response.ok) {
          throw new Error('Failed to load data');
        }

        const data: ChartData = await response.json();
        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indexKey, selectedPeriod]);

  // Remove lightweight-charts cleanup
  useEffect(() => {
    return () => {
      if (chartContainerRef.current) {
        chartContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="w-full">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{indexName} Historical Returns</h2>
          {chartData && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(chartData.last_updated).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            {loading && (
              <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading chart data...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="h-[500px] flex items-center justify-center bg-red-50 rounded-lg">
                <div className="text-center text-red-600">
                  <p className="text-lg font-semibold mb-2">Error Loading Data</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {!loading && !error && (
              <div ref={chartContainerRef} className="w-full" style={{ height: 500 }} />
            )}
          </div>

          {/* Yearly returns sidebar */}
          {chartData && chartData.yearly_returns && (
            <div className="lg:w-64 bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Yearly Returns</h3>
              <div className="space-y-2 max-h-[468px] overflow-y-auto">
                {Object.entries(chartData.yearly_returns)
                  .sort(([yearA], [yearB]) => parseInt(yearB) - parseInt(yearA))
                  .map(([year, data]) => (
                    <div
                      key={year}
                      className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm"
                    >
                      <span className="font-medium text-gray-700">{year}</span>
                      <span
                        className={`font-bold ${
                          data.return >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {data.return >= 0 ? '+' : ''}
                        {data.return.toFixed(2)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary statistics */}
        {chartData && chartData.yearly_returns && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-600 font-medium">Total Data Points</p>
              <p className="text-2xl font-bold text-blue-900">{chartData.total_months}</p>
              <p className="text-xs text-blue-600 mt-1">Monthly candles</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600 font-medium">Positive Years</p>
              <p className="text-2xl font-bold text-green-900">
                {Object.values(chartData.yearly_returns).filter((y) => y.return >= 0).length}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Out of {Object.keys(chartData.yearly_returns).length} years
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm text-purple-600 font-medium">Average Return</p>
              <p className="text-2xl font-bold text-purple-900">
                {(
                  Object.values(chartData.yearly_returns).reduce((sum, y) => sum + y.return, 0) /
                  Object.keys(chartData.yearly_returns).length
                ).toFixed(2)}
                %
              </p>
              <p className="text-xs text-purple-600 mt-1">Per year</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexReturnsChart;
