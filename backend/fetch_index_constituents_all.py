from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import re
import json
import os
import logging

INDICES = {
    "sp500": {
        "url": "https://stockanalysis.com/list/sp-500-stocks/",
        "expected_count": 503,
        "filename": "sp500_constituents.json"
    },
    "nasdaq100": {
        "url": "https://stockanalysis.com/list/nasdaq-100-stocks/",
        "expected_count": 101,
        "filename": "nasdaq100_constituents.json"
    },
    "dow": {
        "url": "https://stockanalysis.com/list/dow-jones-stocks/",
        "expected_count": 30,
        "filename": "dow_constituents.json"
    }
}

def build_driver(headless=True):
    opts = Options()
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
    # Speed up: disable images and unnecessary features
    opts.add_argument("--blink-settings=imagesEnabled=false")
    opts.add_argument("--disable-javascript")  # Speed up if JS not needed
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values": {"notifications": 2}
    }
    opts.add_experimental_option("prefs", prefs)
    driver = webdriver.Chrome(options=opts)
    return driver

def extract_from_dom(driver):
    """Extract data directly from DOM using CSS selectors."""
    try:
        # Wait for the table to be present and loaded
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr"))
        )
        
        # Minimal wait for dynamic content to load
        time.sleep(1)
        
        # Try different table selectors
        table_selectors = [
            "table tbody tr",
            "tbody tr", 
            "tr",
            "[data-testid='stock-table'] tbody tr",
            ".stock-table tbody tr"
        ]
        
        rows = []
        for selector in table_selectors:
            try:
                found_rows = driver.find_elements(By.CSS_SELECTOR, selector)
                if len(found_rows) > 10:  # Must have substantial rows
                    rows = found_rows
                    logging.info(f"Found {len(rows)} rows using selector: {selector}")
                    break
            except Exception as e:
                logging.debug(f"Selector '{selector}' failed: {e}")
                continue
        
        if not rows:
            logging.warning("No table rows found with any selector")
            return []
        
        items = []
        for idx, row in enumerate(rows, 1):
            try:
                cells = row.find_elements(By.TAG_NAME, "td")
                if len(cells) < 6:  # Need at least 6 columns: id, ticker, name, market_cap, price, change
                    continue
                
                # Parse by position: id, ticker, name, market_cap, last_price, change_percent
                no = int(cells[0].text.strip()) if cells[0].text.strip().isdigit() else idx
                symbol = cells[1].text.strip()
                name = cells[2].text.strip()
                market_cap_text = cells[3].text.strip()
                price_text = cells[4].text.strip()
                change_text = cells[5].text.strip()
                
                # Parse market cap (handle B/M/T suffixes)
                market_cap = 0
                if market_cap_text and market_cap_text != '-':
                    market_cap_clean = re.sub(r'[^\d.BMT]', '', market_cap_text.upper())
                    try:
                        if 'T' in market_cap_clean:
                            market_cap = float(re.sub(r'[^\d.]', '', market_cap_clean)) * 1_000_000_000_000
                        elif 'B' in market_cap_clean:
                            market_cap = float(re.sub(r'[^\d.]', '', market_cap_clean)) * 1_000_000_000
                        elif 'M' in market_cap_clean:
                            market_cap = float(re.sub(r'[^\d.]', '', market_cap_clean)) * 1_000_000
                        else:
                            market_cap = float(market_cap_clean) if market_cap_clean else 0
                    except ValueError:
                        market_cap = 0
                
                # Parse price
                price = 0
                if price_text and price_text != '-':
                    try:
                        price = float(re.sub(r'[^\d.]', '', price_text))
                    except ValueError:
                        price = 0
                
                # Parse change percentage
                change = 0
                if change_text and change_text != '-':
                    try:
                        change = float(re.sub(r'[^\d.-]', '', change_text))
                    except ValueError:
                        change = 0
                
                if symbol:  # Only add if we have a valid symbol
                    items.append({
                        "no": no,
                        "symbol": symbol,
                        "name": name,
                        "marketCap": int(market_cap),
                        "price": price,
                        "change": change,
                    })
                    
            except Exception as e:
                logging.debug(f"Error parsing row {idx}: {e}")
                continue
        
        logging.info(f"DOM extraction completed: {len(items)} items")
        return items
        
    except Exception as e:
        logging.warning(f"DOM extraction failed: {e}")
        return []

def fetch_index_constituents(index_key, index_info):
    """Fetch constituents for a specific index."""
    driver = build_driver(headless=True)
    try:
        logging.info(f"Fetching {index_key.upper()} constituents from {index_info['url']}")
        driver.get(index_info['url'])
        WebDriverWait(driver, 15).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        
        # Extract data using DOM parsing
        items = extract_from_dom(driver)
        logging.info(f"Items extracted from {index_key.upper()}: {len(items)}")

        # Validate expected count
        expected_count = index_info['expected_count']
        if len(items) != expected_count:
            logging.error(f"Expected {expected_count} items for {index_key.upper()} but got {len(items)}. DOM extraction may have failed.")
            return False

        # Save to JSON file
        out_path = os.path.join(os.path.dirname(__file__), index_info['filename'])
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Successfully saved {len(items)} {index_key.upper()} constituents to {out_path}")
        return True

    except Exception as e:
        logging.error(f"Error fetching {index_key.upper()} constituents: {e}")
        return False
    finally:
        driver.quit()

def main():
    logging.basicConfig(
        level=logging.INFO, 
        format='[%(asctime)s] [%(levelname)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    results = {}
    for index_key, index_info in INDICES.items():
        success = fetch_index_constituents(index_key, index_info)
        results[index_key] = success
        
        # Add a small delay between requests to be respectful
        if index_key != list(INDICES.keys())[-1]:  # Not the last one
            time.sleep(1)
    
    # Summary
    logging.info("=== SUMMARY ===")
    for index_key, success in results.items():
        status = "SUCCESS" if success else "FAILED"
        logging.info(f"{index_key.upper()}: {status}")
    
    all_success = all(results.values())
    if all_success:
        logging.info("All index constituents fetched successfully!")
    else:
        logging.error("Some index fetches failed. Check logs above.")

if __name__ == "__main__":
    main()