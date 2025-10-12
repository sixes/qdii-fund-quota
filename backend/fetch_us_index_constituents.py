import re
import json
import os
import logging
from datetime import datetime
import time
import yfinance as yf
from dotenv import load_dotenv
import argparse
import urllib.request
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
import requests
from bs4 import BeautifulSoup
import random

# Configuration for all indices
INDICES = {
    "sp500": {
        "slickcharts_url": "https://www.slickcharts.com/sp500",
        "stockanalysis_url": "https://stockanalysis.com/list/sp-500-stocks/",
        "expected_count": 503,
        "slickcharts_filename": "data/sp500_slickcharts.json",
        "stockanalysis_filename": "data/sp500_stockanalysis.json",
        "name": "S&P 500"
    },
    "nasdaq100": {
        "slickcharts_url": "https://www.slickcharts.com/nasdaq100",
        "stockanalysis_url": "https://stockanalysis.com/list/nasdaq-100-stocks/",
        "expected_count": 101,
        "slickcharts_filename": "data/nasdaq100_slickcharts.json",
        "stockanalysis_filename": "data/nasdaq100_stockanalysis.json",
        "name": "Nasdaq 100"
    },
    "dow": {
        "slickcharts_url": "https://www.slickcharts.com/dowjones",
        "stockanalysis_url": "https://stockanalysis.com/list/dow-jones-stocks/",
        "expected_count": 30,
        "slickcharts_filename": "data/dow_slickcharts.json",
        "stockanalysis_filename": "data/dow_stockanalysis.json",
        "name": "Dow Jones"
    }
}

def send_health_check(success=True):
    """Send health check ping to healthchecks.io with success/fail status"""
    try:
        base_url = "https://hc-ping.com/ecc699d2-c5bf-4fe4-b2f6-42b022bbd8cc"
        url = base_url if success else f"{base_url}/fail"
        urllib.request.urlopen(url, timeout=10)
        status = "success" if success else "failure"
        logging.info(f"Health check ping sent successfully ({status})")
    except Exception as e:
        logging.warning(f"Failed to send health check ping: {e}")

def ensure_data_folder():
    """Ensure the data folder exists"""
    data_folder = os.path.join(os.path.dirname(__file__), "data")
    if not os.path.exists(data_folder):
        os.makedirs(data_folder)
        logging.info(f"Created data folder: {data_folder}")
    return data_folder

def create_dynamodb_table():
    """Create DynamoDB table for index constituents if it doesn't exist"""
    try:
        dynamodb = boto3.resource('dynamodb')
        table_name = 'index-constituents'
        
        # Check if table exists
        try:
            table = dynamodb.Table(table_name)
            table.load()
            logging.info(f"DynamoDB table '{table_name}' already exists")
            return table
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceNotFoundException':
                raise
        
        # Create table
        logging.info(f"Creating DynamoDB table '{table_name}'...")
        table = dynamodb.create_table(
            TableName=table_name,
            KeySchema=[
                {
                    'AttributeName': 'pk',  # Partition key: INDEX#<index_name>
                    'KeyType': 'HASH'
                },
                {
                    'AttributeName': 'sk',  # Sort key: SYMBOL#<symbol>
                    'KeyType': 'RANGE'
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'pk',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'sk',
                    'AttributeType': 'S'
                }
            ],
            BillingMode='PAY_PER_REQUEST',
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'symbol-index',
                    'KeySchema': [
                        {
                            'AttributeName': 'sk',  # GSI partition key: SYMBOL#<symbol>
                            'KeyType': 'HASH'
                        },
                        {
                            'AttributeName': 'pk',  # GSI sort key: INDEX#<index_name>
                            'KeyType': 'RANGE'
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'
                    }
                }
            ]
        )
        
        # Wait for table to be created
        table.wait_until_exists()
        logging.info(f"DynamoDB table '{table_name}' created successfully")
        return table
        
    except Exception as e:
        logging.error(f"Failed to create/access DynamoDB table: {e}")
        return None

def save_to_dynamodb(table, index_name, constituents_data):
    """Save constituents data to DynamoDB"""
    if not table or not constituents_data:
        return 0
    
    try:
        saved_count = 0
        
        # Use batch writer for efficient bulk operations
        with table.batch_writer() as batch:
            for constituent in constituents_data:
                if not constituent.get('symbol'):
                    continue
                
                item = {
                    'pk': f"INDEX#{index_name.upper()}",
                    'sk': f"SYMBOL#{constituent['symbol']}",
                    'index_name': index_name.upper(),
                    'symbol': constituent['symbol'],
                    'name': constituent.get('name', ''),
                    'no': constituent.get('no', 0),
                    'weight': Decimal(str(constituent.get('weight', 0.0))),
                    'price': Decimal(str(constituent.get('price', 0.0))),
                    'change': Decimal(str(constituent.get('change', 0.0))),
                    'market_cap': constituent.get('marketCap', ''),
                    'ath_price': Decimal(str(constituent['ath_price'])) if constituent.get('ath_price') is not None else None,
                    'ath_date': constituent.get('ath_date'),
                    'ath_change_percent': Decimal(str(constituent['ath_change_percent'])) if constituent.get('ath_change_percent') is not None else None,
                    'pe_ratio': Decimal(str(constituent['pe_ratio'])) if constituent.get('pe_ratio') is not None else None,
                    'eps_ttm': Decimal(str(constituent['eps_ttm'])) if constituent.get('eps_ttm') is not None else None,
                    'ps_ratio': Decimal(str(constituent['ps_ratio'])) if constituent.get('ps_ratio') is not None else None,
                    'pb_ratio': Decimal(str(constituent['pb_ratio'])) if constituent.get('pb_ratio') is not None else None,
                    'forward_pe': Decimal(str(constituent['forward_pe'])) if constituent.get('forward_pe') is not None else None,
                    'last_updated': datetime.now().isoformat(),
                }
                
                # Remove None values
                item = {k: v for k, v in item.items() if v is not None}
                
                batch.put_item(Item=item)
                saved_count += 1
        
        logging.info(f"Saved {saved_count} {index_name} constituents to DynamoDB")
        return saved_count
        
    except Exception as e:
        logging.error(f"Failed to save {index_name} data to DynamoDB: {e}")
        return 0



