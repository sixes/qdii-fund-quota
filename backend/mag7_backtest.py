#!/usr/bin/env python3
"""
Backtest strategy: Buy Mag 7 stocks when they drop 10% or 20% from ATH
Compare returns against QQQ benchmark over various time periods
"""

import yfinance as yf
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import warnings
import os
from dotenv import load_dotenv
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Mag 7 stocks
MAG7_TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
BENCHMARK = 'QQQ'

# Strategy parameters
DROP_THRESHOLD = 0.20  # Buy when stock drops 20% from ATH (change to 0.10 for 10%)
INITIAL_CAPITAL = 100000  # $100,000
POSITION_SIZE = INITIAL_CAPITAL / len(MAG7_TICKERS)  # Equal allocation per stock
HOLDING_PERIODS = [30, 90, 180, 365]  # Days: 1 month, 3 months, 6 months, 1 year

# Backtest period
START_DATE = '2020-01-01'
END_DATE = datetime.now().strftime('%Y-%m-%d')


def get_proxy_config():
    """Get proxy configuration from .env file."""
    proxy_host = os.getenv('PROXY_HOST', '127.0.0.1')
    proxy_port = os.getenv('PROXY_PORT', '51837')
    proxy_type = os.getenv('PROXY_TYPE', 'socks5')
    
    return f"{proxy_type}://{proxy_host}:{proxy_port}"


def setup_proxy(use_proxy: bool = True):
    """Setup proxy environment variables for yfinance."""
    if use_proxy:
        proxy_url = get_proxy_config()
        os.environ['HTTP_PROXY'] = proxy_url
        os.environ['HTTPS_PROXY'] = proxy_url
        print(f"✓ Using proxy: {proxy_url}")
    else:
        # Clear proxy env vars if not using proxy
        if 'HTTP_PROXY' in os.environ:
            del os.environ['HTTP_PROXY']
        if 'HTTPS_PROXY' in os.environ:
            del os.environ['HTTPS_PROXY']


def download_data(tickers: List[str], start: str, end: str, use_proxy: bool = True) -> Dict[str, pd.DataFrame]:
    """Download historical price data for given tickers"""
    print(f"Downloading data from {start} to {end}...")
    
    # Setup proxy if requested
    setup_proxy(use_proxy)
    
    data = {}
    
    all_tickers = tickers + [BENCHMARK]
    for ticker in all_tickers:
        try:
            df = yf.download(ticker, start=start, end=end, progress=False)
            if not df.empty:
                data[ticker] = df
                print(f"✓ {ticker}: {len(df)} days")
            else:
                print(f"✗ {ticker}: No data available")
        except Exception as e:
            print(f"✗ {ticker}: Error - {e}")
    
    return data


def calculate_ath(prices: pd.Series) -> pd.Series:
    """Calculate rolling all-time high (no look-ahead bias)"""
    return prices.expanding().max()


def calculate_drawdown(prices: pd.Series, ath: pd.Series) -> pd.Series:
    """Calculate percentage drawdown from ATH"""
    return (prices - ath) / ath


def backtest_strategy(data: Dict[str, pd.DataFrame], drop_threshold: float) -> pd.DataFrame:
    """
    Backtest the buy-the-dip strategy
    
    Returns: DataFrame with daily portfolio values and trade signals
    """
    # Create a combined date index
    dates = sorted(set.union(*[set(df.index) for df in data.values()]))
    results = pd.DataFrame(index=dates)
    
    # Track portfolio for each stock
    portfolio = {ticker: {'shares': 0, 'last_buy_date': None, 'last_buy_price': None} 
                 for ticker in MAG7_TICKERS}
    cash = INITIAL_CAPITAL
    
    portfolio_values = []
    trades = []
    
    for date in dates:
        daily_value = cash
        
        # Check each Mag 7 stock for buy signals
        for ticker in MAG7_TICKERS:
            if ticker not in data or date not in data[ticker].index:
                continue
            
            # Extract scalar values to avoid Series comparison issues
            current_price = float(data[ticker].loc[date, 'Close'])
            
            # Calculate ATH up to current date (no look-ahead)
            historical_prices = data[ticker].loc[:date, 'Close']
            ath = float(historical_prices.max())
            drawdown_value = (current_price - ath) / ath
            
            # Buy signal: stock dropped by threshold AND we don't already hold it
            if drawdown_value <= -drop_threshold and portfolio[ticker]['shares'] == 0 and cash >= POSITION_SIZE:
                # Buy
                shares_to_buy = POSITION_SIZE / current_price
                portfolio[ticker]['shares'] = shares_to_buy
                portfolio[ticker]['last_buy_date'] = date
                portfolio[ticker]['last_buy_price'] = current_price
                cash -= POSITION_SIZE
                
                trades.append({
                    'date': date,
                    'ticker': ticker,
                    'action': 'BUY',
                    'price': current_price,
                    'shares': shares_to_buy,
                    'ath': ath,
                    'drawdown': drawdown_value * 100
                })
                
                print(f"{date.strftime('%Y-%m-%d')}: BUY {ticker} @ ${current_price:.2f} "
                      f"(ATH: ${ath:.2f}, Drop: {drawdown_value*100:.1f}%)")
            
            # Add current value of holdings
            if portfolio[ticker]['shares'] > 0:
                daily_value += portfolio[ticker]['shares'] * current_price
        
        portfolio_values.append({
            'date': date,
            'portfolio_value': daily_value
        })
    
    results_df = pd.DataFrame(portfolio_values).set_index('date')
    trades_df = pd.DataFrame(trades)
    
    return results_df, trades_df, portfolio


