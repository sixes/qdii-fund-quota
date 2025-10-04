import re
import json
import os
import logging
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
import time
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from dotenv import load_dotenv
import argparse

# Configuration for all indices
INDICES = {
    "sp500": {
        "slickcharts_url": "https://www.slickcharts.com/sp500",
        "stockanalysis_url": "https://stockanalysis.com/list/sp-500-stocks/",
        "expected_count": 503,
        "slickcharts_filename": "sp500_slickcharts.json",
        "stockanalysis_filename": "sp500_stockanalysis.json",
        "name": "S&P 500"
    },
    "nasdaq100": {
        "slickcharts_url": "https://www.slickcharts.com/nasdaq100",
        "stockanalysis_url": "https://stockanalysis.com/list/nasdaq-100-stocks/",
        "expected_count": 101,
        "slickcharts_filename": "nasdaq100_slickcharts.json",
        "stockanalysis_filename": "nasdaq100_stockanalysis.json",
        "name": "Nasdaq 100"
    },
    "dow": {
        "slickcharts_url": "https://www.slickcharts.com/dowjones",
        "stockanalysis_url": "https://stockanalysis.com/list/dow-jones-stocks/",
        "expected_count": 30,
        "slickcharts_filename": "dow_slickcharts.json",
        "stockanalysis_filename": "dow_stockanalysis.json",
        "name": "Dow Jones"
    }
}

def build_driver(headless=True, disable_js=False):
    """Build Chrome driver with optimizations."""
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-images")
    opts.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
    
    if disable_js:
        opts.add_argument("--disable-javascript")
    
    # Speed optimizations
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values": {"notifications": 2}
    }
    opts.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(10)
    return driver

def fetch_slickcharts_data(url, index_name, max_retries=3):
    """Fetch data from SlickCharts using table parsing with retry logic."""
    logging.info(f"Fetching {index_name} data from SlickCharts: {url}")
    
    for attempt in range(max_retries):
        driver = build_driver(headless=True, disable_js=False)
        
        try:
            start_time = datetime.now()
            driver.get(url)
            
            # Wait for page completion
            WebDriverWait(driver, 20).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            
            # Try DOM table extraction first
            constituents = parse_slickcharts_table(driver, index_name)
            
            if not constituents:
                # Fallback to JavaScript extraction
                logging.info(f"Table parsing failed for {index_name}, trying JavaScript extraction...")
                html_content = driver.page_source
                constituents = parse_slickcharts_javascript(html_content, index_name)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logging.info(f"SlickCharts {index_name}: extracted {len(constituents)} companies in {elapsed:.1f}s")
            
            return constituents
            
        except Exception as e:
            logging.warning(f"SlickCharts extraction attempt {attempt + 1}/{max_retries} failed for {index_name}: {e}")
            if attempt < max_retries - 1:
                logging.info(f"Retrying SlickCharts {index_name} in 2 seconds...")
                time.sleep(2)
            else:
                logging.error(f"All {max_retries} attempts failed for SlickCharts {index_name}")
        finally:
            driver.quit()
    
    return []