def fetch_slickcharts_data(url, index_name, max_retries=3):
    """Fetch data from SlickCharts using HTTP requests."""
    logging.info(f"Fetching {index_name} data from SlickCharts: {url}")
    
    for attempt in range(max_retries):
        try:
            start_time = datetime.now()
            
            session = create_http_session_fallback()
            time.sleep(2)  # Respectful delay
            
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            logging.info(f"SlickCharts HTTP response: {response.status_code}")
            
            # Parse HTML content
            html_content = response.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Look for tables
            tables = soup.find_all('table')
            logging.info(f"Found {len(tables)} tables in SlickCharts HTML")
            
            if not tables:
                # Try JavaScript extraction as fallback
                constituents = parse_slickcharts_javascript(html_content, index_name)
            else:
                # Parse the main data table (usually the largest one)
                main_table = max(tables, key=lambda t: len(t.find_all('tr')))
                rows = main_table.find_all('tr')
                
                constituents = []
                for idx, row in enumerate(rows[1:], 1):  # Skip header row
                    try:
                        cells = row.find_all(['td', 'th'])
                        if len(cells) < 4:
                            continue
                        
                        # Extract text from cells
                        cell_texts = [cell.get_text(strip=True) for cell in cells]
                        
                        if len(cell_texts) >= 7:
                            rank_text = cell_texts[0]
                            name_text = cell_texts[1]
                            symbol_text = cell_texts[2]
                            weight_text = cell_texts[3]
                            price_text = cell_texts[4] if len(cell_texts) > 4 else "0"
                            
                            # Parse values
                            try:
                                rank = int(re.sub(r'[^\d]', '', rank_text)) if rank_text.strip() else idx
                            except:
                                rank = idx
                            
                            try:
                                weight = float(re.sub(r'[^\d.]', '', weight_text.replace('%', '')))
                            except:
                                weight = 0
                            
                            try:
                                price = float(re.sub(r'[^\d.]', '', price_text))
                            except:
                                price = 0
                            
                            if symbol_text and name_text:
                                constituents.append({
                                    "no": rank,
                                    "symbol": symbol_text,
                                    "name": name_text,
                                    "weight": weight,
                                    "marketCap": 0,  # Will be filled from StockAnalysis
                                    "price": price,
                                    "change": 0,  # Will be calculated from yfinance data
                                    "netChange": 0
                                })
                                
                                # Log first few for verification
                                if idx <= 3:
                                    logging.info(f"SlickCharts Row {idx}: {symbol_text} - {name_text} ({weight}%)")
                        
                    except Exception as e:
                        logging.debug(f"Error parsing SlickCharts row {idx}: {e}")
                        continue
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logging.info(f"SlickCharts {index_name}: extracted {len(constituents)} companies in {elapsed:.1f}s")
            
            if constituents:
                return constituents
            
        except Exception as e:
            logging.warning(f"SlickCharts HTTP attempt {attempt + 1}/{max_retries} failed for {index_name}: {e}")
            if attempt < max_retries - 1:
                logging.info(f"Retrying SlickCharts {index_name} in 3 seconds...")
                time.sleep(3)
            else:
                logging.error(f"All {max_retries} HTTP attempts failed for SlickCharts {index_name}")
    
    return []



def parse_slickcharts_javascript(html_content, index_name):
    """Parse SlickCharts JavaScript data as fallback."""
    logging.info(f"Trying JavaScript parsing for {index_name}")
    
    # Try multiple patterns to find JavaScript data
    patterns = [
        r'window\.__sc_init_state__\s*=\s*({.*?});',
        r'__sc_init_state__\s*=\s*({.*?});',
        r'"companyList"\s*:\s*(\[.*?\])',
    ]
    
    js_data = None
    for pattern in patterns:
        match = re.search(pattern, html_content, re.DOTALL)
        if match:
            js_data = match.group(1)
            logging.info(f"Found JavaScript data for {index_name}")
            break
    
    if not js_data:
        logging.warning(f"No JavaScript data found for {index_name}")
        return []
    
    # Parse JSON data
    try:
        data = json.loads(js_data)
        company_list = (
            data.get("companyListComponent", {}).get("companyList", []) or
            data.get("companyList", []) or
            (data if isinstance(data, list) else [])
        )
        
        if not company_list:
            logging.warning(f"No company list found in JavaScript data for {index_name}")
            return []
        
        # Convert to standardized format
        constituents = []
        for idx, company in enumerate(company_list, 1):
            try:
                market_cap = company.get("marketCap", 0)
                if isinstance(market_cap, str):
                    market_cap = float(re.sub(r'[^\d.]', '', market_cap))
                
                last_price = company.get("lastPrice", "0")
                if isinstance(last_price, str):
                    last_price = float(re.sub(r'[^\d.]', '', last_price))
                
                change_percent = company.get("changePercent", "0")
                if isinstance(change_percent, str):
                    change_percent = float(re.sub(r'[^\d.-]', '', change_percent))
                
                weight_str = company.get("weight", "0%")
                weight = float(re.sub(r'[^\d.]', '', weight_str)) if weight_str else 0
                
                constituents.append({
                    "no": company.get("rank", idx),
                    "symbol": company.get("symbol", ""),
                    "name": company.get("name", ""),
                    "marketCap": int(market_cap),
                    "price": last_price,
                    "change": change_percent,
                    "weight": weight,
                    "netChange": float(company.get("netChange", 0)) if company.get("netChange") else 0
                })
            except (ValueError, TypeError) as e:
                logging.warning(f"Error parsing JavaScript company {idx} for {index_name}: {e}")
                continue
        
        logging.info(f"Successfully parsed {len(constituents)} companies from JavaScript for {index_name}")
        return constituents
        
    except json.JSONDecodeError as e:
        logging.error(f"JavaScript JSON parsing failed for {index_name}: {e}")
        return []

