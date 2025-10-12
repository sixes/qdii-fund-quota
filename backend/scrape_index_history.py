#!/usr/bin/env python3
"""
Scrape historical index data from Yahoo Finance and calculate yearly returns.

Usage:
    python scrape_index_history.py max [--proxy]              # Fetch all historical data
    python scrape_index_history.py 2025-01 [--proxy]          # Fetch specific month
    python scrape_index_history.py latest [--proxy]           # Fetch latest month only

Arguments:
    --proxy     Use proxy for Yahoo Finance requests (useful in China)

Dependencies:
    pip install yfinance pandas python-dotenv
    pip install PySocks  # Required for SOCKS5 proxy support

Environment Variables (.env file):
    PROXY_HOST=127.0.0.1
    PROXY_PORT=51837
    PROXY_TYPE=socks5  # Options: socks5, http, https
"""

import sys
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
import yfinance as yf
import pandas as pd
from dotenv import load_dotenv


# Index configurations
INDICES = {
    'nasdaq100': {
        'ticker': '^NDX',
        'name': 'Nasdaq 100'
    },
    'sp500': {
        'ticker': '^GSPC',
        'name': 'S&P 500'
    },
    'dow': {
        'ticker': '^DJI',
        'name': 'Dow Jones Industrial Average'
    }
}

# Output directory
SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR / 'data' / 'index_history'
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables from backend .env file
load_dotenv(SCRIPT_DIR / '.env')

# Build proxy configuration from environment variables
PROXY_HOST = os.getenv('PROXY_HOST', '127.0.0.1')
PROXY_PORT = os.getenv('PROXY_PORT', '7890')
PROXY_TYPE = os.getenv('PROXY_TYPE', 'http')

# Construct proxy URLs
if PROXY_TYPE.lower() == 'socks5':
    proxy_url = f'socks5://{PROXY_HOST}:{PROXY_PORT}'
elif PROXY_TYPE.lower() == 'http' or PROXY_TYPE.lower() == 'https':
    proxy_url = f'http://{PROXY_HOST}:{PROXY_PORT}'
else:
    proxy_url = f'{PROXY_TYPE}://{PROXY_HOST}:{PROXY_PORT}'

PROXY_CONFIG = {
    'http': proxy_url,
    'https': proxy_url
}


def fetch_index_data(ticker, start_date=None, end_date=None, use_proxy=False):
    """
    Fetch historical index data from Yahoo Finance.
    
    Args:
        ticker: Yahoo Finance ticker symbol
        start_date: Start date (YYYY-MM-DD) or None for max history
        end_date: End date (YYYY-MM-DD) or None for today
        use_proxy: Whether to use proxy for requests
    
    Returns:
        pandas DataFrame with OHLCV data
    """
    try:
        # Configure proxy if needed (same approach as fetch_us_index_constituents.py)
        if use_proxy:
            proxy_url = f"{PROXY_TYPE}://{PROXY_HOST}:{PROXY_PORT}"
            print(f"Using proxy: {proxy_url}")
            os.environ['HTTP_PROXY'] = proxy_url
            os.environ['HTTPS_PROXY'] = proxy_url
        
        if start_date is None:
            # Fetch max history
            print(f"Fetching maximum historical data for {ticker}...")
            data = yf.download(ticker, period='max', interval='1mo', progress=False, 
                             auto_adjust=False, ignore_tz=True)
        else:
            # Fetch specific date range
            print(f"Fetching data for {ticker} from {start_date} to {end_date}...")
            data = yf.download(ticker, start=start_date, end=end_date, interval='1mo', 
                             progress=False, auto_adjust=False, ignore_tz=True)
        
        if data.empty:
            print(f"Warning: No data returned for {ticker}")
            return None
        
        print(f"✓ Fetched {len(data)} data points for {ticker}")
        
        # Clean up proxy environment variables
        if use_proxy:
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        return data
    
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        
        # Clean up proxy environment variables on error
        if use_proxy:
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        return None