def parse_slickcharts_table(driver, index_name):
    """Parse SlickCharts HTML table."""
    try:
        # Wait for table to be present
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr"))
        )
        
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        
        if not rows:
            logging.warning(f"No table rows found for {index_name}")
            return []
        
        logging.info(f"Found {len(rows)} table rows for {index_name}")
        
        constituents = []
        for idx, row in enumerate(rows, 1):
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 7:
                    continue
                
                # Parse table structure: rank, name, symbol, weight, price, net_change, percent_change
                rank = cells[0].text.strip()
                name_cell = cells[1].find_element(By.TAG_NAME, "a").text.strip() if cells[1].find_elements(By.TAG_NAME, "a") else cells[1].text.strip()
                symbol_cell = cells[2].find_element(By.TAG_NAME, "a").text.strip() if cells[2].find_elements(By.TAG_NAME, "a") else cells[2].text.strip()
                weight = cells[3].text.strip()
                price_text = cells[4].text.strip()
                net_change_text = cells[5].text.strip()
                percent_change_text = cells[6].text.strip()
                
                # Parse numeric values
                try:
                    rank_num = int(rank) if rank.isdigit() else idx
                except (ValueError, TypeError):
                    rank_num = idx
                
                try:
                    price = float(re.sub(r'[^\d.]', '', price_text))
                except (ValueError, TypeError):
                    price = 0
                
                try:
                    net_change = float(re.sub(r'[^\d.-]', '', net_change_text))
                except (ValueError, TypeError):
                    net_change = 0
                
                try:
                    percent_change = float(re.sub(r'[^\d.-]', '', percent_change_text.replace('(', '').replace(')', '')))
                except (ValueError, TypeError):
                    percent_change = 0
                
                try:
                    weight_num = float(re.sub(r'[^\d.]', '', weight.replace('%', '')))
                except (ValueError, TypeError):
                    weight_num = 0
                
                # Debug logging for first few rows
                if idx <= 3:
                    logging.info(f"SlickCharts Row {idx}: symbol={symbol_cell}, name={name_cell}, weight={weight_num}%")
                
                if symbol_cell and name_cell:
                    constituents.append({
                        "no": rank_num,
                        "symbol": symbol_cell,
                        "name": name_cell,
                        "marketCap": 0,
                        "price": price,
                        "change": percent_change,
                        "weight": weight_num,
                        "netChange": net_change
                    })
                    
            except Exception as e:
                logging.debug(f"Error parsing SlickCharts row {idx} for {index_name}: {e}")
                continue
        
        logging.info(f"Successfully parsed {len(constituents)} companies from SlickCharts table for {index_name}")
        return constituents
        
    except Exception as e:
        logging.warning(f"SlickCharts table parsing failed for {index_name}: {e}")
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
    """Fetch data from StockAnalysis.com using DOM parsing with retry logic."""
    logging.info(f"Fetching {index_name} data from StockAnalysis: {url}")
    
    for attempt in range(max_retries):
        driver = build_driver(headless=True, disable_js=True)
        
        try:
            start_time = datetime.now()
            driver.get(url)
            
            WebDriverWait(driver, 20).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            
            constituents = parse_stockanalysis_table(driver, index_name)
            
            elapsed = (datetime.now() - start_time).total_seconds()
            logging.info(f"StockAnalysis {index_name}: extracted {len(constituents)} companies in {elapsed:.1f}s")
            
            return constituents
            
        except Exception as e:
            logging.warning(f"StockAnalysis extraction attempt {attempt + 1}/{max_retries} failed for {index_name}: {e}")
            if attempt < max_retries - 1:
                logging.info(f"Retrying StockAnalysis {index_name} in 2 seconds...")
                time.sleep(2)
            else:
                logging.error(f"All {max_retries} attempts failed for StockAnalysis {index_name}")
        finally:
            driver.quit()
    
    return []

def parse_stockanalysis_table(driver, index_name):
    """Parse StockAnalysis.com HTML table."""
    try:
        # Wait for table to be present
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr"))
        )
        
        # Try different table selectors
        table_selectors = ["table tbody tr", "tbody tr", "tr"]
        
        rows = []
        for selector in table_selectors:
            try:
                found_rows = driver.find_elements(By.CSS_SELECTOR, selector)
                if len(found_rows) > 10:
                    rows = found_rows
                    logging.info(f"Found {len(rows)} rows using selector: {selector}")
                    # Filter out header rows and empty rows
                    valid_rows = []
                    for row in rows:
                        cells = row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 6:  # Must have minimum required columns
                            # Check if first cell contains a number (indicating data row)
                            first_cell_text = cells[0].text.strip()
                            if first_cell_text and (first_cell_text.isdigit() or first_cell_text in ['1', '2', '3']):
                                valid_rows.append(row)
                    rows = valid_rows
                    logging.info(f"Filtered to {len(rows)} valid data rows")
                    break
            except Exception as e:
                logging.debug(f"Selector '{selector}' failed: {e}")
                continue
        
        if not rows:
            logging.warning(f"No table rows found for {index_name}")
            return []
        
        constituents = []
        for idx, row in enumerate(rows, 1):
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 6:
                    continue
                
                # Parse by position: id, ticker, name, market_cap, last_price, change_percent
                no = int(cells[0].text.strip()) if cells[0].text.strip().isdigit() else idx
                symbol = cells[1].text.strip()
                name = cells[2].text.strip()
                market_cap_text = cells[3].text.strip()
                price_text = cells[4].text.strip()
                change_text = cells[5].text.strip()
                
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
                    # Log cell contents for debugging
                    for i, cell in enumerate(cells[:6]):
                        logging.debug(f"  Cell {i}: '{cell.text.strip()}'")
                
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
        
        logging.info(f"Successfully parsed {len(constituents)} companies from StockAnalysis for {index_name}")
        return constituents
        
    except Exception as e:
        logging.warning(f"StockAnalysis table parsing failed for {index_name}: {e}")
        return []