def fetch_stockanalysis_data(url, index_name, max_retries=3):
    """Fetch data from StockAnalysis.com using HTTP requests."""
    logging.info(f"Fetching {index_name} data from StockAnalysis: {url}")
    
    for attempt in range(max_retries):
        try:
            start_time = datetime.now()
            
            session = create_http_session_fallback()
            time.sleep(2)  # Respectful delay
            
            response = session.get(url, timeout=30)
            response.raise_for_status()
            
            logging.info(f"StockAnalysis HTTP response: {response.status_code}")
            
            # Parse HTML content
            html_content = response.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Look for tables
            tables = soup.find_all('table')
            logging.info(f"Found {len(tables)} tables in StockAnalysis HTML")
            
            if not tables:
                logging.warning(f"No tables found for StockAnalysis {index_name}")
                return []
            
            # Parse the main data table (usually the largest one)
            main_table = max(tables, key=lambda t: len(t.find_all('tr')))
            rows = main_table.find_all('tr')
            
            # Filter out header rows and empty rows
            valid_rows = []
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 6:  # Must have minimum required columns
                    # Check if first cell contains a number (indicating data row)
                    first_cell_text = cells[0].get_text(strip=True)
                    if first_cell_text and (first_cell_text.isdigit() or first_cell_text in ['1', '2', '3']):
                        valid_rows.append(row)
            
            logging.info(f"Filtered to {len(valid_rows)} valid data rows")
            
            constituents = []
            for idx, row in enumerate(valid_rows, 1):
                try:
                    cells = row.find_all(['td', 'th'])
                    if len(cells) < 6:
                        continue
                    
                    # Parse by position: id, ticker, name, market_cap, last_price, change_percent
                    no = int(cells[0].get_text(strip=True)) if cells[0].get_text(strip=True).isdigit() else idx
                    symbol = cells[1].get_text(strip=True)
                    name = cells[2].get_text(strip=True)
                    market_cap_text = cells[3].get_text(strip=True)
                    price_text = cells[4].get_text(strip=True)
                    change_text = cells[5].get_text(strip=True)
                    
                    # Keep market cap in original readable format
                    market_cap = market_cap_text if market_cap_text and market_cap_text != '-' else "N/A"
                    
                    # Parse price and change
                    try:
                        price = float(re.sub(r'[^\d.]', '', price_text)) if price_text != '-' else 0
                    except ValueError:
                        price = 0
                    
                    try:
                        change = float(re.sub(r'[^\d.-]', '', change_text)) if change_text != '-' else 0
                    except ValueError:
                        change = 0
                    
                    # Debug logging for first few rows
                    if idx <= 3:
                        logging.info(f"StockAnalysis Row {idx}: symbol='{symbol}', name='{name}', marketCap='{market_cap}', cells={len(cells)}")
                    
                    if symbol and symbol.strip():  # Ensure symbol is not empty
                        constituents.append({
                            "no": no,
                            "symbol": symbol,
                            "name": name,
                            "marketCap": market_cap,
                            "price": price,
                            "change": change,
                        })
                    else:
                        logging.warning(f"Skipping row {idx}: empty or invalid symbol '{symbol}'")
                        
                except Exception as e:
                    logging.debug(f"Error parsing StockAnalysis row {idx} for {index_name}: {e}")
                    continue
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logging.info(f"StockAnalysis {index_name}: extracted {len(constituents)} companies in {elapsed:.1f}s")
            
            return constituents
            
        except Exception as e:
            logging.warning(f"StockAnalysis HTTP attempt {attempt + 1}/{max_retries} failed for {index_name}: {e}")
            if attempt < max_retries - 1:
                logging.info(f"Retrying StockAnalysis {index_name} in 3 seconds...")
                time.sleep(3)
            else:
                logging.error(f"All {max_retries} HTTP attempts failed for StockAnalysis {index_name}")
    
    return []



def get_proxy_config():
    """Get proxy configuration from .env file."""
    load_dotenv()
    
    proxy_host = os.getenv('PROXY_HOST', '127.0.0.1')
    proxy_port = os.getenv('PROXY_PORT', '51837')
    proxy_type = os.getenv('PROXY_TYPE', 'socks5')
    
    return f"{proxy_type}://{proxy_host}:{proxy_port}"

