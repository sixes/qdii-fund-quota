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

# Configuration for all indices
INDICES = {
    "sp500": {
        "url": "https://www.slickcharts.com/sp500",
        "expected_count": 500,
        "filename": "sp500_slickcharts.json",
        "name": "S&P 500"
    },
    "nasdaq100": {
        "url": "https://www.slickcharts.com/nasdaq100", 
        "expected_count": 100,
        "filename": "nasdaq100_slickcharts.json",
        "name": "Nasdaq 100"
    },
    "dow": {
        "url": "https://www.slickcharts.com/dowjones",
        "expected_count": 30,
        "filename": "dow_slickcharts.json", 
        "name": "Dow Jones"
    }
}

def fetch_index_data_selenium(url, index_name):
    """Fetch index data using Selenium."""
    logging.info(f"Fetching {index_name} data from {url}")
    
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-images")
    opts.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
    
    # Speed optimizations
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values": {
            "notifications": 2
        }
    }
    opts.add_experimental_option("prefs", prefs)
    
    driver = webdriver.Chrome(options=opts)
    driver.set_page_load_timeout(10)
    
    try:
        start_time = datetime.now()
        driver.get(url)
        
        # Wait for page completion
        WebDriverWait(driver, 8).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(1)  # Minimal wait for JS execution
        
        # Try DOM extraction first (for table-based pages)
        dom_data = parse_table_data_from_dom(driver, index_name)
        
        if dom_data:
            elapsed = (datetime.now() - start_time).total_seconds()
            logging.info(f"Page loaded in {elapsed:.1f}s, extracted {len(dom_data)} companies from table")
            return dom_data
        
        # Fallback to JavaScript extraction (for Nasdaq 100)
        html_content = driver.page_source
        elapsed = (datetime.now() - start_time).total_seconds()
        logging.info(f"Page loaded in {elapsed:.1f}s, HTML content: {len(html_content):,} characters")
        
        return parse_index_data_from_html(html_content, index_name)
        
    except Exception as e:
        logging.error(f"Selenium method failed for {index_name}: {e}")
        return []
    finally:
        driver.quit()

def parse_table_data_from_dom(driver, index_name):
    """Extract data from HTML table using DOM parsing."""
    try:
        # Wait for table to be present
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr"))
        )
        
        # Find all table rows
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        
        if not rows:
            logging.warning(f"No table rows found for {index_name}")
            return []
        
        logging.info(f"Found {len(rows)} table rows for {index_name}")
        
        constituents = []
        for idx, row in enumerate(rows, 1):
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 7:  # Need at least 7 columns based on the structure
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
                
                # Parse price (remove currency symbols and whitespace)
                try:
                    price = float(re.sub(r'[^\d.]', '', price_text))
                except (ValueError, TypeError):
                    price = 0
                
                # Parse net change
                try:
                    net_change = float(re.sub(r'[^\d.-]', '', net_change_text))
                except (ValueError, TypeError):
                    net_change = 0
                
                # Parse percent change (remove parentheses and %)
                try:
                    percent_change = float(re.sub(r'[^\d.-]', '', percent_change_text.replace('(', '').replace(')', '')))
                except (ValueError, TypeError):
                    percent_change = 0
                
                # Parse weight percentage (remove % symbol)
                try:
                    weight_num = float(re.sub(r'[^\d.]', '', weight.replace('%', '')))
                except (ValueError, TypeError):
                    weight_num = 0
                
                # Debug logging for first few rows
                if idx <= 3:
                    logging.info(f"Row {idx}: rank={rank}, symbol={symbol_cell}, name={name_cell}, weight={weight}({weight_num}%), price=${price}")
                
                if symbol_cell and name_cell:  # Only add if we have valid data
                    constituents.append({
                        "no": rank_num,
                        "symbol": symbol_cell,
                        "name": name_cell,
                        "marketCap": 0,  # Not available in table
                        "price": price,
                        "change": percent_change,
                        "weight": weight_num,
                        "netChange": net_change
                    })
                    
            except Exception as e:
                logging.debug(f"Error parsing row {idx} for {index_name}: {e}")
                continue
        
        logging.info(f"Successfully parsed {len(constituents)} companies from table for {index_name}")
        return constituents
        
    except Exception as e:
        logging.warning(f"DOM table parsing failed for {index_name}: {e}")
        return []