def get_proxy_config():
    """Get proxy configuration from .env file."""
    load_dotenv()
    
    proxy_host = os.getenv('PROXY_HOST', '127.0.0.1')
    proxy_port = os.getenv('PROXY_PORT', '51837')
    proxy_type = os.getenv('PROXY_TYPE', 'socks5')
    
    return f"{proxy_type}://{proxy_host}:{proxy_port}"

def fetch_stock_ath_price(symbol, use_proxy=False):
    """Fetch all-time high price for a single stock using yfinance."""
    try:
        logging.debug(f"Fetching ATH for {symbol}")
        
        if use_proxy:
            # Set proxy environment variables for yfinance
            import os
            proxy_url = get_proxy_config()
            os.environ['HTTP_PROXY'] = proxy_url
            os.environ['HTTPS_PROXY'] = proxy_url
        
        # Use yfinance without custom session - let it handle proxy via env vars
        ticker = yf.Ticker(symbol)
        
        # Get historical data for maximum period
        hist = ticker.history(period="max", rounding=True)
        
        if use_proxy:
            # Clean up environment variables
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        if hist.empty:
            logging.warning(f"No historical data found for {symbol}")
            return None, None
        
        # Find all-time high
        ath_price = hist['High'].max()
        ath_date = hist[hist['High'] == ath_price].index[0].strftime('%Y-%m-%d')
        
        logging.debug(f"{symbol} ATH: ${ath_price:.2f} on {ath_date}")
        return float(ath_price), ath_date
        
    except Exception as e:
        logging.warning(f"Failed to fetch ATH for {symbol}: {e}")
        # Clean up environment variables on error
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        return None, None

def fetch_batch_stock_data(symbols, use_proxy=False):
    """Fetch ATH prices using yfinance batch API and ratios individually."""
    try:
        logging.info(f"Fetching batch ATH data for {len(symbols)} symbols using yfinance...")
        
        if use_proxy:
            # Set proxy environment variables for yfinance
            import os
            proxy_url = get_proxy_config()
            os.environ['HTTP_PROXY'] = proxy_url
            os.environ['HTTPS_PROXY'] = proxy_url
        
        # Use yfinance batch download for historical data only
        symbols_str = ' '.join(symbols)
        hist_data = yf.download(symbols_str, period="max", group_by='ticker', auto_adjust=True, prepost=True, threads=False, timeout=30)
        
        if use_proxy:
            # Clean up environment variables
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        ath_data = {}
        ratios_data = {}
        
        for symbol in symbols:
            try:
                # Extract ATH data with better handling
                symbol_hist = None
                try:
                    if len(symbols) == 1:
                        # Single symbol case
                        symbol_hist = hist_data
                    else:
                        # Multiple symbols case - check if symbol exists in data
                        if hasattr(hist_data, 'columns') and hasattr(hist_data.columns, 'get_level_values'):
                            if symbol in hist_data.columns.get_level_values(0):
                                symbol_hist = hist_data[symbol]
                        elif symbol in hist_data.columns:
                            symbol_hist = hist_data[symbol]
                except Exception as e:
                    logging.debug(f"Error extracting hist data for {symbol}: {e}")
                    symbol_hist = None
                
                if symbol_hist is not None and not symbol_hist.empty:
                    ath_price = symbol_hist['High'].max()
                    ath_date = symbol_hist[symbol_hist['High'] == ath_price].index[0].strftime('%Y-%m-%d')
                    
                    ath_data[symbol] = {
                        "ath_price": float(ath_price),
                        "ath_date": ath_date,
                        "last_updated": datetime.now().strftime('%Y-%m-%d')
                    }
                
                # Skip ratios fetching in batch - causes too many rate limit issues
                # We'll fetch ratios individually later as fallback
                logging.debug(f"Skipping ratios in batch for {symbol} to avoid rate limits")
                
                # Minimal delay
                time.sleep(0.1)
                
            except Exception as e:
                logging.warning(f"Failed to process batch data for {symbol}: {e}")
                continue
        
        logging.info(f"Batch processing completed: ATH data for {len(ath_data)} symbols, ratios for {len(ratios_data)} symbols")
        
        # Since we skipped ratios in batch, fetch them individually with proper rate limiting
        logging.info(f"Fetching ratios individually for {len(symbols)} symbols with rate limiting...")
        
        # Try the most important 5 symbols only to avoid excessive rate limiting
        priority_symbols = symbols[:5] if len(symbols) > 5 else symbols
        logging.info(f"Focusing on {len(priority_symbols)} priority symbols for ratios to avoid rate limiting")
        
        for i, symbol in enumerate(priority_symbols):
            try:
                # Set proxy for each individual request
                if use_proxy:
                    import os
                    proxy_url = get_proxy_config()
                    os.environ['HTTP_PROXY'] = proxy_url
                    os.environ['HTTPS_PROXY'] = proxy_url
                
                logging.info(f"Fetching ratios for {symbol} ({i+1}/{len(priority_symbols)})")
                
                # Create individual ticker
                ticker = yf.Ticker(symbol)
                
                # Force a short pause before info request
                time.sleep(1)
                
                # Use fast_info for a quick check first
                fast_info = ticker.fast_info
                logging.info(f"Got fast_info for {symbol}")
                
                # Then try full info with timeout
                try:
                    info = ticker.info
                    
                    ratios = {
                        'pe_ratio': info.get('trailingPE', None),
                        'eps_ttm': info.get('trailingEps', None),
                        'ps_ratio': info.get('priceToSalesTrailing12Months', None),
                        'pb_ratio': info.get('priceToBook', None),
                        'forward_pe': info.get('forwardPE', None)
                    }
                    
                    if any(v is not None for v in ratios.values()):
                        ratios_data[symbol] = ratios
                        logging.info(f"SUCCESS: Got ratios for {symbol}: PE={ratios['pe_ratio']}, EPS={ratios['eps_ttm']}")
                    else:
                        logging.warning(f"No financial ratios found in info for {symbol}")
                    
                except Exception as e:
                    logging.warning(f"Error getting full info for {symbol}: {e}")
                    
                    # Try to extract some data from fast_info as fallback
                    try:
                        last_price = fast_info.get('lastPrice', None)
                        if last_price:
                            ratios_data[symbol] = {
                                'current_price': last_price,
                                'pe_ratio': None,
                                'eps_ttm': None,
                                'ps_ratio': None,
                                'pb_ratio': None,
                                'forward_pe': None
                            }
                            logging.info(f"Added basic price data for {symbol} as fallback")
                    except:
                        pass
                
                # Clean up proxy env vars
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # Long delay between requests to avoid rate limiting
                time.sleep(5)
                
            except Exception as e:
                logging.warning(f"Failed to get ratios for {symbol}: {e}")
                # Clean up proxy env vars on error
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                # Even longer delay on error
                time.sleep(8)
        
        return ath_data, ratios_data
        
    except Exception as e:
        logging.error(f"Batch data fetch failed: {e}")
        # Clean up environment variables on error
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        return {}, {}

