#!/usr/bin/env python3
"""
HTTP-based fallback scraper for sites that block Chrome/Selenium
Uses requests library to fetch data like curl does
"""

import requests
import json
import re
from bs4 import BeautifulSoup
import time
import logging

def create_http_session():
    """Create HTTP session with realistic headers and anti-detection measures"""
    session = requests.Session()
    
    # Rotate user agents to avoid detection patterns
    import random
    user_agents = [
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    ]
    
    # Realistic browser headers (let requests handle compression automatically)
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
    
    # Add session persistence and connection pooling
    session.verify = True
    
    return session

def fetch_slickcharts_http(url, index_name):
    """Fetch SlickCharts data using HTTP requests instead of Chrome"""
    logging.info(f"Fetching {index_name} via HTTP from: {url}")
    
    session = create_http_session()
    
    try:
        # Add random delay to seem more human
        time.sleep(2)
        
        response = session.get(url, timeout=30)
        response.raise_for_status()
        
        logging.info(f"HTTP response: {response.status_code}, Content-Length: {len(response.content)}")
        logging.info(f"Response headers: {dict(response.headers)}")
        
        # Handle potential encoding issues
        try:
            # Try to get text content properly
            if response.encoding is None:
                response.encoding = 'utf-8'
            html_content = response.text
            logging.info("Successfully decoded response text")
        except UnicodeDecodeError:
            # Fallback to raw content with error handling
            html_content = response.content.decode('utf-8', errors='replace')
            logging.warning("Used fallback decoding with error replacement")
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Debug: Check what we actually got
        logging.info(f"HTML preview (first 500 chars): {html_content[:500]}")
        
        # Check if the content looks like HTML or if it's still garbled
        if html_content.startswith('<!DOCTYPE html>') or '<html' in html_content[:100]:
            logging.info("✓ Content appears to be valid HTML")
        else:
            logging.warning("⚠ Content doesn't look like HTML, may still be compressed or encoded")
            
            # Try alternative decompression methods
            content_encoding = response.headers.get('Content-Encoding', '').lower()
            logging.info(f"Content-Encoding: {content_encoding}")
            
            try:
                if content_encoding == 'br':
                    # Brotli compression
                    import brotli
                    decompressed = brotli.decompress(response.content)
                    html_content = decompressed.decode('utf-8')
                    soup = BeautifulSoup(html_content, 'html.parser')
                    logging.info("✓ Successfully decompressed Brotli content")
                elif content_encoding == 'gzip':
                    # GZIP compression
                    import gzip
                    decompressed = gzip.decompress(response.content)
                    html_content = decompressed.decode('utf-8')
                    soup = BeautifulSoup(html_content, 'html.parser')
                    logging.info("✓ Successfully decompressed GZIP content")
                else:
                    # Try auto-decompression
                    import gzip, brotli
                    
                    # Try brotli first (common with Cloudflare)
                    try:
                        decompressed = brotli.decompress(response.content)
                        html_content = decompressed.decode('utf-8')
                        soup = BeautifulSoup(html_content, 'html.parser')
                        logging.info("✓ Successfully decompressed with Brotli (auto-detected)")
                    except:
                        # Try gzip
                        try:
                            decompressed = gzip.decompress(response.content)
                            html_content = decompressed.decode('utf-8')
                            soup = BeautifulSoup(html_content, 'html.parser')
                            logging.info("✓ Successfully decompressed with GZIP (auto-detected)")
                        except:
                            logging.warning("Failed to decompress with both Brotli and GZIP")
                            raise
                            
            except Exception as e:
                logging.info(f"Decompression failed: {e}")
                
                # Try with html.parser as fallback (doesn't need lxml)
                try:
                    soup = BeautifulSoup(response.content, 'html.parser')
                    html_content = str(soup)
                    logging.info("✓ Using html.parser as fallback")
                except Exception as e2:
                    logging.warning(f"html.parser also failed: {e2}")
        
        # Check if this looks like a blocking page
        blocking_indicators = ['cloudflare', 'access denied', 'forbidden', 'blocked', 'captcha']
        content_lower = html_content.lower()
        detected_blocks = [indicator for indicator in blocking_indicators if indicator in content_lower]
        
        if detected_blocks:
            logging.warning(f"HTTP request may be blocked: detected {detected_blocks}")
            logging.info("Trying to extract any available data anyway...")
        else:
            logging.info("✓ No obvious blocking detected in HTTP response")
        
        # Look for tables
        tables = soup.find_all('table')
        logging.info(f"Found {len(tables)} tables in HTML")
        
        # Also check for JavaScript data patterns that might contain the stock data
        js_patterns = [
            r'window\.__sc_init_state__\s*=\s*({.*?});',
            r'__sc_init_state__\s*=\s*({.*?});',
            r'"companyList"\s*:\s*(\[.*?\])',
            r'var\s+companies\s*=\s*(\[.*?\]);',
            r'const\s+data\s*=\s*({.*?});'
        ]
        
        js_data = None
        for pattern in js_patterns:
            match = re.search(pattern, html_content, re.DOTALL)
            if match:
                js_data = match.group(1)
                logging.info(f"Found JavaScript data pattern: {pattern}")
                break
        
        if js_data:
            logging.info("Attempting to parse JavaScript data...")
            try:
                data = json.loads(js_data)
                logging.info(f"JavaScript data type: {type(data)}")
                
                # Try to extract company list from various possible structures
                company_list = None
                if isinstance(data, list):
                    company_list = data
                elif isinstance(data, dict):
                    # Check various possible keys
                    possible_keys = ['companyList', 'companies', 'data', 'stocks', 'constituents']
                    for key in possible_keys:
                        if key in data:
                            company_list = data[key]
                            break
                    
                    # Check nested structures
                    if not company_list and 'companyListComponent' in data:
                        comp_data = data['companyListComponent']
                        if isinstance(comp_data, dict) and 'companyList' in comp_data:
                            company_list = comp_data['companyList']
                
                if company_list and isinstance(company_list, list):
                    logging.info(f"Found company list with {len(company_list)} entries")
                    
                    # Convert JavaScript data to our format
                    constituents = []
                    for idx, company in enumerate(company_list, 1):
                        try:
                            if isinstance(company, dict):
                                symbol = company.get('symbol', '')
                                name = company.get('name', '') or company.get('companyName', '')
                                weight = company.get('weight', 0)
                                
                                if isinstance(weight, str):
                                    weight = float(re.sub(r'[^\d.]', '', weight.replace('%', '')))
                                
                                if symbol and name:
                                    constituents.append({
                                        "no": company.get('rank', idx),
                                        "symbol": symbol,
                                        "name": name,
                                        "weight": weight,
                                        "marketCap": company.get('marketCap', 0),
                                        "price": company.get('lastPrice', 0) or company.get('price', 0),
                                        "change": company.get('changePercent', 0) or company.get('change', 0)
                                    })
                                    
                                    if idx <= 3:
                                        logging.info(f"JS Row {idx}: {symbol} - {name} ({weight}%)")
                        except Exception as e:
                            logging.debug(f"Error parsing JS company {idx}: {e}")
                    
                    if constituents:
                        logging.info(f"JavaScript parsing extracted {len(constituents)} companies")
                        return constituents
                
            except json.JSONDecodeError as e:
                logging.warning(f"Failed to parse JavaScript data as JSON: {e}")
        
        if not tables:
            logging.warning(f"No tables found for {index_name}")
            logging.info("The site likely uses JavaScript to dynamically load content")
            return []
        
        # Parse the main data table (usually the largest one)
        main_table = max(tables, key=lambda t: len(t.find_all('tr')))
        rows = main_table.find_all('tr')
        
        logging.info(f"Main table has {len(rows)} rows")
        
        constituents = []
        for idx, row in enumerate(rows[1:], 1):  # Skip header row
            try:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 4:  # Need at least rank, name, symbol, weight
                    continue
                
                # Extract text from cells
                cell_texts = [cell.get_text(strip=True) for cell in cells]
                
                # Basic parsing (may need adjustment based on actual table structure)
                if len(cell_texts) >= 7:
                    rank_text = cell_texts[0]
                    name_text = cell_texts[1]
                    symbol_text = cell_texts[2]
                    weight_text = cell_texts[3]
                    
                    # Parse rank
                    try:
                        rank = int(re.sub(r'[^\d]', '', rank_text)) if rank_text.strip() else idx
                    except:
                        rank = idx
                    
                    # Parse weight
                    try:
                        weight = float(re.sub(r'[^\d.]', '', weight_text.replace('%', '')))
                    except:
                        weight = 0
                    
                    if symbol_text and name_text:
                        constituents.append({
                            "no": rank,
                            "symbol": symbol_text,
                            "name": name_text,
                            "weight": weight,
                            "marketCap": 0,
                            "price": 0,
                            "change": 0
                        })
                        
                        # Log first few for debugging
                        if idx <= 3:
                            logging.info(f"HTTP Row {idx}: {symbol_text} - {name_text} ({weight}%)")
                
            except Exception as e:
                logging.debug(f"Error parsing HTTP row {idx}: {e}")
                continue
        
        logging.info(f"HTTP parsing extracted {len(constituents)} companies for {index_name}")
        return constituents
        
    except Exception as e:
        logging.error(f"HTTP request failed for {index_name}: {e}")
        return []

