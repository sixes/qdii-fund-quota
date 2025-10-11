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
    """Create HTTP session with realistic headers"""
    session = requests.Session()
    
    # Realistic browser headers
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
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
        
        # Parse with BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for tables
        tables = soup.find_all('table')
        logging.info(f"Found {len(tables)} tables in HTML")
        
        if not tables:
            logging.warning(f"No tables found for {index_name}")
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

def test_http_fallback():
    """Test HTTP-based fallback methods"""
    print("=" * 60)
    print("TESTING HTTP FALLBACK METHODS")
    print("=" * 60)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # Test original sites with HTTP
    test_sites = [
        ("SlickCharts SP500", "https://www.slickcharts.com/sp500"),
        ("SlickCharts Dow", "https://www.slickcharts.com/dowjones")
    ]
    
    for site_name, url in test_sites:
        print(f"\n🌐 Testing {site_name}...")
        constituents = fetch_slickcharts_http(url, site_name)
        
        if constituents:
            print(f"✅ SUCCESS: Found {len(constituents)} companies")
            print("📋 Sample data:")
            for i, company in enumerate(constituents[:3], 1):
                print(f"   {i}. {company['symbol']} - {company['name']}")
        else:
            print(f"❌ FAILED: No data extracted")
    
    # Test alternative sources
    print(f"\n🔄 Testing alternative data sources...")
    alt_data = fetch_alternative_sp500_data()
    
    if alt_data:
        print(f"✅ ALTERNATIVE SUCCESS: Found {len(alt_data)} companies")
        print("📋 Sample data:")
        for i, company in enumerate(alt_data[:5], 1):
            print(f"   {i}. {company['symbol']} - {company['name']}")
    else:
        print(f"❌ ALTERNATIVE FAILED: No alternative sources worked")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    test_http_fallback()