def test_batch_ratios_debug(use_proxy=False):
    """Test method to debug batch ratios fetching issues."""
    logging.info("=== DEBUGGING BATCH RATIOS FETCHING ===")
    
    # Test with just 3 symbols from Dow Jones
    test_symbols = ["AAPL", "MSFT", "GS", "IBM", "MMM", "AXP", "BA", "CAT", "CVX", "DIS", "GOOG", "HD", "INTC", "JPM", "MCD", "MRK", "NKE", "PFE", "PG", "TRV", "UNH", "V", "VZ", "WMT", "XOM"]
    
    try:
        if use_proxy:
            import os
            proxy_url = get_proxy_config()
            os.environ['HTTP_PROXY'] = proxy_url
            os.environ['HTTPS_PROXY'] = proxy_url
            logging.info(f"Using proxy: {proxy_url}")
        
        logging.info(f"Testing batch ratios for: {test_symbols}")
        
        # Step 1: Test Tickers object creation
        symbols_str = ' '.join(test_symbols)
        logging.info(f"Creating Tickers object with: '{symbols_str}'")
        
        tickers = yf.Tickers(symbols_str)
        logging.info(f"Tickers object created: {type(tickers)}")
        logging.info(f"Tickers has 'tickers' attribute: {hasattr(tickers, 'tickers')}")
        
        if hasattr(tickers, 'tickers'):
            logging.info(f"Available tickers: {list(tickers.tickers.keys())}")
        
        # Step 2: Test individual ticker access
        for symbol in test_symbols:
            try:
                logging.info(f"\n--- Testing {symbol} ---")
                
                # Method 1: Through tickers object
                if hasattr(tickers, 'tickers') and symbol in tickers.tickers:
                    ticker_obj = tickers.tickers[symbol]
                    logging.info(f"Got ticker object from batch: {type(ticker_obj)}")
                    
                    # Try to get info
                    try:
                        info = ticker_obj.info
                        logging.info(f"Got info from batch ticker: {len(info)} keys")
                        
                        # Check for ratio keys
                        ratio_keys = ['trailingPE', 'trailingEps', 'priceToSalesTrailing12Months', 'priceToBook', 'forwardPE']
                        available_ratios = {key: info.get(key) for key in ratio_keys if key in info}
                        logging.info(f"Available ratios from batch: {available_ratios}")
                        
                    except Exception as e:
                        logging.error(f"Error getting info from batch ticker {symbol}: {e}")
                
                # Method 2: Individual ticker (for comparison)
                try:
                    individual_ticker = yf.Ticker(symbol)
                    info_individual = individual_ticker.info
                    logging.info(f"Got info from individual ticker: {len(info_individual)} keys")
                    
                    ratio_keys = ['trailingPE', 'trailingEps', 'priceToSalesTrailing12Months', 'priceToBook', 'forwardPE']
                    available_ratios_individual = {key: info_individual.get(key) for key in ratio_keys if key in info_individual}
                    logging.info(f"Available ratios from individual: {available_ratios_individual}")
                    
                    time.sleep(2)  # Delay between individual requests
                    
                except Exception as e:
                    logging.error(f"Error with individual ticker {symbol}: {e}")
                
            except Exception as e:
                logging.error(f"Error processing {symbol}: {e}")
        
        # Clean up proxy
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        logging.info("=== END BATCH RATIOS DEBUG ===")
        
    except Exception as e:
        logging.error(f"Batch ratios debug failed: {e}")
        
        # Clean up proxy on error
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']

