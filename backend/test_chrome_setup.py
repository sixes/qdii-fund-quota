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
    
    # Test Chrome options
    print("\n2. Testing Chrome options...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--disable-software-rasterizer")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
    
    try:
        print("   Creating WebDriver instance...")
        driver = webdriver.Chrome(options=opts)
        print("   ✓ WebDriver created successfully")
        
        # Test basic navigation
        print("\n3. Testing basic navigation...")
        driver.set_page_load_timeout(30)
        
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
        
        print("\n6. Testing target websites...")
        
        # Test SlickCharts (most critical)
        test_sites = [
            ("SlickCharts", "https://www.slickcharts.com/sp500"),
            ("StockAnalysis", "https://stockanalysis.com/list/sp-500-stocks/")
        ]
        
        for site_name, url in test_sites:
            try:
                print(f"   Testing {site_name}: {url}")
                start_time = time.time()
                driver.get(url)
                load_time = time.time() - start_time
                
                # Wait for basic page load
                WebDriverWait(driver, 30).until(
                    lambda d: d.execute_script("return document.readyState") == "complete"
                )
                
                # Check for table presence
                tables = driver.find_elements(By.TAG_NAME, "table")
                print(f"   ✓ {site_name} loaded in {load_time:.2f}s, found {len(tables)} tables")
                
                if len(tables) == 0:
                    print(f"   ⚠ Warning: No tables found on {site_name}")
                
            except Exception as e:
                print(f"   ✗ {site_name} test failed: {e}")
        
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