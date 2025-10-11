import requests

# API key
API_KEY = "0PiGMLziO6MqzWvg13SHFCzjYkoHQ4fD"

# Stable endpoints per FMP docs
SP500_URL = "https://financialmodelingprep.com/stable/sp500_constituent"
NASDAQ100_URL = "https://financialmodelingprep.com/stable/nasdaq_constituent"
QUOTE_URL = "https://financialmodelingprep.com/stable/quote/"  # use path symbols, comma-separated

# Fallback endpoints (plural/singular, stable/api)
SP500_ENDPOINTS = [
    "https://financialmodelingprep.com/stable/sp500_constituents",
    "https://financialmodelingprep.com/stable/sp500_constituent",
    "https://financialmodelingprep.com/api/v3/sp500_constituents",
    "https://financialmodelingprep.com/api/v3/sp500_constituent",
]

NASDAQ100_ENDPOINTS = [
    "https://financialmodelingprep.com/stable/nasdaq_100_constituents",
    "https://financialmodelingprep.com/stable/nasdaq_constituents",
    "https://financialmodelingprep.com/stable/nasdaq_constituent",
    "https://financialmodelingprep.com/api/v3/nasdaq_100_constituents",
    "https://financialmodelingprep.com/api/v3/nasdaq_constituents",
    "https://financialmodelingprep.com/api/v3/nasdaq_constituent",
]


def fetch_index_constituents(url):
    """Fetch index constituents from the given URL."""
    resp = requests.get(f"{url}?apikey={API_KEY}")
    if resp.status_code == 200:
        return resp.json()
    print(f"Failed to fetch data from {url}. Status: {resp.status_code}. Body: {resp.text}")
    return []


def fetch_index_constituents_multi(urls):
    """Try multiple endpoints until one succeeds with non-empty data."""
    for base in urls:
        resp = requests.get(f"{base}?apikey={API_KEY}")
        if resp.status_code == 200:
            try:
                data = resp.json()
            except Exception:
                data = None
            if isinstance(data, list) and data:
                return data
            if isinstance(data, dict):
                # Some endpoints might wrap data; adapt if needed
                for key in ("symbols", "constituents", "components", "data"):
                    if key in data and isinstance(data[key], list) and data[key]:
                        return data[key]
        else:
            print(f"Tried {base} -> {resp.status_code}")
    print("All endpoints failed or returned empty data.")
    return []


def fetch_last_closing_prices(symbols):
    """Fetch last closing prices for a list of symbols using batched requests."""
    if not symbols:
        return {}
    out = {}
    BATCH = 100  # avoid overly long URLs
    for i in range(0, len(symbols), BATCH):
        batch = symbols[i:i + BATCH]
        url = f"{QUOTE_URL}{','.join(batch)}?apikey={API_KEY}"
        resp = requests.get(url)
        if resp.status_code == 200:
            for item in resp.json():
                sym = item.get("symbol")
                if sym:
                    out[sym] = item
        else:
            print(f"Failed to fetch quotes batch starting {batch[0]}. Status: {resp.status_code}. Body: {resp.text}")
    return out


def main():
    # Fetch S&P 500 constituents (try multiple endpoints)
    sp500 = fetch_index_constituents_multi(SP500_ENDPOINTS)
    sp500_symbols = [it.get("symbol") for it in sp500 if it.get("symbol")]
    sp500_prices = fetch_last_closing_prices(sp500_symbols)

    print("S&P 500 Constituents:")
    for it in sp500:
        symbol = it.get("symbol", "")
        if not symbol:
            continue
        name = it.get("name", "N/A")
        sector = it.get("sector", "N/A")
        price = sp500_prices.get(symbol, {}).get("price", "N/A")
        print(f"{symbol}: {name}, Sector: {sector}, Last Price: {price}")

    # Fetch Nasdaq 100 constituents (try multiple endpoints)
    nasdaq = fetch_index_constituents_multi(NASDAQ100_ENDPOINTS)
    nasdaq_symbols = [it.get("symbol") for it in nasdaq if it.get("symbol")]
    nasdaq_prices = fetch_last_closing_prices(nasdaq_symbols)

    print("\nNasdaq 100 Constituents:")
    for it in nasdaq:
        symbol = it.get("symbol", "")
        if not symbol:
            continue
        name = it.get("name", "N/A")
        sector = it.get("sector", "N/A")  # may be missing
        price = nasdaq_prices.get(symbol, {}).get("price", "N/A")
        print(f"{symbol}: {name}, Sector: {sector}, Last Price: {price}")


if __name__ == "__main__":
    main()