def fetch_batch_stock_data(symbols, use_proxy=False):
    """Fetch ATH prices, current prices, daily changes, and ratios using yfinance batch API with 50-symbol batches."""
    try:
        ath_data = {}
        ratios_data = {}
        price_data = {}
        
        # Process symbols in batches for both ATH and ratios
        batch_size = 50  # Same batch size for both ATH and ratios
        total_batches = (len(symbols) + batch_size - 1) // batch_size
        
        logging.info(f"Fetching ATH, current prices, daily changes, and ratios data for {len(symbols)} symbols in {total_batches} batches of {batch_size}...")
        
        # First, fetch ATH data in batches
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(symbols))
            batch_symbols = symbols[start_idx:end_idx]
            
            logging.info(f"Processing ATH batch {batch_num + 1}/{total_batches}: {len(batch_symbols)} symbols")
            
            try:
                if use_proxy:
                    import os
                    proxy_url = get_proxy_config()
                    os.environ['HTTP_PROXY'] = proxy_url
                    os.environ['HTTPS_PROXY'] = proxy_url
                
                # Use yfinance batch download for historical data (max period for ATH)
                symbols_str = ' '.join(batch_symbols)
                hist_data = yf.download(symbols_str, period="max", group_by='ticker', auto_adjust=True, prepost=True, threads=False, timeout=30)
                
                # Also get recent 5 days for current price and daily change calculation
                recent_data = yf.download(symbols_str, period="5d", group_by='ticker', auto_adjust=True, prepost=True, threads=False, timeout=30)
                
                batch_ath_success = 0
                batch_price_success = 0
                for symbol in batch_symbols:
                    try:
                        # Extract ATH data with better handling
                        symbol_hist = None
                        symbol_recent = None
                        
                        try:
                            if len(batch_symbols) == 1:
                                # Single symbol case
                                symbol_hist = hist_data
                                symbol_recent = recent_data
                            else:
                                # Multiple symbols case - check if symbol exists in data
                                if hasattr(hist_data, 'columns') and hasattr(hist_data.columns, 'get_level_values'):
                                    if symbol in hist_data.columns.get_level_values(0):
                                        symbol_hist = hist_data[symbol]
                                        symbol_recent = recent_data[symbol]
                                elif symbol in hist_data.columns:
                                    symbol_hist = hist_data[symbol]
                                    symbol_recent = recent_data[symbol]
                        except Exception as e:
                            logging.debug(f"Error extracting hist data for {symbol}: {e}")
                            symbol_hist = None
                            symbol_recent = None
                        
                        # Process ATH data
                        if symbol_hist is not None and not symbol_hist.empty and 'High' in symbol_hist.columns:
                            ath_price = symbol_hist['High'].max()
                            ath_date = symbol_hist[symbol_hist['High'] == ath_price].index[0].strftime('%Y-%m-%d')
                            
                            ath_data[symbol] = {
                                "ath_price": float(ath_price),
                                "ath_date": ath_date,
                                "last_updated": datetime.now().strftime('%Y-%m-%d')
                            }
                            batch_ath_success += 1
                        
                        # Process current price and daily change
                        if symbol_recent is not None and not symbol_recent.empty and 'Close' in symbol_recent.columns:
                            if len(symbol_recent) >= 2:
                                # Get the last two closing prices
                                current_price = symbol_recent['Close'].iloc[-1]
                                previous_price = symbol_recent['Close'].iloc[-2]
                                
                                # Calculate daily percentage change
                                if previous_price != 0:
                                    daily_change = ((current_price - previous_price) / previous_price) * 100
                                else:
                                    daily_change = 0
                                
                                price_data[symbol] = {
                                    "current_price": float(current_price),
                                    "previous_price": float(previous_price),
                                    "daily_change_percent": float(daily_change)
                                }
                                batch_price_success += 1
                                
                                # Log first few for verification
                                if batch_price_success <= 3:
                                    logging.info(f"Price data for {symbol}: ${current_price:.2f} ({daily_change:+.2f}%)")
                        
                        # Minimal delay between symbols
                        time.sleep(0.1)
                        
                    except Exception as e:
                        logging.debug(f"Failed to process data for {symbol}: {e}")
                        continue
                
                logging.info(f"ATH batch {batch_num + 1} completed: {batch_ath_success}/{len(batch_symbols)} symbols processed")
                
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # Delay between ATH batches
                if batch_num < total_batches - 1:
                    delay = 5
                    logging.info(f"Waiting {delay}s before next ATH batch...")
                    time.sleep(delay)
                
            except Exception as e:
                logging.error(f"ATH batch {batch_num + 1} failed: {e}")
                
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                continue
        
        logging.info(f"ATH processing completed: {len(ath_data)}/{len(symbols)} symbols processed")
        
        # Fetch ratios for all symbols using batch Tickers API
        logging.info(f"Fetching financial ratios for all {len(symbols)} symbols using batch Tickers API...")
        
        # Process symbols in batches to avoid overwhelming the API
        batch_size = 50  # Reasonable batch size for Tickers API
        total_batches = (len(symbols) + batch_size - 1) // batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * batch_size
            end_idx = min((batch_num + 1) * batch_size, len(symbols))
            batch_symbols = symbols[start_idx:end_idx]
            
            logging.info(f"Processing ratios batch {batch_num + 1}/{total_batches}: {len(batch_symbols)} symbols")
            
            try:
                # Set proxy for batch request
                if use_proxy:
                    import os
                    proxy_url = get_proxy_config()
                    os.environ['HTTP_PROXY'] = proxy_url
                    os.environ['HTTPS_PROXY'] = proxy_url
                
                # Create Tickers object for batch processing
                symbols_str = ' '.join(batch_symbols)
                tickers = yf.Tickers(symbols_str)
                
                # Add delay between batch requests
                time.sleep(3)
                
                batch_success_count = 0
                for symbol in batch_symbols:
                    try:
                        # Access ticker from batch object
                        if hasattr(tickers, 'tickers') and symbol in tickers.tickers:
                            ticker_obj = tickers.tickers[symbol]
                            
                            # Get financial ratios
                            info = ticker_obj.info
                            
                            ratios = {
                                'pe_ratio': info.get('trailingPE', None),
                                'eps_ttm': info.get('trailingEps', None),
                                'ps_ratio': info.get('priceToSalesTrailing12Months', None),
                                'pb_ratio': info.get('priceToBook', None),
                                'forward_pe': info.get('forwardPE', None)
                            }
                            
                            # Only add if we got at least one valid ratio
                            if any(v is not None for v in ratios.values()):
                                ratios_data[symbol] = ratios
                                batch_success_count += 1
                                
                                # Log success for first few symbols in batch
                                if batch_success_count <= 3:
                                    logging.info(f"SUCCESS: Got ratios from batch for {symbol}: PE={ratios['pe_ratio']}")
                            
                            # Small delay between symbols in batch
                            time.sleep(0.2)
                            
                    except Exception as e:
                        logging.debug(f"Failed to get ratios for {symbol} in batch: {e}")
                        continue
                
                logging.info(f"Batch {batch_num + 1} completed: {batch_success_count}/{len(batch_symbols)} ratios fetched")
                
                # Clean up proxy env vars after batch
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # Delay between batches to be respectful to the API
                if batch_num < total_batches - 1:
                    delay = 10
                    logging.info(f"Waiting {delay}s before next ratios batch...")
                    time.sleep(delay)
                
            except Exception as e:
                logging.error(f"Ratios batch {batch_num + 1} failed: {e}")
                
                # Clean up proxy on error
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # Continue with next batch even if this one failed
                continue
        
        total_ratios_fetched = len(ratios_data)
        logging.info(f"Completed batch ratios fetching: {total_ratios_fetched}/{len(symbols)} symbols processed")
        
        return ath_data, ratios_data, price_data
        
    except Exception as e:
        logging.error(f"Batch data fetch failed: {e}")
        # Clean up environment variables on error
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        return {}, {}, {}

def add_ath_data_to_constituents(constituents_data, ath_data):
    """Add ATH price data and calculate ATH change percentage to constituents list."""
    if not constituents_data or not ath_data:
        return constituents_data
    
    updated_count = 0
    for constituent in constituents_data:
        symbol = constituent.get('symbol')
        if symbol and symbol in ath_data:
            ath_price = ath_data[symbol]['ath_price']
            constituent['ath_price'] = ath_price
            constituent['ath_date'] = ath_data[symbol]['ath_date']
            
            # Calculate ATH change percentage: (current_price - ath_price) / ath_price * 100
            current_price = constituent.get('price', 0)
            if ath_price and ath_price > 0 and current_price > 0:
                ath_change_percent = ((current_price - ath_price) / ath_price) * 100
                constituent['ath_change_percent'] = round(ath_change_percent, 2)
            else:
                constituent['ath_change_percent'] = None
            
            updated_count += 1
    
    logging.info(f"Added ATH data and change % to {updated_count}/{len(constituents_data)} constituents")
    return constituents_data