def calculate_yearly_returns(df):
    """
    Calculate yearly returns from monthly data.
    
    Args:
        df: pandas DataFrame with monthly OHLCV data
    
    Returns:
        dict with yearly return percentages
    """
    if df is None or df.empty:
        return {}
    
    yearly_returns = {}
    
    # Create a copy to avoid modifying original
    df_copy = df.copy()
    
    # Handle multi-index columns if present
    if isinstance(df_copy.columns, pd.MultiIndex):
        df_copy.columns = df_copy.columns.get_level_values(0)
    
    # Group by year
    df_copy['Year'] = df_copy.index.year
    
    for year in df_copy['Year'].unique():
        year_data = df_copy[df_copy['Year'] == year]
        
        if len(year_data) < 2:
            continue
        
        # Get first and last closing price of the year
        first_close = float(year_data['Close'].iloc[0])
        last_close = float(year_data['Close'].iloc[-1])
        
        # Calculate return percentage
        year_return = ((last_close - first_close) / first_close) * 100
        
        yearly_returns[str(year)] = {
            'return': round(year_return, 2),
            'start_price': round(first_close, 2),
            'end_price': round(last_close, 2),
            'start_date': year_data.index[0].strftime('%Y-%m-%d'),
            'end_date': year_data.index[-1].strftime('%Y-%m-%d')
        }
    
    return yearly_returns


def process_data_for_json(df):
    """
    Convert DataFrame to JSON-serializable format.
    
    Args:
        df: pandas DataFrame with OHLCV data
    
    Returns:
        list of dicts with monthly data
    """
    if df is None or df.empty:
        return []
    
    monthly_data = []
    
    for date, row in df.iterrows():
        # Handle potential multi-index columns from yfinance
        if isinstance(row['Open'], pd.Series):
            open_val = row['Open'].iloc[0]
            high_val = row['High'].iloc[0]
            low_val = row['Low'].iloc[0]
            close_val = row['Close'].iloc[0]
            volume_val = row['Volume'].iloc[0]
        else:
            open_val = row['Open']
            high_val = row['High']
            low_val = row['Low']
            close_val = row['Close']
            volume_val = row['Volume']
        
        monthly_data.append({
            'date': date.strftime('%Y-%m-%d'),
            'year': date.year,
            'month': date.month,
            'open': round(float(open_val), 2) if pd.notna(open_val) else 0,
            'high': round(float(high_val), 2) if pd.notna(high_val) else 0,
            'low': round(float(low_val), 2) if pd.notna(low_val) else 0,
            'close': round(float(close_val), 2) if pd.notna(close_val) else 0,
            'volume': int(volume_val) if pd.notna(volume_val) else 0
        })
    
    return monthly_data


def save_to_json(index_key, data, yearly_returns):
    """
    Save index data and yearly returns to JSON file.
    
    Args:
        index_key: Index identifier (e.g., 'nasdaq100')
        data: List of monthly data dicts
        yearly_returns: Dict of yearly returns
    """
    output = {
        'index': index_key,
        'name': INDICES[index_key]['name'],
        'ticker': INDICES[index_key]['ticker'],
        'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'total_months': len(data),
        'yearly_returns': yearly_returns,
        'monthly_data': data
    }
    
    output_file = DATA_DIR / f'{index_key}_history.json'
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Saved data to {output_file}")


