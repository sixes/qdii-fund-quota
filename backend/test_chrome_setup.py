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
    """Advanced Chrome/Anti-bot detection troubleshooting"""
    print("=" * 60)
    print("ADVANCED ANTI-BOT DETECTION TROUBLESHOOTING")
    print("=" * 60)
    
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
        
        # Set long timeout for problematic sites
        driver.set_page_load_timeout(120)  # Even longer timeout
        driver.implicitly_wait(20)
        
        print("\n   Testing target websites with detailed anti-bot analysis...")
        
        # Test with different strategies
        test_sites = [
            ("SlickCharts", "https://www.slickcharts.com/sp500"),
            ("StockAnalysis", "https://stockanalysis.com/list/sp-500-stocks/")
        ]
        
        for site_name, url in test_sites:
            print(f"\n   === Testing {site_name} ===")
            print(f"   URL: {url}")
            
            # Try multiple strategies with detailed logging
            strategies = [
                ("Quick load (30s)", 30),
                ("Patient load (60s)", 60), 
                ("Very patient load (90s)", 90),
                ("Ultra patient load (120s)", 120)
            ]
            
            success = False
            for strategy_name, timeout in strategies:
                if success:
                    break
                    
                try:
                    print(f"\n   🚀 Trying {strategy_name}...")
                    driver.set_page_load_timeout(timeout)
                    
                    # First check if site is reachable via curl
                    print(f"   📡 Testing HTTP accessibility...")
                    try:
                        import urllib.request
                        req = urllib.request.Request(url, headers={
                            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
                        })
                        response = urllib.request.urlopen(req, timeout=10)
                        print(f"   ✓ HTTP accessible: {response.code}, Content-Length: {response.headers.get('Content-Length', 'unknown')}")
                    except Exception as http_e:
                        print(f"   ✗ HTTP not accessible: {http_e}")
                        print(f"   ⚠ Site may be blocking requests entirely")
                        continue
                    
                    print(f"   🌐 Starting Chrome navigation...")
                    start_time = time.time()
                    
                    # Monitor navigation stages
                    try:
                        driver.get(url)
                        nav_time = time.time() - start_time
                        print(f"   ✓ Navigation completed in {nav_time:.2f}s")
                    except Exception as nav_e:
                        print(f"   ✗ Navigation failed: {nav_e}")
                        
                        # Analyze the specific error
                        error_str = str(nav_e).lower()
                        if "timeout" in error_str:
                            if "renderer" in error_str:
                                print(f"   💀 RENDERER TIMEOUT - Chrome process hanging")
                                print(f"   🔍 Possible causes:")
                                print(f"       • Anti-bot detection blocking Chrome")
                                print(f"       • Heavy JavaScript execution")
                                print(f"       • Resource loading issues")
                            elif "page load" in error_str:
                                print(f"   ⏰ PAGE LOAD TIMEOUT - Site taking too long")
                                print(f"   🔍 Possible causes:")
                                print(f"       • Slow server response")
                                print(f"       • Large page size")
                                print(f"       • Network issues")
                            else:
                                print(f"   ⏰ GENERIC TIMEOUT")
                        elif "net::" in error_str:
                            print(f"   🌐 NETWORK ERROR - Connection issues")
                        elif "security" in error_str:
                            print(f"   🔒 SECURITY ERROR - SSL/TLS issues")
                        else:
                            print(f"   ❓ UNKNOWN ERROR TYPE: {type(nav_e).__name__}")
                        
                        raise nav_e
                    
                    # Check document state
                    print(f"   📄 Checking document state...")
                    try:
                        ready_state = driver.execute_script("return document.readyState")
                        print(f"   Document ready state: {ready_state}")
                        
                        if ready_state != "complete":
                            print(f"   ⏳ Waiting for document to complete...")
                            WebDriverWait(driver, 15).until(
                                lambda d: d.execute_script("return document.readyState") == "complete"
                            )
                            print(f"   ✓ Document completed")
                    except Exception as doc_e:
                        print(f"   ✗ Document state check failed: {doc_e}")
                    
                    # Analyze page content
                    print(f"   🔍 Analyzing page content...")
                    page_source = driver.page_source
                    page_source_length = len(page_source)
                    print(f"   Page source length: {page_source_length} characters")
                    
                    # Check for anti-bot indicators
                    anti_bot_indicators = [
                        ("Access Denied", "access denied"),
                        ("Blocked", "blocked"),
                        ("Captcha", "captcha"),
                        ("Rate Limited", "rate limit"),
                        ("Bot Detection", "bot"),
                        ("Cloudflare", "cloudflare"),
                        ("Security Check", "security check"),
                        ("Forbidden", "403"),
                    ]
                    
                    detected_blocks = []
                    for indicator_name, indicator_text in anti_bot_indicators:
                        if indicator_text.lower() in page_source.lower():
                            detected_blocks.append(indicator_name)
                    
                    if detected_blocks:
                        print(f"   🚫 ANTI-BOT DETECTION TRIGGERED: {', '.join(detected_blocks)}")
                        print(f"   💡 The site is actively blocking Chrome/automated access")
                        
                        # Show some of the blocking content
                        print(f"   📄 Page content preview:")
                        preview = page_source[:500] if len(page_source) > 500 else page_source
                        print(f"   '{preview}...'")
                        
                        success = False
                        continue
                    else:
                        print(f"   ✓ No obvious anti-bot blocking detected")
                    
                    # Check for tables
                    tables = driver.find_elements(By.TAG_NAME, "table")
                    print(f"   📊 Found {len(tables)} tables")
                    
                    if len(tables) > 0:
                        # Analyze first table
                        first_table = tables[0]
                        rows = first_table.find_elements(By.TAG_NAME, "tr")
                        print(f"   📋 First table has {len(rows)} rows")
                        
                        if len(rows) > 5:  # Reasonable number of rows for stock data
                            print(f"   ✅ Table structure looks good for stock data")
                            success = True
                        else:
                            print(f"   ⚠ Table seems too small for stock data")
                    
                    # Check for specific content
                    if "sp500" in url.lower():
                        content_indicators = ["S&P 500", "SP500", "Standard & Poor", "stocks", "companies"]
                        found_indicators = [ind for ind in content_indicators if ind.lower() in page_source.lower()]
                        if found_indicators:
                            print(f"   ✓ Found relevant content indicators: {', '.join(found_indicators)}")
                            success = True
                        else:
                            print(f"   ⚠ No S&P 500 specific content found")
                    
                    if success:
                        total_time = time.time() - start_time
                        print(f"   🎉 {site_name} SUCCESS with {strategy_name} (total: {total_time:.2f}s)")
                    else:
                        print(f"   ⚠ {site_name} loaded but content validation failed")
                        
                except Exception as e:
                    print(f"   💥 {strategy_name} FAILED: {str(e)[:200]}...")
                    
                    # Detailed error analysis
                    error_str = str(e).lower()
                    print(f"   🔍 Error analysis:")
                    if "timeout" in error_str and "renderer" in error_str:
                        print(f"       • CHROME RENDERER HANGING - likely anti-bot detection")
                        print(f"       • Site may be running anti-automation JavaScript")
                        print(f"       • Chrome process stuck waiting for response")
                    elif "timeout" in error_str:
                        print(f"       • TIMEOUT - site taking too long to respond") 
                    elif "connection" in error_str:
                        print(f"       • CONNECTION ISSUE - network problem")
                    elif "security" in error_str:
                        print(f"       • SECURITY/SSL ISSUE")
                    else:
                        print(f"       • UNKNOWN ERROR TYPE: {type(e).__name__}")
                    
                    print(f"   ⏭ Trying next strategy...")
            
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