def add_financial_ratios_to_constituents(constituents_data, ratios_data):
    """Add financial ratios data to constituents list."""
    if not constituents_data or not ratios_data:
        return constituents_data
    
    updated_count = 0
    for constituent in constituents_data:
        symbol = constituent.get('symbol')
        if symbol and symbol in ratios_data:
            ratios = ratios_data[symbol]
            constituent['pe_ratio'] = ratios.get('pe_ratio')
            constituent['eps_ttm'] = ratios.get('eps_ttm')
            constituent['ps_ratio'] = ratios.get('ps_ratio')
            constituent['pb_ratio'] = ratios.get('pb_ratio')
            constituent['forward_pe'] = ratios.get('forward_pe')
            updated_count += 1
    
    logging.info(f"Added financial ratios to {updated_count}/{len(constituents_data)} constituents")
    return constituents_data

def add_price_data_to_constituents(constituents_data, price_data):
    """Add current price and daily change data to constituents list."""
    if not constituents_data or not price_data:
        return constituents_data
    
    updated_count = 0
    for constituent in constituents_data:
        symbol = constituent.get('symbol')
        if symbol and symbol in price_data:
            price_info = price_data[symbol]
            # Update current price and daily change percentage
            constituent['price'] = price_info.get('current_price', constituent.get('price', 0))
            constituent['change'] = price_info.get('daily_change_percent', 0)
            updated_count += 1
    
    logging.info(f"Added price and change data to {updated_count}/{len(constituents_data)} constituents")
    return constituents_data

def compare_constituents(slickcharts_data, stockanalysis_data, index_name):
    """Compare constituents between two sources by ticker symbols."""
    logging.info(f"Comparing {index_name} constituents between sources...")
    
    if not slickcharts_data or not stockanalysis_data:
        logging.error(f"Cannot compare {index_name}: missing data from one or both sources")
        return False
    
    # Extract ticker symbols
    slick_symbols = set(item['symbol'] for item in slickcharts_data if item.get('symbol'))
    stock_symbols = set(item['symbol'] for item in stockanalysis_data if item.get('symbol'))
    
    logging.info(f"{index_name} - SlickCharts: {len(slick_symbols)} symbols, StockAnalysis: {len(stock_symbols)} symbols")
    
    # Find differences
    only_in_slick = slick_symbols - stock_symbols
    only_in_stock = stock_symbols - slick_symbols
    common_symbols = slick_symbols & stock_symbols
    
    # Log results
    logging.info(f"{index_name} - Common symbols: {len(common_symbols)}")
    
    if only_in_slick:
        logging.warning(f"{index_name} - Only in SlickCharts ({len(only_in_slick)}): {sorted(only_in_slick)}")
    
    if only_in_stock:
        logging.warning(f"{index_name} - Only in StockAnalysis ({len(only_in_stock)}): {sorted(only_in_stock)}")
    
    # Calculate consistency percentage
    total_unique = len(slick_symbols | stock_symbols)
    consistency_pct = (len(common_symbols) / total_unique * 100) if total_unique > 0 else 0
    
    logging.info(f"{index_name} - Consistency: {consistency_pct:.1f}% ({len(common_symbols)}/{total_unique} symbols match)")
    
    # Require 100% consistency - any difference is an error
    is_consistent = len(only_in_slick) == 0 and len(only_in_stock) == 0
    
    if is_consistent:
        logging.info(f"{index_name} - ✓ Sources are 100% consistent")
    else:
        logging.error(f"{index_name} - ✗ INCONSISTENT SOURCES - Data mismatch detected!")
        if only_in_slick:
            logging.error(f"{index_name} - Missing from StockAnalysis: {sorted(only_in_slick)}")
        if only_in_stock:
            logging.error(f"{index_name} - Missing from SlickCharts: {sorted(only_in_stock)}")
    
    return is_consistent

def merge_market_cap_data(slickcharts_data, stockanalysis_data):
    """Merge market cap data from StockAnalysis into SlickCharts data."""
    if not slickcharts_data or not stockanalysis_data:
        return slickcharts_data
    
    # Create lookup dict for StockAnalysis market caps
    market_cap_lookup = {item['symbol']: item['marketCap'] for item in stockanalysis_data if item.get('symbol')}
    
    # Update SlickCharts data with market caps
    updated_count = 0
    for item in slickcharts_data:
        symbol = item.get('symbol')
        if symbol and symbol in market_cap_lookup:
            item['marketCap'] = market_cap_lookup[symbol]
            updated_count += 1
    
    logging.info(f"Updated market cap for {updated_count}/{len(slickcharts_data)} SlickCharts entries")
    return slickcharts_data

def fetch_all_market_data(all_symbols, ath_batch_size, ratio_batch_size, use_proxy):
    """Fetch ATH, ratios, and price data for all symbols"""
    if not all_symbols:
        return {}, {}, {}, 0, 0, 0, 0
    
    all_symbols_list = list(all_symbols)
    logging.info(f"Fetching data for {len(all_symbols_list)} unique symbols...")
    
    # Use existing batch stock data function
    ath_data, ratios_data, price_data = fetch_batch_stock_data(all_symbols_list, use_proxy)
    
    # Count success/failure
    total_ath_success = len(ath_data)
    total_ath_failed = len(all_symbols_list) - total_ath_success
    total_ratios_success = len(ratios_data)
    total_ratios_failed = len(all_symbols_list) - total_ratios_success
    
    return ath_data, ratios_data, price_data, total_ath_success, total_ath_failed, total_ratios_success, total_ratios_failed

def create_http_session_fallback():
    """Create HTTP session for fallback scraping when Chrome fails"""
    import random
    session = requests.Session()
    
    # Rotate user agents to avoid detection patterns
    user_agents = [
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    ]
    
    # Realistic browser headers
    session.headers.update({
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
    })
    
    return session