def fetch_stock_financial_ratios(symbol, use_proxy=False):
    """Fetch financial ratios for a single stock using yfinance."""
    try:
        logging.debug(f"Fetching financial ratios for {symbol}")
        
        if use_proxy:
            # Set proxy environment variables
            import os
            proxy_url = get_proxy_config()
            os.environ['HTTP_PROXY'] = proxy_url
            os.environ['HTTPS_PROXY'] = proxy_url
        
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        if use_proxy:
            # Clean up environment variables
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        # Extract financial ratios (excluding PEG which is often None)
        ratios = {
            'pe_ratio': info.get('trailingPE', None),  # PE ratio (TTM)
            'eps_ttm': info.get('trailingEps', None),  # EPS (TTM)
            'ps_ratio': info.get('priceToSalesTrailing12Months', None),  # PS ratio
            'pb_ratio': info.get('priceToBook', None),  # PB ratio
            'forward_pe': info.get('forwardPE', None)  # Forward PE
        }
        
        logging.debug(f"{symbol} ratios: PE={ratios['pe_ratio']}, EPS={ratios['eps_ttm']}, PS={ratios['ps_ratio']}, PB={ratios['pb_ratio']}")
        
        # Add delay to be respectful to the API
        time.sleep(0.2)
        
        return ratios
        
    except Exception as e:
        logging.warning(f"Failed to fetch financial ratios for {symbol}: {e}")
        # Clean up environment variables on error
        if use_proxy:
            import os
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
        
        # Add delay even on error to be respectful
        time.sleep(0.5)
        return None

def fetch_financial_ratios_batch(symbols, max_workers=10, use_proxy=False):
    """Fetch financial ratios for multiple symbols in parallel with rate limiting."""
    logging.info(f"Fetching financial ratios for {len(symbols)} stocks (respecting rate limits)...")
    
    ratios_data = {}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_symbol = {executor.submit(fetch_stock_financial_ratios, symbol, use_proxy): symbol 
                           for symbol in symbols}
        
        # Collect results
        completed = 0
        for future in as_completed(future_to_symbol):
            symbol = future_to_symbol[future]
            try:
                ratios = future.result()
                if ratios:
                    ratios_data[symbol] = ratios
                completed += 1
                
                # Progress logging with delay to be respectful
                if completed % 50 == 0 or completed == len(symbols):
                    logging.info(f"Financial ratios progress: {completed}/{len(symbols)} stocks processed")
                    
            except Exception as e:
                logging.warning(f"Error processing financial ratios for {symbol}: {e}")
    
    logging.info(f"Successfully fetched financial ratios for {len(ratios_data)}/{len(symbols)} stocks")
    return ratios_data