def calculate_benchmark_returns(data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Calculate QQQ buy-and-hold returns"""
    qqq_data = data[BENCHMARK].copy()
    qqq_data['portfolio_value'] = INITIAL_CAPITAL * (qqq_data['Close'] / qqq_data['Close'].iloc[0])
    return qqq_data[['portfolio_value']]


def calculate_period_returns(strategy_results: pd.DataFrame, 
                            benchmark_results: pd.DataFrame,
                            trades_df: pd.DataFrame,
                            holding_periods: List[int]) -> pd.DataFrame:
    """Calculate returns for different holding periods after each trade"""
    period_returns = []
    
    for _, trade in trades_df.iterrows():
        buy_date = trade['date']
        ticker = trade['ticker']
        
        for days in holding_periods:
            sell_date = buy_date + timedelta(days=days)
            
            # Find closest available date
            future_dates = strategy_results.index[strategy_results.index >= sell_date]
            if len(future_dates) == 0:
                continue
            
            actual_sell_date = future_dates[0]
            
            # Calculate returns
            buy_value = strategy_results.loc[buy_date, 'portfolio_value']
            sell_value = strategy_results.loc[actual_sell_date, 'portfolio_value']
            strategy_return = (sell_value - buy_value) / buy_value * 100
            
            # Benchmark returns
            bench_buy = benchmark_results.loc[buy_date, 'portfolio_value']
            bench_sell = benchmark_results.loc[actual_sell_date, 'portfolio_value']
            benchmark_return = (bench_sell - bench_buy) / bench_buy * 100
            
            period_returns.append({
                'trade_date': buy_date,
                'ticker': ticker,
                'holding_period_days': days,
                'sell_date': actual_sell_date,
                'strategy_return': strategy_return,
                'benchmark_return': benchmark_return,
                'outperformance': strategy_return - benchmark_return
            })
    
    return pd.DataFrame(period_returns)


def plot_results(strategy_results: pd.DataFrame, 
                benchmark_results: pd.DataFrame,
                trades_df: pd.DataFrame,
                period_returns: pd.DataFrame):
    """Create visualization of backtest results"""
    
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle('Mag 7 Buy-the-Dip Strategy vs QQQ Benchmark', fontsize=16, fontweight='bold')
    
    # 1. Portfolio value over time
    ax1 = axes[0, 0]
    ax1.plot(strategy_results.index, strategy_results['portfolio_value'], 
             label='Mag 7 Strategy', linewidth=2, color='blue')
    ax1.plot(benchmark_results.index, benchmark_results['portfolio_value'], 
             label='QQQ Buy & Hold', linewidth=2, color='orange', alpha=0.7)
    
    # Mark buy signals
    for _, trade in trades_df.iterrows():
        ax1.axvline(x=trade['date'], color='green', alpha=0.3, linestyle='--', linewidth=0.5)
    
    ax1.set_title('Portfolio Value Over Time')
    ax1.set_xlabel('Date')
    ax1.set_ylabel('Portfolio Value ($)')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f'${x:,.0f}'))
    
    # 2. Returns by holding period
    ax2 = axes[0, 1]
    period_summary = period_returns.groupby('holding_period_days').agg({
        'strategy_return': 'mean',
        'benchmark_return': 'mean',
        'outperformance': 'mean'
    })
    
    x = np.arange(len(period_summary))
    width = 0.35
    
    ax2.bar(x - width/2, period_summary['strategy_return'], width, 
            label='Strategy', color='blue', alpha=0.8)
    ax2.bar(x + width/2, period_summary['benchmark_return'], width, 
            label='QQQ', color='orange', alpha=0.8)
    
    ax2.set_title('Average Returns by Holding Period')
    ax2.set_xlabel('Holding Period')
    ax2.set_ylabel('Average Return (%)')
    ax2.set_xticks(x)
    ax2.set_xticklabels([f'{d} days' for d in period_summary.index])
    ax2.legend()
    ax2.grid(True, alpha=0.3, axis='y')
    ax2.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    
    # 3. Number of trades per stock
    ax3 = axes[1, 0]
    trade_counts = trades_df['ticker'].value_counts().sort_values(ascending=True)
    ax3.barh(trade_counts.index, trade_counts.values, color='steelblue')
    ax3.set_title('Number of Buy Signals per Stock')
    ax3.set_xlabel('Number of Trades')
    ax3.set_ylabel('Stock')
    ax3.grid(True, alpha=0.3, axis='x')
    
    # 4. Outperformance distribution
    ax4 = axes[1, 1]
    for days in HOLDING_PERIODS:
        period_data = period_returns[period_returns['holding_period_days'] == days]
        if not period_data.empty:
            ax4.hist(period_data['outperformance'], bins=20, alpha=0.5, 
                    label=f'{days} days')
    
    ax4.set_title('Distribution of Outperformance vs QQQ')
    ax4.set_xlabel('Outperformance (%)')
    ax4.set_ylabel('Frequency')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    ax4.axvline(x=0, color='red', linestyle='--', linewidth=2)
    
    plt.tight_layout()
    
    # Save the plot
    filename = f'mag7_backtest_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"\n✓ Chart saved as: {filename}")
    
    plt.show()


def print_summary_stats(strategy_results: pd.DataFrame,
                       benchmark_results: pd.DataFrame,
                       trades_df: pd.DataFrame,
                       period_returns: pd.DataFrame):
    """Print summary statistics"""
    
    print("\n" + "="*70)
    print("BACKTEST SUMMARY")
    print("="*70)
    
    # Overall performance
    strategy_total_return = (strategy_results['portfolio_value'].iloc[-1] / INITIAL_CAPITAL - 1) * 100
    benchmark_total_return = (benchmark_results['portfolio_value'].iloc[-1] / INITIAL_CAPITAL - 1) * 100
    
    print(f"\nInitial Capital: ${INITIAL_CAPITAL:,.0f}")
    print(f"Backtest Period: {START_DATE} to {END_DATE}")
    print(f"Drop Threshold: {DROP_THRESHOLD*100:.0f}% from ATH")
    
    print(f"\n{'Strategy':<30} {'QQQ Benchmark':<30}")
    print(f"{'-'*70}")
    print(f"Final Value: ${strategy_results['portfolio_value'].iloc[-1]:,.2f}     "
          f"${benchmark_results['portfolio_value'].iloc[-1]:,.2f}")
    print(f"Total Return: {strategy_total_return:.2f}%     {benchmark_total_return:.2f}%")
    print(f"Outperformance: {strategy_total_return - benchmark_total_return:.2f}%")
    
    print(f"\n{'Total Trades:':<20} {len(trades_df)}")
    
    # Period returns
    print(f"\n{'Holding Period':<20} {'Avg Strategy Return':<25} {'Avg QQQ Return':<25} {'Outperformance':<20}")
    print(f"{'-'*90}")
    
    for days in HOLDING_PERIODS:
        period_data = period_returns[period_returns['holding_period_days'] == days]
        if not period_data.empty:
            avg_strategy = period_data['strategy_return'].mean()
            avg_benchmark = period_data['benchmark_return'].mean()
            avg_outperf = period_data['outperformance'].mean()
            
            print(f"{days} days{'':<14} {avg_strategy:>8.2f}%{'':<15} {avg_benchmark:>8.2f}%{'':<15} {avg_outperf:>8.2f}%")
    
    # Win rate
    print(f"\nWin Rate (Strategy > QQQ):")
    for days in HOLDING_PERIODS:
        period_data = period_returns[period_returns['holding_period_days'] == days]
        if not period_data.empty:
            win_rate = (period_data['outperformance'] > 0).sum() / len(period_data) * 100
            print(f"  {days} days: {win_rate:.1f}%")
    
    print("\n" + "="*70)


def main(use_proxy: bool = True):
    """Main execution function"""
    print("="*70)
    print("MAG 7 BUY-THE-DIP BACKTEST")
    print("="*70)
    print(f"\nStrategy: Buy when stock drops {DROP_THRESHOLD*100:.0f}% from ATH")
    print(f"Stocks: {', '.join(MAG7_TICKERS)}")
    print(f"Benchmark: {BENCHMARK}")
    
    # Download data
    data = download_data(MAG7_TICKERS, START_DATE, END_DATE, use_proxy=use_proxy)
    
    if BENCHMARK not in data:
        print(f"\nError: Could not download {BENCHMARK} data")
        return
    
    # Run backtest
    print(f"\nRunning backtest...")
    strategy_results, trades_df, portfolio = backtest_strategy(data, DROP_THRESHOLD)
    
    # Calculate benchmark
    print(f"Calculating benchmark returns...")
    benchmark_results = calculate_benchmark_returns(data)
    
    # Align indices
    common_dates = strategy_results.index.intersection(benchmark_results.index)
    strategy_results = strategy_results.loc[common_dates]
    benchmark_results = benchmark_results.loc[common_dates]
    
    # Calculate period returns
    print(f"Analyzing holding period returns...")
    period_returns = calculate_period_returns(strategy_results, benchmark_results, 
                                              trades_df, HOLDING_PERIODS)
    
    # Print summary
    print_summary_stats(strategy_results, benchmark_results, trades_df, period_returns)
    
    # Plot results
    print(f"\nGenerating charts...")
    plot_results(strategy_results, benchmark_results, trades_df, period_returns)
    
    print("\n✓ Backtest complete!")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Backtest Mag 7 buy-the-dip strategy vs QQQ")
    parser.add_argument('--no-proxy', action='store_true', help='Disable proxy for data fetching')
    
    args = parser.parse_args()
    
    main(use_proxy=not args.no_proxy)