def update_existing_data(index_key, new_data):
    """
    Update existing JSON file with new monthly data.
    
    Args:
        index_key: Index identifier
        new_data: pandas DataFrame with new data
    """
    output_file = DATA_DIR / f'{index_key}_history.json'
    
    if not output_file.exists():
        print(f"No existing data found for {index_key}. Creating new file...")
        return False
    
    # Load existing data
    with open(output_file, 'r', encoding='utf-8') as f:
        existing = json.load(f)
    
    # Get existing dates
    existing_dates = {item['date'] for item in existing['monthly_data']}
    
    # Process new data
    new_monthly = process_data_for_json(new_data)
    
    # Add only new entries
    added_count = 0
    for entry in new_monthly:
        if entry['date'] not in existing_dates:
            existing['monthly_data'].append(entry)
            added_count += 1
    
    if added_count == 0:
        print(f"No new data to add for {index_key}")
        return True
    
    # Sort by date
    existing['monthly_data'].sort(key=lambda x: x['date'])
    
    # Recalculate yearly returns with updated data
    df_for_returns = pd.DataFrame(existing['monthly_data'])
    df_for_returns['date'] = pd.to_datetime(df_for_returns['date'])
    df_for_returns.set_index('date', inplace=True)
    
    existing['yearly_returns'] = calculate_yearly_returns(df_for_returns)
    existing['last_updated'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    existing['total_months'] = len(existing['monthly_data'])
    
    # Save updated data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Updated {output_file} with {added_count} new entries")
    return True


def main():
    """Main execution function."""
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scrape_index_history.py max [--proxy]              # Fetch all historical data")
        print("  python scrape_index_history.py 2025-01 [--proxy]          # Fetch specific month")
        print("  python scrape_index_history.py latest [--proxy]           # Fetch latest month only")
        print("\nArguments:")
        print("  --proxy     Use proxy for Yahoo Finance requests (useful in China)")
        sys.exit(1)
    
    mode = sys.argv[1].lower()
    use_proxy = '--proxy' in sys.argv
    
    print(f"\n{'='*60}")
    print(f"Index History Scraper")
    print(f"{'='*60}")
    if use_proxy:
        print(f"Proxy enabled: {PROXY_TYPE}://{PROXY_HOST}:{PROXY_PORT}")
    print()
    
    # Determine date range
    if mode == 'max':
        print("Mode: Fetching maximum historical data\n")
        start_date = None
        end_date = None
        update_mode = False
    elif mode == 'latest':
        print("Mode: Fetching latest month only\n")
        # Get first day of current month
        today = datetime.now()
        start_date = today.replace(day=1).strftime('%Y-%m-%d')
        end_date = None
        update_mode = True
    else:
        # Assume it's a specific month in format YYYY-MM
        try:
            year, month = map(int, mode.split('-'))
            start_date = f"{year}-{month:02d}-01"
            
            # Calculate end date (last day of the month)
            if month == 12:
                next_month = datetime(year + 1, 1, 1)
            else:
                next_month = datetime(year, month + 1, 1)
            
            end_date = (next_month - timedelta(days=1)).strftime('%Y-%m-%d')
            
            print(f"Mode: Fetching data for {year}-{month:02d}\n")
            update_mode = True
        
        except ValueError:
            print(f"Error: Invalid month format '{mode}'. Use YYYY-MM (e.g., 2025-01)")
            sys.exit(1)
    
    # Process each index
    for index_key, index_info in INDICES.items():
        print(f"\nProcessing {index_info['name']} ({index_info['ticker']})...")
        print("-" * 60)
        
        # Fetch data
        df = fetch_index_data(index_info['ticker'], start_date, end_date, use_proxy)
        
        if df is None or df.empty:
            print(f"✗ Failed to fetch data for {index_key}")
            continue
        
        # Update or create JSON file
        if update_mode:
            success = update_existing_data(index_key, df)
            if not success:
                # If update failed, create new file
                monthly_data = process_data_for_json(df)
                yearly_returns = calculate_yearly_returns(df)
                save_to_json(index_key, monthly_data, yearly_returns)
        else:
            # Full fetch mode
            monthly_data = process_data_for_json(df)
            yearly_returns = calculate_yearly_returns(df)
            save_to_json(index_key, monthly_data, yearly_returns)
        
        print(f"✓ Completed {index_key}")
    
    print(f"\n{'='*60}")
    print("✓ All indices processed successfully!")
    print(f"Data saved to: {DATA_DIR}")
    print(f"{'='*60}\n")


if __name__ == '__main__':
    main()