def fetch_slickcharts_http_fallback(url, index_name):
    """HTTP fallback for when Chrome/Selenium is blocked"""
    logging.info(f"🌐 Using HTTP fallback for {index_name}: {url}")
    
    try:
        session = create_http_session_fallback()
        time.sleep(3)  # Respectful delay
        
        response = session.get(url, timeout=30)
        response.raise_for_status()
        
        logging.info(f"HTTP fallback response: {response.status_code}")
        
        # Parse HTML content
        html_content = response.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for tables
        tables = soup.find_all('table')
        logging.info(f"HTTP fallback found {len(tables)} tables")
        
        if not tables:
            logging.warning(f"No tables found in HTTP fallback for {index_name}")
            return []
        
        # Parse the main data table (usually the largest one)
        main_table = max(tables, key=lambda t: len(t.find_all('tr')))
        rows = main_table.find_all('tr')
        
        constituents = []
        for idx, row in enumerate(rows[1:], 1):  # Skip header row
            try:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 4:
                    continue
                
                # Extract text from cells
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                
                if len(cell_texts) >= 7:
                    rank_text = cell_texts[0]
                    name_text = cell_texts[1]
                    symbol_text = cell_texts[2]
                    weight_text = cell_texts[3]
                    price_text = cell_texts[4] if len(cell_texts) > 4 else "0"
                    
                    # Parse values
                    try:
                        rank = int(re.sub(r'[^\d]', '', rank_text)) if rank_text.strip() else idx
                    except:
                        rank = idx
                    
                    try:
                        weight = float(re.sub(r'[^\d.]', '', weight_text.replace('%', '')))
                    except:
                        weight = 0
                    
                    try:
                        price = float(re.sub(r'[^\d.]', '', price_text))
                    except:
                        price = 0
                    
                    if symbol_text and name_text:
                        constituents.append({
                            "no": rank,
                            "symbol": symbol_text,
                            "name": name_text,
                            "weight": weight,
                            "marketCap": 0,  # Will be filled from StockAnalysis
                            "price": price,
                            "change": 0,
                            "netChange": 0
                        })
                        
                        # Log first few for verification
                        if idx <= 3:
                            logging.info(f"HTTP Row {idx}: {symbol_text} - {name_text} ({weight}%)")
                
            except Exception as e:
                logging.debug(f"Error parsing HTTP row {idx}: {e}")
                continue
        
        logging.info(f"HTTP fallback extracted {len(constituents)} companies for {index_name}")
        return constituents
        
    except Exception as e:
        logging.error(f"HTTP fallback failed for {index_name}: {e}")
        return []



def load_existing_data_from_dynamodb(target_index):
    """Step 1: Read all existing data from DynamoDB into a map"""
    logging.info("=" * 60)
    logging.info("STEP 1: LOADING EXISTING DATA FROM DYNAMODB")
    logging.info("=" * 60)
    
    existing_data = {}
    dynamodb_table = create_dynamodb_table()
    
    if not dynamodb_table:
        logging.warning("DynamoDB table not available, starting with empty data")
        return existing_data
    
    indices_to_load = [target_index] if target_index else list(INDICES.keys())
    
    for index_key in indices_to_load:
        index_name = INDICES[index_key]["name"].replace(" ", "_").upper()
        logging.info(f"Loading existing data for {INDICES[index_key]['name']}...")
        
        try:
            # Query all constituents for this index
            response = dynamodb_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('pk').eq(f"INDEX#{index_name}")
            )
            
            constituents = []
            for item in response['Items']:
                constituent = {
                    'no': int(item.get('no', 0)),
                    'symbol': item.get('symbol', ''),
                    'name': item.get('name', ''),
                    'weight': float(item.get('weight', 0)),
                    'price': float(item.get('price', 0)),
                    'change': float(item.get('change', 0)),
                    'marketCap': item.get('market_cap', ''),
                    'ath_price': float(item.get('ath_price', 0)) if item.get('ath_price') else None,
                    'ath_date': item.get('ath_date'),
                    'ath_change_percent': float(item.get('ath_change_percent', 0)) if item.get('ath_change_percent') else None,
                    'pe_ratio': float(item.get('pe_ratio', 0)) if item.get('pe_ratio') else None,
                    'eps_ttm': float(item.get('eps_ttm', 0)) if item.get('eps_ttm') else None,
                    'ps_ratio': float(item.get('ps_ratio', 0)) if item.get('ps_ratio') else None,
                    'pb_ratio': float(item.get('pb_ratio', 0)) if item.get('pb_ratio') else None,
                    'forward_pe': float(item.get('forward_pe', 0)) if item.get('forward_pe') else None,
                }
                constituents.append(constituent)
            
            existing_data[index_key] = constituents
            logging.info(f"Loaded {len(constituents)} existing constituents for {INDICES[index_key]['name']}")
            
        except Exception as e:
            logging.error(f"Failed to load existing data for {INDICES[index_key]['name']}: {e}")
            existing_data[index_key] = []
    
    total_existing = sum(len(constituents) for constituents in existing_data.values())
    logging.info(f"Total existing constituents loaded: {total_existing}")
    
    return existing_data