def fetch_ath_prices_batch(symbols, max_workers=10, use_proxy=False):
    """Fetch ATH prices for multiple symbols in parallel."""
    logging.info(f"Fetching ATH prices for {len(symbols)} stocks...")
    
    ath_data = {}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit all tasks
        future_to_symbol = {executor.submit(fetch_stock_ath_price, symbol, use_proxy): symbol 
                           for symbol in symbols}
        
        # Collect results
        completed = 0
        for future in as_completed(future_to_symbol):
            symbol = future_to_symbol[future]
            try:
                ath_price, ath_date = future.result()
                if ath_price is not None:
                    ath_data[symbol] = {
                        "ath_price": ath_price,
                        "ath_date": ath_date,
                        "last_updated": datetime.now().strftime('%Y-%m-%d')
                    }
                completed += 1
                
                # Progress logging
                if completed % 50 == 0 or completed == len(symbols):
                    logging.info(f"ATH progress: {completed}/{len(symbols)} stocks processed")
                    
            except Exception as e:
                logging.warning(f"Error processing ATH for {symbol}: {e}")
    
    logging.info(f"Successfully fetched ATH data for {len(ath_data)}/{len(symbols)} stocks")
    return ath_data

def add_ath_data_to_constituents(constituents_data, ath_data):
    """Add ATH price data to constituents list."""
    if not constituents_data or not ath_data:
        return constituents_data
    
    updated_count = 0
    for constituent in constituents_data:
        symbol = constituent.get('symbol')
        if symbol and symbol in ath_data:
            constituent['ath_price'] = ath_data[symbol]['ath_price']
            constituent['ath_date'] = ath_data[symbol]['ath_date']
            updated_count += 1
    
    logging.info(f"Added ATH data to {updated_count}/{len(constituents_data)} constituents")
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

def process_single_index(index_key, index_info):
    """Process a single index: fetch from both sources and compare."""
    logging.info(f"Processing {index_info['name']}...")
    
    start_time = datetime.now()
    
    # Fetch from SlickCharts
    slickcharts_data = fetch_slickcharts_data(index_info["slickcharts_url"], index_info["name"])
    
    # Fetch from StockAnalysis
    stockanalysis_data = fetch_stockanalysis_data(index_info["stockanalysis_url"], index_info["name"])
    
    # Merge market cap data from StockAnalysis into SlickCharts
    if slickcharts_data and stockanalysis_data:
        slickcharts_data = merge_market_cap_data(slickcharts_data, stockanalysis_data)
    
    # Save SlickCharts data (step 5 requirement)
    if slickcharts_data:
        slick_path = os.path.join(os.path.dirname(__file__), index_info["slickcharts_filename"])
        try:
            with open(slick_path, "w", encoding="utf-8") as f:
                json.dump(slickcharts_data, f, ensure_ascii=False, indent=2)
            logging.info(f"Saved {len(slickcharts_data)} {index_info['name']} SlickCharts constituents to {slick_path}")
        except Exception as e:
            logging.error(f"Failed to save SlickCharts data for {index_info['name']}: {e}")
    
    # Save StockAnalysis data (optional)
    if stockanalysis_data:
        stock_path = os.path.join(os.path.dirname(__file__), index_info["stockanalysis_filename"])
        try:
            with open(stock_path, "w", encoding="utf-8") as f:
                json.dump(stockanalysis_data, f, ensure_ascii=False, indent=2)
            logging.info(f"Saved {len(stockanalysis_data)} {index_info['name']} StockAnalysis constituents to {stock_path}")
        except Exception as e:
            logging.error(f"Failed to save StockAnalysis data for {index_info['name']}: {e}")
    
    # Compare consistency
    is_consistent = compare_constituents(slickcharts_data, stockanalysis_data, index_info['name'])
    
    elapsed = (datetime.now() - start_time).total_seconds()
    logging.info(f"{index_info['name']} processing completed in {elapsed:.1f}s")
    
    return {
        "slickcharts_count": len(slickcharts_data) if slickcharts_data else 0,
        "stockanalysis_count": len(stockanalysis_data) if stockanalysis_data else 0,
        "consistent": is_consistent,
        "slickcharts_data": slickcharts_data
    }

