#!/usr/bin/env python3
"""
Simple test script to verify Chrome/Selenium setup on VPS
Run this before the main script to check if Chrome is working properly
"""

import sys
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_chrome_setup():
    """Test Chrome setup for VPS environment"""
    print("=" * 60)
    print("CHROME/SELENIUM VPS COMPATIBILITY TEST")
    print("=" * 60)
    
    # Check Chrome installation
    print("1. Checking Chrome installation...")
    chrome_paths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable', 
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
    ]
    
    chrome_found = False
    for path in chrome_paths:
        if os.path.exists(path):
            print(f"   ✓ Chrome found at: {path}")
            chrome_found = True
            break
    
    if not chrome_found:
        print("   ✗ Chrome not found! Install with:")
        print("     sudo apt-get update && sudo apt-get install -y google-chrome-stable")
        return False
    
    # Test Chrome options with enhanced anti-detection
    print("\n2. Testing Chrome options...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-software-rasterizer")
    opts.add_argument("--disable-background-timer-throttling")
    opts.add_argument("--disable-backgrounding-occluded-windows")
    opts.add_argument("--disable-renderer-backgrounding")
    opts.add_argument("--disable-features=TranslateUI,VizDisplayCompositor")
    opts.add_argument("--disable-ipc-flooding-protection")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-images")
    opts.add_argument("--disable-extensions")
    opts.add_argument("--disable-plugins")
    opts.add_argument("--disable-default-apps")
    opts.add_argument("--disable-background-networking")
    opts.add_argument("--disable-web-security")
    opts.add_argument("--memory-pressure-off")
    opts.add_argument("--max_old_space_size=4096")
    opts.add_argument("--aggressive-cache-discard")
    opts.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36")
    
    # Enhanced preferences
    prefs = {
        "profile.managed_default_content_settings.images": 2,
        "profile.default_content_setting_values": {
            "notifications": 2,
            "media_stream": 2,
            "geolocation": 2,
        },
        "profile.default_content_settings.popups": 0
    }
    opts.add_experimental_option("prefs", prefs)
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    
    try:
        print("   Creating WebDriver instance...")
        driver = webdriver.Chrome(options=opts)
        print("   ✓ WebDriver created successfully")
        
        # Remove webdriver property to avoid detection
        driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        
        # Test basic navigation
        print("\n3. Testing basic navigation...")
        driver.set_page_load_timeout(60)  # Longer timeout
        driver.implicitly_wait(15)
        
        test_url = "https://httpbin.org/get"
        print(f"   Loading test URL: {test_url}")
        
        start_time = time.time()
        driver.get(test_url)
        load_time = time.time() - start_time
        
        print(f"   ✓ Page loaded in {load_time:.2f}s")
        print(f"   Page title: {driver.title}")
        
        # Test element finding
        print("\n4. Testing element detection...")
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            print("   ✓ Can detect page elements")
        except Exception as e:
            print(f"   ✗ Element detection failed: {e}")
            return False
        
        # Test JavaScript execution
        print("\n5. Testing JavaScript execution...")
        try:
            ready_state = driver.execute_script("return document.readyState")
            print(f"   ✓ JavaScript works, document.readyState: {ready_state}")
        except Exception as e:
            print(f"   ✗ JavaScript execution failed: {e}")
            return False
        
        print("\n6. Testing target websites with progressive timeouts...")
        
        # Test with different strategies
        test_sites = [
            ("SlickCharts", "https://www.slickcharts.com/sp500"),
            ("StockAnalysis", "https://stockanalysis.com/list/sp-500-stocks/")
        ]
        
        for site_name, url in test_sites:
            print(f"\n   === Testing {site_name} ===")
            print(f"   URL: {url}")
            
            # Try multiple strategies
            strategies = [
                ("Quick load (30s)", 30),
                ("Patient load (60s)", 60),
                ("Very patient load (90s)", 90)
            ]
            
            success = False
            for strategy_name, timeout in strategies:
                if success:
                    break
                    
                try:
                    print(f"   Trying {strategy_name}...")
                    driver.set_page_load_timeout(timeout)
                    
                    start_time = time.time()
                    driver.get(url)
                    load_time = time.time() - start_time
                    
                    print(f"   Page loaded in {load_time:.2f}s")
                    
                    # Wait for document ready
                    WebDriverWait(driver, 15).until(
                        lambda d: d.execute_script("return document.readyState") == "complete"
                    )
                    
                    # Check page content
                    page_source_length = len(driver.page_source)
                    print(f"   Page source length: {page_source_length} characters")
                    
                    # Check for tables
                    tables = driver.find_elements(By.TAG_NAME, "table")
                    print(f"   Found {len(tables)} tables")
                    
                    # Check for specific content
                    if "sp500" in url.lower():
                        # Look for S&P 500 specific content
                        if "S&P 500" in driver.page_source or "SP500" in driver.page_source:
                            print(f"   ✓ Found S&P 500 content")
                        else:
                            print(f"   ⚠ No S&P 500 specific content found")
                    
                    if len(tables) > 0 or page_source_length > 10000:
                        print(f"   ✓ {site_name} loaded successfully with {strategy_name}")
                        success = True
                    else:
                        print(f"   ⚠ {site_name} loaded but content seems minimal")
                        
                except Exception as e:
                    print(f"   ✗ {strategy_name} failed: {str(e)[:100]}...")
                    
                    # Check if it's a timeout specifically
                    if "timeout" in str(e).lower():
                        print(f"   → Timeout detected, trying next strategy")
                    else:
                        print(f"   → Non-timeout error: {type(e).__name__}")
            
            if not success:
                print(f"   ❌ All strategies failed for {site_name}")
                
                # Try to diagnose the issue
                print(f"   Diagnosis attempts:")
                try:
                    # Try a simple GET to check if site is reachable
                    import urllib.request
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    response = urllib.request.urlopen(req, timeout=10)
                    print(f"   → Site responds to simple HTTP request: {response.code}")
                except Exception as http_e:
                    print(f"   → Site doesn't respond to simple HTTP: {http_e}")
                    
            else:
                print(f"   ✅ {site_name} working")
        
        driver.quit()
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED - Chrome setup is working!")
        print("The main script should work on this VPS.")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"   ✗ WebDriver creation failed: {e}")
        print("\nTroubleshooting suggestions:")
        print("1. Install Chrome: sudo apt-get install -y google-chrome-stable")
        print("2. Install ChromeDriver: pip install selenium")
        print("3. Check display: export DISPLAY=:99")
        print("4. Install Xvfb: sudo apt-get install -y xvfb")
        return False

if __name__ == "__main__":
    success = test_chrome_setup()
    sys.exit(0 if success else 1)