def update_ath_and_ratios_data(existing_data, use_proxy, ath_batch_size, ratio_batch_size):
    """Step 2: Update ATH prices and financial ratios for all constituents"""
    logging.info("=" * 60)
    logging.info("STEP 2: UPDATING ATH PRICES AND FINANCIAL RATIOS")
    logging.info("=" * 60)
    
    # Collect all unique symbols from existing data
    all_symbols = set()
    for index_constituents in existing_data.values():
        for constituent in index_constituents:
            if constituent.get('symbol'):
                all_symbols.add(constituent['symbol'])
    
    if not all_symbols:
        logging.info("No existing symbols found, skipping ATH and ratios update")
        return {}, {}, 0, 0, 0, 0
    
    logging.info(f"Updating ATH and ratios for {len(all_symbols)} unique symbols...")
    
    # Fetch updated market data
    ath_data, ratios_data, price_data, total_ath_success, total_ath_failed, total_ratios_success, total_ratios_failed = fetch_all_market_data(
        all_symbols, ath_batch_size, ratio_batch_size, use_proxy)
    
    # Update existing data with new ATH, ratios, and price data
    for index_key, constituents in existing_data.items():
        for constituent in constituents:
            symbol = constituent.get('symbol')
            if symbol:
                # Update ATH data
                if symbol in ath_data:
                    ath_price = ath_data[symbol]['ath_price']
                    constituent['ath_price'] = ath_price
                    constituent['ath_date'] = ath_data[symbol]['ath_date']
                
                # Update ratios data
                if symbol in ratios_data:
                    ratios = ratios_data[symbol]
                    constituent['pe_ratio'] = ratios.get('pe_ratio')
                    constituent['eps_ttm'] = ratios.get('eps_ttm')
                    constituent['ps_ratio'] = ratios.get('ps_ratio')
                    constituent['pb_ratio'] = ratios.get('pb_ratio')
                    constituent['forward_pe'] = ratios.get('forward_pe')
                
                # Update price and daily change data
                if symbol in price_data:
                    price_info = price_data[symbol]
                    current_price = price_info.get('current_price', constituent.get('price', 0))
                    constituent['price'] = current_price
                    constituent['change'] = price_info.get('daily_change_percent', 0)
                    
                    # Calculate ATH change percentage if we have both ATH and current price
                    ath_price = constituent.get('ath_price')
                    if ath_price and ath_price > 0 and current_price > 0:
                        ath_change_percent = ((current_price - ath_price) / ath_price) * 100
                        constituent['ath_change_percent'] = round(ath_change_percent, 2)
                    else:
                        constituent['ath_change_percent'] = None
    
    logging.info(f"ATH update: {total_ath_success} success, {total_ath_failed} failed")
    logging.info(f"Ratios update: {total_ratios_success} success, {total_ratios_failed} failed")
    
    return ath_data, ratios_data, total_ath_success, total_ath_failed, total_ratios_success, total_ratios_failed

def scrape_and_compare_constituents(existing_data, target_index):
    """Step 3: Scrape websites and determine changes (add/remove/update)"""
    logging.info("=" * 60)
    logging.info("STEP 3: SCRAPING WEBSITES AND ANALYZING CHANGES")
    logging.info("=" * 60)
    
    indices_to_process = {target_index: INDICES[target_index]} if target_index else INDICES
    changes_summary = {}
    updated_data = {}
    
    for index_key, index_info in indices_to_process.items():
        logging.info(f"Processing {index_info['name']}...")
        
        # Get existing constituents
        existing_constituents = existing_data.get(index_key, [])
        existing_symbols = {c['symbol']: c for c in existing_constituents if c.get('symbol')}
        
        # Scrape current data from websites
        slickcharts_data = fetch_slickcharts_data(index_info["slickcharts_url"], index_info["name"])
        stockanalysis_data = fetch_stockanalysis_data(index_info["stockanalysis_url"], index_info["name"])
        
        if not slickcharts_data:
            logging.error(f"Failed to scrape SlickCharts for {index_info['name']}, keeping existing data")
            updated_data[index_key] = existing_constituents
            changes_summary[index_key] = {"added": 0, "removed": 0, "updated": 0, "unchanged": len(existing_constituents)}
            continue
        
        # Merge market cap data from StockAnalysis
        if stockanalysis_data:
            slickcharts_data = merge_market_cap_data(slickcharts_data, stockanalysis_data)
        
        # Analyze changes
        new_symbols = {c['symbol']: c for c in slickcharts_data if c.get('symbol')}
        
        added_symbols = set(new_symbols.keys()) - set(existing_symbols.keys())
        removed_symbols = set(existing_symbols.keys()) - set(new_symbols.keys())
        common_symbols = set(existing_symbols.keys()) & set(new_symbols.keys())
        
        # Create updated constituents list
        updated_constituents = []
        updated_count = 0
        
        for symbol, new_data in new_symbols.items():
            if symbol in existing_symbols:
                # Update existing constituent - preserve existing price/change from step 2
                existing_constituent = existing_symbols[symbol].copy()
                
                # Check if weight changed significantly (>0.01%)
                old_weight = existing_constituent.get('weight', 0)
                new_weight = new_data.get('weight', 0)
                weight_changed = abs(old_weight - new_weight) > 0.01
                
                # Update core data from scraping but preserve price/change from existing data (Step 2)
                existing_constituent.update({
                    'no': new_data.get('no', existing_constituent.get('no', 0)),
                    'name': new_data.get('name', existing_constituent.get('name', '')),
                    'weight': new_weight,
                    'marketCap': new_data.get('marketCap', existing_constituent.get('marketCap', '')),
                })
                
                # Preserve price and change data from Step 2 (already updated with yfinance data)
                # Do NOT overwrite with scraped data which is typically 0 or stale
                logging.debug(f"Preserving Step 2 data for {symbol}: price=${existing_constituent.get('price', 0):.2f}, change={existing_constituent.get('change', 0):.2f}%")
                
                if weight_changed:
                    updated_count += 1
                    logging.debug(f"Weight updated for {symbol}: {old_weight:.2f}% -> {new_weight:.2f}%")
                
                updated_constituents.append(existing_constituent)
            else:
                # Add new constituent - need to fetch fresh data for new symbols
                updated_constituents.append(new_data)
        
        updated_data[index_key] = updated_constituents
        
        changes_summary[index_key] = {
            "added": len(added_symbols),
            "removed": len(removed_symbols), 
            "updated": updated_count,
            "unchanged": len(common_symbols) - updated_count
        }
        
        # Log changes
        if added_symbols:
            logging.info(f"{index_info['name']} - Added ({len(added_symbols)}): {sorted(added_symbols)}")
        if removed_symbols:
            logging.info(f"{index_info['name']} - Removed ({len(removed_symbols)}): {sorted(removed_symbols)}")
        if updated_count > 0:
            logging.info(f"{index_info['name']} - Updated weights: {updated_count} constituents")
        
        logging.info(f"{index_info['name']} - Total constituents: {len(updated_constituents)}")
    
    return updated_data, changes_summary