def fetch_alternative_sp500_data():
    """Fetch S&P 500 data from alternative sources"""
    logging.info("Trying alternative S&P 500 data sources...")
    
    # Alternative data sources that may not block requests
    alternative_sources = [
        {
            "name": "Wikipedia S&P 500",
            "url": "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            "table_class": "wikitable"
        },
        {
            "name": "Yahoo Finance (if available)",
            "url": "https://finance.yahoo.com/quote/%5EGSPC/components",
            "table_class": None
        }
    ]
    
    session = create_http_session()
    
    for source in alternative_sources:
        try:
            logging.info(f"Trying {source['name']}: {source['url']}")
            
            time.sleep(3)  # Be respectful
            response = session.get(source['url'], timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find tables
            if source['table_class']:
                tables = soup.find_all('table', class_=source['table_class'])
            else:
                tables = soup.find_all('table')
            
            logging.info(f"{source['name']}: Found {len(tables)} tables")
            
            if tables:
                # Try to parse the first reasonable table
                for table in tables:
                    rows = table.find_all('tr')
                    if len(rows) > 50:  # Reasonable size for S&P 500 data
                        logging.info(f"{source['name']}: Found table with {len(rows)} rows")
                        
                        # Parse table content
                        constituents = []
                        for idx, row in enumerate(rows[1:], 1):  # Skip header
                            cells = row.find_all(['td', 'th'])
                            if len(cells) >= 2:
                                cell_texts = [cell.get_text(strip=True) for cell in cells]
                                
                                # Look for symbol pattern (usually 1-5 uppercase letters)
                                symbol = None
                                for text in cell_texts:
                                    if re.match(r'^[A-Z]{1,5}$', text.strip()):
                                        symbol = text.strip()
                                        break
                                
                                if symbol:
                                    # Find company name (usually longer text)
                                    name = None
                                    for text in cell_texts:
                                        if len(text) > 10 and text != symbol:
                                            name = text.strip()
                                            break
                                    
                                    if name:
                                        constituents.append({
                                            "no": idx,
                                            "symbol": symbol,
                                            "name": name,
                                            "weight": 0,
                                            "marketCap": 0,
                                            "price": 0,
                                            "change": 0
                                        })
                        
                        if len(constituents) > 400:  # Reasonable for S&P 500
                            logging.info(f"✅ {source['name']}: Successfully parsed {len(constituents)} companies")
                            return constituents
                        else:
                            logging.info(f"⚠ {source['name']}: Only found {len(constituents)} companies, trying next source")
                
        except Exception as e:
            logging.warning(f"❌ {source['name']} failed: {e}")
            continue
    
    logging.error("All alternative sources failed")
    return []

def fetch_index_constituents_http(index_name, url):
    """
    Production-ready HTTP scraper for index constituents
    Designed to be respectful and avoid detection
    """
    logging.info(f"Fetching {index_name} constituents via HTTP...")
    
    try:
        constituents = fetch_slickcharts_http(url, index_name)
        
        if constituents:
            logging.info(f"✅ Successfully extracted {len(constituents)} {index_name} constituents")
            return constituents
        else:
            logging.error(f"❌ Failed to extract {index_name} constituents")
            return []
            
    except Exception as e:
        logging.error(f"❌ HTTP scraping failed for {index_name}: {e}")
        return []

def test_http_fallback():
    """Test HTTP-based scraping methods"""
    print("=" * 60)
    print("TESTING HTTP FALLBACK METHODS")
    print("=" * 60)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # Test index data extraction
    test_indices = [
        ("S&P 500", "https://www.slickcharts.com/sp500"),
        ("Dow Jones", "https://www.slickcharts.com/dowjones"),
        ("Nasdaq 100", "https://www.slickcharts.com/nasdaq100")
    ]
    
    for index_name, url in test_indices:
        print(f"\n🌐 Testing {index_name}...")
        constituents = fetch_index_constituents_http(index_name, url)
        
        if constituents:
            print(f"✅ SUCCESS: Found {len(constituents)} companies")
            print("📋 Sample data:")
            for i, company in enumerate(constituents[:3], 1):
                print(f"   {i}. {company['symbol']} - {company['name']} ({company.get('weight', 0)}%)")
        else:
            print(f"❌ FAILED: No data extracted")
        
        # Respectful delay between different indices
        if index_name != test_indices[-1][0]:
            time.sleep(5)
    
    print(f"\n🎯 HTTP scraping test completed")
    print("=" * 60)

if __name__ == "__main__":
    test_http_fallback()