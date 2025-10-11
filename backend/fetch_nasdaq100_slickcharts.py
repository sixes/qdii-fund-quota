import re
import json
import os
import logging
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
import time

def fetch_nasdaq100_selenium():
    """Fetch Nasdaq 100 data using Selenium."""
    logging.info("Fetching Nasdaq 100 data with Selenium...")
    
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-images")
    opts.add_argument("--disable-javascript")
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
    driver.set_page_load_timeout(10)  # Reduce timeout
    
    try:
        url = "https://www.slickcharts.com/nasdaq100"
        start_time = datetime.now()
        driver.get(url)
        
        # Reduced wait time
        WebDriverWait(driver, 8).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(1)  # Minimal wait for JS execution
        
        html_content = driver.page_source
        elapsed = (datetime.now() - start_time).total_seconds()
        logging.info(f"Page loaded in {elapsed:.1f}s, HTML content: {len(html_content):,} characters")
        
        return fetch_nasdaq100_from_html(html_content)
        
    except Exception as e:
        logging.error(f"Selenium method failed: {e}")
        return []
    finally:
        driver.quit()

def fetch_nasdaq100_from_html(html_content):
    """Extract data from HTML content (used by both requests and selenium methods)."""
    # Try multiple patterns to extract the JavaScript initialization data
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
            logging.info(f"Found data with pattern: {pattern[:50]}...")
            break
    
    logging.info(f"Found JavaScript data: {len(js_data):,} characters")
    
    # Parse the JavaScript object as JSON
    company_list = []
    try:
        data = json.loads(js_data)
        # Try different paths to find company list
        company_list = (
            data.get("companyListComponent", {}).get("companyList", []) or
            data.get("companyList", []) or
            (data if isinstance(data, list) else [])
        )
    except json.JSONDecodeError as e:
        logging.warning(f"Failed to parse JavaScript data as JSON: {e}")
        # Try to fix common JSON issues and parse again
        js_data_fixed = js_data
        # Fix trailing commas
        js_data_fixed = re.sub(r',\s*}', '}', js_data_fixed)
        js_data_fixed = re.sub(r',\s*]', ']', js_data_fixed)
        # Fix unquoted keys
        js_data_fixed = re.sub(r'(\w+):', r'"\1":', js_data_fixed)
        
        try:
            data = json.loads(js_data_fixed)
            company_list = (
                data.get("companyListComponent", {}).get("companyList", []) or
                data.get("companyList", []) or
                (data if isinstance(data, list) else [])
            )
        except json.JSONDecodeError as e2:
            logging.error(f"Still failed to parse after fixes: {e2}")
            # Save problematic JSON for debugging
            debug_json_path = os.path.join(os.path.dirname(__file__), "debug_json.txt")
            with open(debug_json_path, "w", encoding="utf-8") as f:
                f.write(js_data_fixed[:5000])  # First 5000 chars
            logging.info(f"Saved problematic JSON to {debug_json_path}")
            return []
    
    if not company_list:
        logging.error("No company list found in the data")
        return []
    
    logging.info(f"Found {len(company_list)} companies")
    
    # Convert to standardized format
    nasdaq100_constituents = []
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
            
            nasdaq100_constituents.append({
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
            logging.warning(f"Error parsing company {idx}: {e}")
            continue
    
    return nasdaq100_constituents

def main():
    # Configure logging with datetime
    logging.basicConfig(
        level=logging.INFO, 
        format='[%(asctime)s] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    start_time = datetime.now()
    logging.info("Starting Nasdaq 100 data extraction...")
    
    # Use Selenium only
    constituents = fetch_nasdaq100_selenium()
    
    if not constituents:
        logging.error("Failed to fetch Nasdaq 100 data")
        return
    
    # Validate expected count (should be around 100)
    if len(constituents) < 90 or len(constituents) > 110:
        logging.warning(f"Unexpected number of constituents: {len(constituents)} (expected ~100)")
    
    # Save to JSON file
    output_path = os.path.join(os.path.dirname(__file__), "nasdaq100_slickcharts.json")
    
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(constituents, f, ensure_ascii=False, indent=2)
        
        total_time = (datetime.now() - start_time).total_seconds()
        logging.info(f"Successfully saved {len(constituents)} Nasdaq 100 constituents to {output_path}")
        logging.info(f"Total execution time: {total_time:.1f}s")
        
        # Show sample data
        if constituents:
            logging.info("Sample data:")
            for i, company in enumerate(constituents[:10]):
                logging.info(f"  {i+1}. {company['symbol']} - {company['name']} (${company['price']}, {company['weight']}%)")
    
    except Exception as e:
        logging.error(f"Failed to save data: {e}")

if __name__ == "__main__":
    main()