def update_dynamodb_with_changes(updated_data, target_index):
    """Step 4: Update all data to DynamoDB"""
    logging.info("=" * 60)
    logging.info("STEP 4: UPDATING DYNAMODB WITH CHANGES")
    logging.info("=" * 60)
    
    dynamodb_table = create_dynamodb_table()
    if not dynamodb_table:
        logging.error("DynamoDB table not available, cannot save data")
        return 0
    
    indices_to_update = [target_index] if target_index else list(updated_data.keys())
    total_saved = 0
    
    for index_key in indices_to_update:
        if index_key not in updated_data:
            continue
            
        index_name = INDICES[index_key]["name"].replace(" ", "_").upper()
        constituents = updated_data[index_key]
        
        logging.info(f"Updating {INDICES[index_key]['name']} in DynamoDB...")
        
        try:
            # Clear existing data for this index
            logging.info(f"Clearing existing data for {INDICES[index_key]['name']}...")
            
            # Query all existing items
            response = dynamodb_table.query(
                KeyConditionExpression=boto3.dynamodb.conditions.Key('pk').eq(f"INDEX#{index_name}")
            )
            
            # Delete existing items
            with dynamodb_table.batch_writer() as batch:
                for item in response['Items']:
                    batch.delete_item(Key={'pk': item['pk'], 'sk': item['sk']})
            
            # Save updated data
            saved_count = save_to_dynamodb(dynamodb_table, INDICES[index_key]["name"].replace(" ", "_"), constituents)
            total_saved += saved_count
            
            logging.info(f"Updated {saved_count} constituents for {INDICES[index_key]['name']} in DynamoDB")
            
        except Exception as e:
            logging.error(f"Failed to update DynamoDB for {INDICES[index_key]['name']}: {e}")
    
    logging.info(f"Total DynamoDB records updated: {total_saved}")
    return total_saved

def print_process_summary(changes_summary, total_ath_success, total_ath_failed, 
                         total_ratios_success, total_ratios_failed, total_dynamodb_saved, total_elapsed):
    """Step 5: Print comprehensive summary of all 4 steps"""
    logging.info("=" * 60)
    logging.info("PROCESS SUMMARY")
    logging.info("=" * 60)
    
    # Step summaries
    total_added = sum(changes['added'] for changes in changes_summary.values())
    total_removed = sum(changes['removed'] for changes in changes_summary.values()) 
    total_updated = sum(changes['updated'] for changes in changes_summary.values())
    total_unchanged = sum(changes['unchanged'] for changes in changes_summary.values())
    
    summary_line = (f"Summary: Step1=LoadedFromDB, Step2=ATH({total_ath_success}✓/{total_ath_failed}✗)+Ratios({total_ratios_success}✓/{total_ratios_failed}✗), "
                   f"Step3=Changes(+{total_added}/-{total_removed}/~{total_updated}/={total_unchanged}), Step4=SavedToDB({total_dynamodb_saved}), "
                   f"Time={total_elapsed:.1f}s")
    
    logging.info("DETAILED BREAKDOWN:")
    logging.info(f"Step 1 - Data Loading: Loaded existing constituents from DynamoDB")
    logging.info(f"Step 2 - Market Data: ATH prices ({total_ath_success} success, {total_ath_failed} failed), Financial ratios ({total_ratios_success} success, {total_ratios_failed} failed)")
    logging.info(f"Step 3 - Website Changes: Added {total_added}, Removed {total_removed}, Updated {total_updated}, Unchanged {total_unchanged}")
    logging.info(f"Step 4 - Database Update: Saved {total_dynamodb_saved} records to DynamoDB")
    logging.info(f"Total execution time: {total_elapsed:.1f}s")
    logging.info("")
    logging.info("ONE-LINE SUMMARY:")
    logging.info(summary_line)

def main(use_proxy=False, target_index=None, ath_batch_size=50, ratio_batch_size=50):
    # Configure logging with datetime - save to file and console
    import os
    log_file = os.path.join(os.path.dirname(__file__), "fetch_constituents.log")
    
    # Remove existing handlers to avoid duplicates
    for handler in logging.root.handlers[:]:
        logging.root.removeHandler(handler)
    
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
        handlers=[
            logging.FileHandler(log_file, mode='a', encoding='utf-8'),  # Append to log file
            logging.StreamHandler()  # Console output
        ]
    )
    
    if target_index:
        logging.info(f"Starting {INDICES[target_index]['name']} constituents processing...")
    else:
        logging.info("Starting US Index Constituents processing...")
    
    logging.info(f"Logs will be saved to: {log_file}")
    
    if use_proxy:
        logging.info("Using proxy for financial data fetching")
    
    # Ensure data folder exists
    ensure_data_folder()
    
    logging.info(f"ATH batch size: {ath_batch_size}, Ratios batch size: {ratio_batch_size}")
    
    total_start_time = datetime.now()
    
    # Execute the 4-step process
    
    # Step 1: Load existing data from DynamoDB
    existing_data = load_existing_data_from_dynamodb(target_index)
    
    # Step 2: Update ATH prices and financial ratios for existing constituents
    ath_data, ratios_data, total_ath_success, total_ath_failed, total_ratios_success, total_ratios_failed = update_ath_and_ratios_data(
        existing_data, use_proxy, ath_batch_size, ratio_batch_size)
    
    # Step 3: Scrape websites and analyze changes
    updated_data, changes_summary = scrape_and_compare_constituents(existing_data, target_index)
    
    # Step 4: Update DynamoDB with all changes
    total_dynamodb_saved = update_dynamodb_with_changes(updated_data, target_index)
    
    # Step 5: Print comprehensive summary
    total_elapsed = (datetime.now() - total_start_time).total_seconds()
    print_process_summary(changes_summary, total_ath_success, total_ath_failed,
                         total_ratios_success, total_ratios_failed, total_dynamodb_saved, total_elapsed)
        
    send_health_check(success=True)
    
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Fetch and compare US index constituents from multiple sources.")
    parser.add_argument('--proxy', action='store_true', help='Use proxy for financial data fetching')
    parser.add_argument('--index', type=str, choices=INDICES.keys(), help='Process only the specified index (e.g., sp500)')
    parser.add_argument('--ath-batch-size', type=int, default=50, help='Batch size for ATH price fetching (default: 50)')
    parser.add_argument('--ratio-batch-size', type=int, default=50, help='Batch size for financial ratios fetching (default: 50)')
    
    args = parser.parse_args()
    
    try:
        main(use_proxy=args.proxy, target_index=args.index, ath_batch_size=args.ath_batch_size, ratio_batch_size=args.ratio_batch_size)
    except Exception as e:
        logging.error(f"Script execution failed: {e}")
        send_health_check(success=False)
        raise