def main(use_proxy=False, target_index=None):
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
            logging.FileHandler(log_file, mode='w', encoding='utf-8'),  # Overwrite log file
            logging.StreamHandler()  # Console output
        ]
    )
    
    if target_index:
        logging.info(f"Starting {INDICES[target_index]['name']} constituents extraction...")
    else:
        logging.info("Starting US Index Constituents extraction...")
    
    logging.info(f"Logs will be saved to: {log_file}")
    
    if use_proxy:
        logging.info("Using proxy for financial data fetching")
    
    total_start_time = datetime.now()
    
    # Filter indices based on target_index parameter
    if target_index:
        indices_to_process = {target_index: INDICES[target_index]}
        logging.info(f"Processing single index: {INDICES[target_index]['name']}")
    else:
        indices_to_process = INDICES
        logging.info("Starting US Index Constituents extraction and comparison...")
    
    results = {}
    
    for index_key, index_info in indices_to_process.items():
        try:
            result = process_single_index(index_key, index_info)
            results[index_key] = result
            
            # Small delay between indices to be respectful
            if index_key != list(indices_to_process.keys())[-1]:
                time.sleep(2)
                
        except Exception as e:
            logging.error(f"Failed to process {index_info['name']}: {e}")
            results[index_key] = {
                "slickcharts_count": 0,
                "stockanalysis_count": 0,
                "consistent": False,
                "slickcharts_data": []
            }
    
    # Collect all unique symbols for ATH fetching
    all_symbols = set()
    for result in results.values():
        if result.get("slickcharts_data"):
            for item in result["slickcharts_data"]:
                if item.get("symbol"):
                    all_symbols.add(item["symbol"])
    
    if all_symbols:
        logging.info(f"Fetching data for {len(all_symbols)} unique symbols...")
        
        # Focus on a smaller set for ratios
        # The full set is used only for ATH prices, which are more reliable with batch API
        all_symbols_list = list(all_symbols)
        
        # Get key symbols for ratios - just the top market cap symbols for each index
        key_symbols = set()
        for index_key, result in results.items():
            if result.get("slickcharts_data"):
                for item in result["slickcharts_data"]:
                    if item.get("symbol"):
                        key_symbols.add(item.get("symbol"))
        
        logging.info(f"Selected {len(key_symbols)} key symbols for financial ratios")
        
        # Use direct individual calls for ratios on key symbols
        logging.info("Fetching financial ratios for key symbols individually...")
        ratios_data = {}
        
        for i, symbol in enumerate(key_symbols):
            try:
                if use_proxy:
                    import os
                    proxy_url = get_proxy_config()
                    os.environ['HTTP_PROXY'] = proxy_url
                    os.environ['HTTPS_PROXY'] = proxy_url
                
                logging.info(f"Fetching ratios for {symbol} ({i+1}/{len(key_symbols)})")
                
                # Create individual ticker and get info
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                ratios = {
                    'pe_ratio': info.get('trailingPE', None),
                    'eps_ttm': info.get('trailingEps', None),
                    'ps_ratio': info.get('priceToSalesTrailing12Months', None),
                    'pb_ratio': info.get('priceToBook', None),
                    'forward_pe': info.get('forwardPE', None)
                }
                
                if any(v is not None for v in ratios.values()):
                    ratios_data[symbol] = ratios
                    logging.info(f"SUCCESS: Got ratios for {symbol}: PE={ratios['pe_ratio']}")
                
                # Clean up proxy env vars
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                
                # Respectful delay between individual requests
                time.sleep(5)
                
            except Exception as e:
                logging.warning(f"Failed to get ratios for {symbol}: {e}")
                # Clean up proxy env vars on error
                if use_proxy:
                    import os
                    if 'HTTP_PROXY' in os.environ:
                        del os.environ['HTTP_PROXY']
                    if 'HTTPS_PROXY' in os.environ:
                        del os.environ['HTTPS_PROXY']
                # Longer delay on error
                time.sleep(8)
        
        logging.info(f"Successfully fetched ratios for {len(ratios_data)}/{len(key_symbols)} key symbols")
        
        # Fetch ATH data using batch API
        logging.info(f"Fetching ATH prices using batch API for {len(all_symbols_list)} symbols...")
        
        # Use batches for ATH data
        batch_size = 10
        all_ath_data = {}
        
        for i in range(0, len(all_symbols_list), batch_size):
            batch_symbols = all_symbols_list[i:i+batch_size]
            batch_num = i//batch_size + 1
            total_batches = (len(all_symbols_list) + batch_size - 1)//batch_size
            
            logging.info(f"Processing ATH batch {batch_num}/{total_batches}: {len(batch_symbols)} symbols")
            
            # For ATH data only
            if use_proxy:
                import os
                proxy_url = get_proxy_config()
                os.environ['HTTP_PROXY'] = proxy_url
                os.environ['HTTPS_PROXY'] = proxy_url
            
            try:
                # Use yfinance batch download for historical data only
                symbols_str = ' '.join(batch_symbols)
                hist_data = yf.download(symbols_str, period="max", group_by='ticker', auto_adjust=True, prepost=True, threads=True, timeout=30)
                
                # Process ATH data
                for symbol in batch_symbols:
                    try:
                        symbol_hist = None
                        if len(batch_symbols) == 1:
                            symbol_hist = hist_data
                        elif hasattr(hist_data, 'columns') and hasattr(hist_data.columns, 'get_level_values'):
                            if symbol in hist_data.columns.get_level_values(0):
                                symbol_hist = hist_data[symbol]
                        
                        if symbol_hist is not None and not symbol_hist.empty and 'High' in symbol_hist.columns:
                            ath_price = symbol_hist['High'].max()
                            ath_date = symbol_hist[symbol_hist['High'] == ath_price].index[0].strftime('%Y-%m-%d')
                            
                            all_ath_data[symbol] = {
                                "ath_price": float(ath_price),
                                "ath_date": ath_date
                            }
                    except Exception as e:
                        logging.warning(f"Failed to process ATH for {symbol}: {e}")
                
            except Exception as e:
                logging.error(f"Batch download failed: {e}")
            
            # Clean up proxy env vars
            if use_proxy:
                import os
                if 'HTTP_PROXY' in os.environ:
                    del os.environ['HTTP_PROXY']
                if 'HTTPS_PROXY' in os.environ:
                    del os.environ['HTTPS_PROXY']
            
            # Delay between batches
            if i + batch_size < len(all_symbols_list):
                delay = 10
                logging.info(f"Waiting {delay}s before next batch...")
                time.sleep(delay)
        
        ath_data = all_ath_data
        
        logging.info(f"Processing completed: ATH for {len(ath_data)} symbols, ratios for {len(ratios_data)} symbols")
        
        # Add both ATH and ratios data to all constituent lists and re-save files
        for index_key, result in results.items():
            if result.get("slickcharts_data"):
                index_info = INDICES[index_key]
                updated_data = result["slickcharts_data"]
                
                # Update constituents with ATH data
                if ath_data:
                    updated_data = add_ath_data_to_constituents(updated_data, ath_data)
                
                # Update constituents with financial ratios
                if ratios_data:
                    updated_data = add_financial_ratios_to_constituents(updated_data, ratios_data)
                
                # Re-save SlickCharts file with all data
                slick_path = os.path.join(os.path.dirname(__file__), index_info["slickcharts_filename"])
                try:
                    with open(slick_path, "w", encoding="utf-8") as f:
                        json.dump(updated_data, f, ensure_ascii=False, indent=2)
                    logging.info(f"Updated {index_info['name']} file with ATH and financial ratios data")
                except Exception as e:
                    logging.error(f"Failed to update {index_info['name']} file with enhanced data: {e}")
    
    # Final summary
    total_elapsed = (datetime.now() - total_start_time).total_seconds()
    logging.info("=" * 60)
    logging.info("FINAL SUMMARY")
    logging.info("=" * 60)
    
    all_consistent = True
    for index_key, result in results.items():
        name = indices_to_process[index_key]["name"]
        slick_count = result["slickcharts_count"]
        stock_count = result["stockanalysis_count"]
        consistent = result["consistent"]
        
        status = "✓ CONSISTENT" if consistent else "✗ INCONSISTENT"
        logging.info(f"{name}:")
        logging.info(f"  SlickCharts: {slick_count} constituents")
        logging.info(f"  StockAnalysis: {stock_count} constituents")
        logging.info(f"  Status: {status}")
        
        if not consistent:
            all_consistent = False
    
    processed_count = len(indices_to_process)
    logging.info(f"Total execution time: {total_elapsed:.1f}s")
    
    if target_index:
        if all_consistent:
            logging.info(f"🎉 {indices_to_process[target_index]['name']} data is consistent between sources!")
        else:
            logging.error(f"⚠️  {indices_to_process[target_index]['name']} shows inconsistencies. Check logs above for details.")
    else:
        if all_consistent:
            logging.info("🎉 All indices show consistent data between sources!")
        else:
            logging.error("⚠️  Some indices show inconsistencies. Check logs above for details.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Fetch US Index Constituents with ATH prices and financial ratios')
    parser.add_argument('--proxy', action='store_true', help='Use proxy for financial data fetching')
    parser.add_argument('--index', choices=['sp500', 'nasdaq100', 'dow'], 
                       help='Fetch only specific index (sp500, nasdaq100, or dow). If not specified, fetches all indices.')
    parser.add_argument('--test-ratios-debug', action='store_true', help='Debug batch ratios fetching issues')
    
    args = parser.parse_args()
    
    if args.test_ratios_debug:
        logging.basicConfig(
            level=logging.INFO,
            format='[%(asctime)s] [%(levelname)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        test_batch_ratios_debug(use_proxy=args.proxy)
    else:
        main(use_proxy=args.proxy, target_index=args.index)