def parse_index_data_from_html(html_content, index_name):
    """Extract index data from HTML content."""
    # Try multiple patterns to find JavaScript data
    patterns = [
        r'window\.__sc_init_state__\s*=\s*({.*?});',
        r'__sc_init_state__\s*=\s*({.*?});',
        r'window\.__sc_init_state__\s*=\s*({.*?})\s*;',
        r'var\s+__sc_init_state__\s*=\s*({.*?});',
        r'"companyList"\s*:\s*(\[.*?\])',
    ]
    
    js_data = None
    for pattern in patterns:
        match = re.search(pattern, html_content, re.DOTALL)
        if match:
            js_data = match.group(1)
            logging.info(f"Found data with pattern for {index_name}")
            break
    
    if not js_data:
        # Try fallback patterns for company data
        company_patterns = [
            r'({[^{}]*"companyList"[^{}]*\[[^\]]*"symbol"[^\]]*\][^{}]*})',
            r'(\{.*?"symbol"\s*:\s*"[A-Z]+.*?\})',
        ]
        
        for pattern in company_patterns:
            matches = re.findall(pattern, html_content, re.DOTALL)
            if matches:
                js_data = max(matches, key=len)
                logging.info(f"Found company data with fallback pattern for {index_name}")
                break
    
    if not js_data:
        logging.error(f"Could not find JavaScript data for {index_name}")
        # Save HTML for debugging
        debug_path = os.path.join(os.path.dirname(__file__), f"debug_{index_name.lower().replace(' ', '_')}.html")
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        logging.info(f"Saved HTML content to {debug_path} for debugging")
        return []
    
    logging.info(f"Found JavaScript data for {index_name}: {len(js_data):,} characters")
    
    # Parse JSON data
    company_list = []
    try:
        data = json.loads(js_data)
        company_list = (
            data.get("companyListComponent", {}).get("companyList", []) or
            data.get("companyList", []) or
            (data if isinstance(data, list) else [])
        )
    except json.JSONDecodeError as e:
        logging.warning(f"Failed to parse JavaScript data as JSON for {index_name}: {e}")
        # Try to fix common JSON issues
        js_data_fixed = js_data
        js_data_fixed = re.sub(r',\s*}', '}', js_data_fixed)  # Remove trailing commas
        js_data_fixed = re.sub(r',\s*]', ']', js_data_fixed)
        js_data_fixed = re.sub(r'(\w+):', r'"\1":', js_data_fixed)  # Quote keys
        
        try:
            data = json.loads(js_data_fixed)
            company_list = (
                data.get("companyListComponent", {}).get("companyList", []) or
                data.get("companyList", []) or
                (data if isinstance(data, list) else [])
            )
        except json.JSONDecodeError as e2:
            logging.error(f"Still failed to parse after fixes for {index_name}: {e2}")
            debug_json_path = os.path.join(os.path.dirname(__file__), f"debug_{index_name.lower().replace(' ', '_')}_json.txt")
            with open(debug_json_path, "w", encoding="utf-8") as f:
                f.write(js_data_fixed[:5000])
            logging.info(f"Saved problematic JSON to {debug_json_path}")
            return []
    
    if not company_list:
        logging.error(f"No company list found for {index_name}")
        return []
    
    logging.info(f"Found {len(company_list)} companies for {index_name}")
    
    # Convert to standardized format
    constituents = []
    for idx, company in enumerate(company_list, 1):
        try:
            # Parse market cap
            market_cap = company.get("marketCap", 0)
            if isinstance(market_cap, str):
                market_cap = float(re.sub(r'[^\d.]', '', market_cap))
            
            # Parse price
            last_price = company.get("lastPrice", "0")
            if isinstance(last_price, str):
                last_price = float(re.sub(r'[^\d.]', '', last_price))
            
            # Parse change percent
            change_percent = company.get("changePercent", "0")
            if isinstance(change_percent, str):
                change_percent = float(re.sub(r'[^\d.-]', '', change_percent))
            
            # Parse weight
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
            logging.warning(f"Error parsing company {idx} for {index_name}: {e}")
            continue
    
    return constituents

def fetch_single_index(index_key, index_info):
    """Fetch data for a single index."""
    start_time = datetime.now()
    
    constituents = fetch_index_data_selenium(index_info["url"], index_info["name"])
    
    if not constituents:
        logging.error(f"Failed to fetch {index_info['name']} data")
        return False
    
    # Validate count
    expected_count = index_info["expected_count"]
    if abs(len(constituents) - expected_count) > expected_count * 0.1:  # Allow 10% variance
        logging.warning(f"Unexpected number of constituents for {index_info['name']}: {len(constituents)} (expected ~{expected_count})")
    
    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), index_info["filename"])
    
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(constituents, f, ensure_ascii=False, indent=2)
        
        elapsed = (datetime.now() - start_time).total_seconds()
        logging.info(f"Successfully saved {len(constituents)} {index_info['name']} constituents to {output_path}")
        logging.info(f"{index_info['name']} execution time: {elapsed:.1f}s")
        
        # Show sample data
        logging.info(f"Sample {index_info['name']} data:")
        for i, company in enumerate(constituents[:3]):
            logging.info(f"  {i+1}. {company['symbol']} - {company['name']} (${company['price']}, {company['weight']}%)")
        
        return True
        
    except Exception as e:
        logging.error(f"Failed to save {index_info['name']} data: {e}")
        return False

def main():
    # Configure logging with datetime
    logging.basicConfig(
        level=logging.INFO,
        format='[%(asctime)s] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    total_start_time = datetime.now()
    logging.info("Starting SlickCharts data extraction for all indices...")
    
    results = {}
    for index_key, index_info in INDICES.items():
        success = fetch_single_index(index_key, index_info)
        results[index_key] = success
        
        # Small delay between requests to be respectful
        if index_key != list(INDICES.keys())[-1]:
            time.sleep(2)
    
    # Summary
    total_elapsed = (datetime.now() - total_start_time).total_seconds()
    logging.info("=" * 50)
    logging.info("EXTRACTION SUMMARY")
    logging.info("=" * 50)
    
    for index_key, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        index_name = INDICES[index_key]["name"]
        logging.info(f"{index_name}: {status}")
    
    successful_count = sum(results.values())
    logging.info(f"Total indices processed: {len(INDICES)}")
    logging.info(f"Successful extractions: {successful_count}")
    logging.info(f"Total execution time: {total_elapsed:.1f}s")
    
    if successful_count == len(INDICES):
        logging.info("All index data extracted successfully!")
    else:
        logging.error(f"{len(INDICES) - successful_count} index extraction(s) failed. Check logs above.")

if __name__ == "__main__":
    main()