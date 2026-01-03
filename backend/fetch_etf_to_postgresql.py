#!/usr/bin/env python3
"""
Script to fetch ETF data from StockAnalysis API and store in PostgreSQL.
Replaces DynamoDB with PostgreSQL via SQLAlchemy.
Runs daily via cron with batch operations, health check reporting, and logging.
"""

import json
import logging
import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from urllib.parse import urlparse

import requests
import psycopg2
from psycopg2.extras import execute_batch
from psycopg2.pool import SimpleConnectionPool

# Configuration
API_URL = "https://stockanalysis.com/api/screener/e/bd/etfLeverage+issuer+aum+etfIndex+assetClass+expenseRatio+peRatio+price+volume+ch1w+ch1m+ch6m+chYTD+ch1y+ch3y+ch5y+ch10y+high52+low52+allTimeLow+allTimeLowChange+allTimeHigh+allTimeHighDate+allTimeHighChange+allTimeLowDate+inceptionDate.json"
HEALTHCHECK_URL = "https://hc-ping.com/f626df6e-552b-46a7-8ebf-f23865a042c4"
LOG_FILE = "etf_sync.log"
BATCH_SIZE = 25

# Load DATABASE_URL from .env.local if available
def get_db_config():
    """Parse DATABASE_URL from .env.local or environment variables."""
    # First try to load from .env.local in parent directory
    env_file = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=', 1)[1].strip('"\'')
                    # Parse PostgreSQL URL: postgresql://user:password@host:port/database
                    parsed = urlparse(database_url)
                    return {
                        'host': parsed.hostname or 'localhost',
                        'port': parsed.port or 5432,
                        'database': parsed.path.lstrip('/') or 'postgres',
                        'user': parsed.username or 'postgres',
                        'password': parsed.password or '',
                    }
    
    # Fall back to environment variables
    return {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', '5432')),
        'database': os.getenv('DB_NAME', 'postgres'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
    }

db_config = get_db_config()
DB_HOST = db_config['host']
DB_PORT = db_config['port']
DB_NAME = db_config['database']
DB_USER = db_config['user']
DB_PASSWORD = db_config['password']

# Setup logging
def setup_logging():
    """Configure logging to both file and console."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    logger.handlers = []

    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(console_handler)

    return logger

logger = setup_logging()


def get_db_connection():
    """Get PostgreSQL connection."""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        raise


def healthcheck_start():
    """Signal healthcheck that the job has started."""
    try:
        requests.get(f"{HEALTHCHECK_URL}/start", timeout=10)
        logger.info("Healthcheck: Job started")
    except Exception as e:
        logger.warning(f"Failed to send healthcheck start signal: {e}")


def healthcheck_success():
    """Signal healthcheck that the job completed successfully."""
    try:
        requests.get(HEALTHCHECK_URL, timeout=10)
        logger.info("Healthcheck: Job completed successfully")
    except Exception as e:
        logger.warning(f"Failed to send healthcheck success signal: {e}")


def healthcheck_fail(error_msg):
    """Signal healthcheck that the job failed."""
    try:
        requests.post(f"{HEALTHCHECK_URL}/fail", data=error_msg, timeout=10)
        logger.info("Healthcheck: Job failed signal sent")
    except Exception as e:
        logger.warning(f"Failed to send healthcheck fail signal: {e}")


def fetch_etf_data():
    """Fetch ETF data from the API."""
    logger.info("Fetching data from API...")
    response = requests.get(API_URL, timeout=30)
    response.raise_for_status()

    data = response.json()
    if data.get('status') == 200:
        etf_data = data.get('data', {}).get('data', {})
        logger.info(f"Fetched {len(etf_data)} ETF records")
        return etf_data
    else:
        raise Exception(f"API returned status: {data.get('status')}")


def fetch_existing_etf_tickers(conn):
    """Fetch all existing ETF tickers from the database."""
    logger.info("Fetching existing ETF tickers from database...")
    try:
        cur = conn.cursor()
        cur.execute("SELECT ticker FROM etf_data")
        existing_tickers = set(row[0] for row in cur.fetchall())
        cur.close()
        logger.info(f"Found {len(existing_tickers)} existing ETFs in database")
        return existing_tickers
    except Exception as e:
        logger.warning(f"Failed to fetch existing ETFs: {e}")
        return set()


def batch_write_to_postgresql(conn, etf_data):
    """
    Upsert ETF data into PostgreSQL using UPSERT (ON CONFLICT).
    """
    logger.info(f"Starting batch upsert of {len(etf_data)} ETF records...")

    items = []
    current_timestamp = datetime.utcnow()

    for ticker, data in etf_data.items():
        item = {
            'ticker': ticker,
            'etfLeverage': data.get('etfLeverage'),
            'issuer': data.get('issuer'),
            'aum': float(data.get('aum')) if data.get('aum') else None,
            'assetClass': data.get('assetClass'),
            'expenseRatio': float(data.get('expenseRatio')) if data.get('expenseRatio') else None,
            'peRatio': float(data.get('peRatio')) if data.get('peRatio') else None,
            'price': float(data.get('price')) if data.get('price') else None,
            'volume': int(data.get('volume')) if data.get('volume') else None,
            'ch1w': float(data.get('ch1w')) if data.get('ch1w') else None,
            'ch1m': float(data.get('ch1m')) if data.get('ch1m') else None,
            'ch6m': float(data.get('ch6m')) if data.get('ch6m') else None,
            'chYTD': float(data.get('chYTD')) if data.get('chYTD') else None,
            'ch1y': float(data.get('ch1y')) if data.get('ch1y') else None,
            'ch3y': float(data.get('ch3y')) if data.get('ch3y') else None,
            'ch5y': float(data.get('ch5y')) if data.get('ch5y') else None,
            'ch10y': float(data.get('ch10y')) if data.get('ch10y') else None,
            'high52': float(data.get('high52')) if data.get('high52') else None,
            'low52': float(data.get('low52')) if data.get('low52') else None,
            'allTimeLow': float(data.get('allTimeLow')) if data.get('allTimeLow') else None,
            'allTimeLowChange': float(data.get('allTimeLowChange')) if data.get('allTimeLowChange') else None,
            'allTimeHigh': float(data.get('allTimeHigh')) if data.get('allTimeHigh') else None,
            'allTimeHighChange': float(data.get('allTimeHighChange')) if data.get('allTimeHighChange') else None,
            'allTimeHighDate': data.get('allTimeHighDate'),
            'allTimeLowDate': data.get('allTimeLowDate'),
            'etfIndex': data.get('etfIndex'),
            'inceptionDate': data.get('inceptionDate'),
            'lastUpdated': current_timestamp
        }
        items.append(item)

    try:
        cur = conn.cursor()
        
        # Upsert query using PostgreSQL ON CONFLICT (using snake_case for column names)
        upsert_query = """
            INSERT INTO etf_data (
                ticker, "etfLeverage", issuer, aum, "assetClass", "expenseRatio", "peRatio",
                price, volume, ch1w, ch1m, ch6m, "chYTD", ch1y, ch3y, ch5y, ch10y,
                high52, low52, "allTimeLow", "allTimeLowChange", "allTimeHigh", "allTimeHighChange",
                "allTimeHighDate", "allTimeLowDate", "etfIndex", "inceptionDate", "lastUpdated"
            ) VALUES (
                %(ticker)s, %(etfLeverage)s, %(issuer)s, %(aum)s, %(assetClass)s,
                %(expenseRatio)s, %(peRatio)s, %(price)s, %(volume)s, %(ch1w)s,
                %(ch1m)s, %(ch6m)s, %(chYTD)s, %(ch1y)s, %(ch3y)s, %(ch5y)s, %(ch10y)s,
                %(high52)s, %(low52)s, %(allTimeLow)s, %(allTimeLowChange)s,
                %(allTimeHigh)s, %(allTimeHighChange)s, %(allTimeHighDate)s,
                %(allTimeLowDate)s, %(etfIndex)s, %(inceptionDate)s, %(lastUpdated)s
            ) ON CONFLICT (ticker) DO UPDATE SET
                "etfLeverage" = EXCLUDED."etfLeverage",
                issuer = EXCLUDED.issuer,
                aum = EXCLUDED.aum,
                "assetClass" = EXCLUDED."assetClass",
                "expenseRatio" = EXCLUDED."expenseRatio",
                "peRatio" = EXCLUDED."peRatio",
                price = EXCLUDED.price,
                volume = EXCLUDED.volume,
                ch1w = EXCLUDED.ch1w,
                ch1m = EXCLUDED.ch1m,
                ch6m = EXCLUDED.ch6m,
                "chYTD" = EXCLUDED."chYTD",
                ch1y = EXCLUDED.ch1y,
                ch3y = EXCLUDED.ch3y,
                ch5y = EXCLUDED.ch5y,
                ch10y = EXCLUDED.ch10y,
                high52 = EXCLUDED.high52,
                low52 = EXCLUDED.low52,
                "allTimeLow" = EXCLUDED."allTimeLow",
                "allTimeLowChange" = EXCLUDED."allTimeLowChange",
                "allTimeHigh" = EXCLUDED."allTimeHigh",
                "allTimeHighChange" = EXCLUDED."allTimeHighChange",
                "allTimeHighDate" = EXCLUDED."allTimeHighDate",
                "allTimeLowDate" = EXCLUDED."allTimeLowDate",
                "etfIndex" = EXCLUDED."etfIndex",
                "inceptionDate" = EXCLUDED."inceptionDate",
                "lastUpdated" = EXCLUDED."lastUpdated"
        """
        
        # Execute batch upsert
        execute_batch(cur, upsert_query, items, page_size=BATCH_SIZE)
        conn.commit()
        
        logger.info(f"✓ Batch upsert complete! Processed {len(items)} records")
        cur.close()
        return len(items), 0

    except Exception as e:
        conn.rollback()
        logger.error(f"Batch upsert failed: {e}")
        raise


def identify_delisted_etfs(conn, old_tickers, new_tickers):
    """Identify and archive delisted ETFs."""
    delisted_tickers = old_tickers - new_tickers

    if not delisted_tickers:
        logger.info("No delisted ETFs found")
        return 0

    logger.info(f"Found {len(delisted_tickers)} delisted ETFs")

    try:
        cur = conn.cursor()
        current_timestamp = datetime.utcnow()

        # Get details of delisted ETFs and archive them
        for ticker in delisted_tickers:
            cur.execute(
                """
                SELECT ticker, "etfLeverage", issuer, aum, "assetClass", "expenseRatio", "etfIndex"
                FROM etf_data WHERE ticker = %s
                """,
                (ticker,)
            )
            result = cur.fetchone()
            if result:
                cur.execute(
                    """
                    INSERT INTO delisted_etfs
                    (ticker, "etfLeverage", issuer, aum, "assetClass", "expenseRatio", "etfIndex", "delistedDate")
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ticker, "delistedDate") DO NOTHING
                    """,
                    (result[0], result[1], result[2], result[3], result[4], result[5], result[6], current_timestamp)
                )

        conn.commit()
        logger.info(f"✓ Saved {len(delisted_tickers)} delisted ETFs")
        cur.close()
        return len(delisted_tickers)

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to process delisted ETFs: {e}")
        return 0


def save_new_launch_etfs(conn, etf_data):
    """Filter and save ETFs launched in the last 10 days."""
    logger.info("Processing new launch ETFs...")

    try:
        new_launch_list = []
        current_timestamp = datetime.utcnow()
        ten_days_ago = current_timestamp - timedelta(days=10)

        for ticker, data in etf_data.items():
            inception_date_str = data.get('inceptionDate')
            if inception_date_str:
                try:
                    inception_date = datetime.strptime(inception_date_str, '%Y-%m-%d')
                    if inception_date >= ten_days_ago:
                        new_launch_list.append({
                            'ticker': ticker,
                            'issuer': data.get('issuer'),
                            'inceptionDate': inception_date_str,
                            'aum': float(data.get('aum')) if data.get('aum') else None,
                            'assetClass': data.get('assetClass'),
                            'expenseRatio': float(data.get('expenseRatio')) if data.get('expenseRatio') else None,
                            'etfIndex': data.get('etfIndex'),
                        })
                except (ValueError, TypeError):
                    pass

        cur = conn.cursor()

        # Delete old new launch records
        cur.execute("DELETE FROM new_launch_etfs")

        # Insert new launches
        if new_launch_list:
            upsert_query = """
                INSERT INTO new_launch_etfs (ticker, issuer, "inceptionDate", aum, "assetClass", "expenseRatio", "etfIndex")
                VALUES (%(ticker)s, %(issuer)s, %(inceptionDate)s, %(aum)s, %(assetClass)s, %(expenseRatio)s, %(etfIndex)s)
                ON CONFLICT (ticker, "inceptionDate") DO NOTHING
            """
            execute_batch(cur, upsert_query, new_launch_list, page_size=BATCH_SIZE)

        conn.commit()
        logger.info(f"✓ Saved {len(new_launch_list)} new launch ETFs")
        cur.close()
        return len(new_launch_list)

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to process new launch ETFs: {e}")
        return 0


def save_gainers_and_losers(conn, etf_data):
    """Calculate and save ETF gainers and losers."""
    logger.info("Processing gainers and losers...")

    try:
        # Prepare all ETF performance data
        all_etfs = []
        for ticker, data in etf_data.items():
            all_etfs.append({
                'ticker': ticker,
                'issuer': data.get('issuer', 'Unknown'),
                'etfLeverage': data.get('etfLeverage', ''),
                'aum': float(data.get('aum', 0)) if data.get('aum') else 0,
                'etfIndex': str(data.get('etfIndex', '')) if data.get('etfIndex') else '',
                'ch1w': float(data.get('ch1w', 0)) if data.get('ch1w') else 0,
                'ch1m': float(data.get('ch1m', 0)) if data.get('ch1m') else 0,
                'ch6m': float(data.get('ch6m', 0)) if data.get('ch6m') else 0,
                'ch1y': float(data.get('ch1y', 0)) if data.get('ch1y') else 0,
                'ch3y': float(data.get('ch3y', 0)) if data.get('ch3y') else 0,
                'ch5y': float(data.get('ch5y', 0)) if data.get('ch5y') else 0,
                'ch10y': float(data.get('ch10y', 0)) if data.get('ch10y') else 0,
                'chYTD': float(data.get('chYTD', 0)) if data.get('chYTD') else 0,
            })

        def get_top_50(period_key):
            sorted_data = sorted(all_etfs, key=lambda x: x[period_key], reverse=True)
            gainers = sorted_data[:50]
            losers = sorted(sorted_data, key=lambda x: x[period_key])[:50]
            return gainers, losers

        periods = ['ch1w', 'ch1m', 'ch6m', 'ch1y', 'ch3y', 'ch5y', 'ch10y', 'chYTD']
        gainers_losers_items = []

        for period in periods:
            gainers, losers = get_top_50(period)

            for idx, etf in enumerate(gainers):
                gainers_losers_items.append({
                    'period': period,
                    'rankType': 'gainer',
                    'rank': idx + 1,
                    'ticker': etf['ticker'],
                    'issuer': etf['issuer'],
                    'etfLeverage': etf['etfLeverage'],
                    'aum': etf['aum'],
                    'etfIndex': etf['etfIndex'],
                    'returnValue': etf[period],
                })

            for idx, etf in enumerate(losers):
                gainers_losers_items.append({
                    'period': period,
                    'rankType': 'loser',
                    'rank': idx + 1,
                    'ticker': etf['ticker'],
                    'issuer': etf['issuer'],
                    'etfLeverage': etf['etfLeverage'],
                    'aum': etf['aum'],
                    'etfIndex': etf['etfIndex'],
                    'returnValue': etf[period],
                })

        cur = conn.cursor()

        # Delete old gainers/losers
        cur.execute("DELETE FROM gainer_losers")

        # Insert new gainers/losers
        if gainers_losers_items:
            upsert_query = """
                INSERT INTO gainer_losers (period, "rankType", rank, ticker, issuer, "etfLeverage", aum, "etfIndex", "returnValue")
                VALUES (%(period)s, %(rankType)s, %(rank)s, %(ticker)s, %(issuer)s, %(etfLeverage)s, %(aum)s, %(etfIndex)s, %(returnValue)s)
                ON CONFLICT (period, "rankType", rank) DO UPDATE SET
                    ticker = EXCLUDED.ticker,
                    issuer = EXCLUDED.issuer,
                    "etfLeverage" = EXCLUDED."etfLeverage",
                    aum = EXCLUDED.aum,
                    "etfIndex" = EXCLUDED."etfIndex",
                    "returnValue" = EXCLUDED."returnValue"
            """
            execute_batch(cur, upsert_query, gainers_losers_items, page_size=BATCH_SIZE)

        conn.commit()
        logger.info(f"✓ Saved top 50 gainers/losers for {len(periods)} periods ({len(gainers_losers_items)} total items)")
        cur.close()
        return len(gainers_losers_items)

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to process gainers and losers: {e}")
        return 0


def calculate_and_save_market_statistics(conn, etf_data):
    """Calculate and save market statistics including expense ratio distribution."""
    logger.info("Calculating and saving market statistics...")

    try:
        stats = {
            'total_aum': 0,
            'total_etf_count': 0,
            'issuers': {},
            'leverage_types': {},
            'issuer_leverage': {},
            'expense_ratios': {
                '0.00-0.10': 0,
                '0.10-0.25': 0,
                '0.25-0.50': 0,
                '0.50-1.00': 0,
                '1.00-2.00': 0,
                '2.00+': 0,
                'N/A': 0
            }
        }

        for ticker, data in etf_data.items():
            stats['total_etf_count'] += 1

            aum = data.get('aum')
            if aum:
                stats['total_aum'] += float(aum)

            issuer = data.get('issuer', 'Unknown')
            if issuer not in stats['issuers']:
                stats['issuers'][issuer] = {'aum': 0, 'count': 0}
            stats['issuers'][issuer]['count'] += 1
            if aum:
                stats['issuers'][issuer]['aum'] += float(aum)

            leverage_type = data.get('etfLeverage', 'Unknown')
            if leverage_type not in stats['leverage_types']:
                stats['leverage_types'][leverage_type] = {'aum': 0, 'count': 0}
            stats['leverage_types'][leverage_type]['count'] += 1
            if aum:
                stats['leverage_types'][leverage_type]['aum'] += float(aum)

            if issuer not in stats['issuer_leverage']:
                stats['issuer_leverage'][issuer] = {}
            if leverage_type not in stats['issuer_leverage'][issuer]:
                stats['issuer_leverage'][issuer][leverage_type] = {'aum': 0, 'count': 0}
            stats['issuer_leverage'][issuer][leverage_type]['count'] += 1
            if aum:
                stats['issuer_leverage'][issuer][leverage_type]['aum'] += float(aum)

            # Track by expense ratio (same logic as DynamoDB script)
            expense_ratio = data.get('expenseRatio')
            if expense_ratio is None:
                stats['expense_ratios']['N/A'] += 1
            else:
                ratio = float(expense_ratio)
                if ratio < 0.10:
                    stats['expense_ratios']['0.00-0.10'] += 1
                elif ratio < 0.25:
                    stats['expense_ratios']['0.10-0.25'] += 1
                elif ratio < 0.50:
                    stats['expense_ratios']['0.25-0.50'] += 1
                elif ratio < 1.00:
                    stats['expense_ratios']['0.50-1.00'] += 1
                elif ratio < 2.00:
                    stats['expense_ratios']['1.00-2.00'] += 1
                else:
                    stats['expense_ratios']['2.00+'] += 1

        cur = conn.cursor()

        # Clear old stats
        cur.execute("DELETE FROM market_stats")

        # Save global stats
        cur.execute(
            """
            INSERT INTO market_stats ("statKey", "totalAUM", "totalETFCount")
            VALUES (%s, %s, %s)
            """,
            ('MARKET_STATS_TOTAL', stats['total_aum'], stats['total_etf_count'])
        )

        # Save issuer stats
        for issuer, issuer_stats in stats['issuers'].items():
            cur.execute(
                """
                INSERT INTO market_stats ("statKey", issuer, "issuerAUM", "issuerCount")
                VALUES (%s, %s, %s, %s)
                """,
                (f"ISSUER#{issuer}", issuer, issuer_stats['aum'], issuer_stats['count'])
            )

        # Save leverage stats
        for leverage_type, leverage_stats in stats['leverage_types'].items():
            cur.execute(
                """
                INSERT INTO market_stats ("statKey", "leverageType", "leverageAUM", "leverageCount")
                VALUES (%s, %s, %s, %s)
                """,
                (f"LEVERAGE#{leverage_type}", leverage_type, leverage_stats['aum'], leverage_stats['count'])
            )

        # Save expense ratio stats
        for ratio_range, count in stats['expense_ratios'].items():
            cur.execute(
                """
                INSERT INTO market_stats ("statKey", "expenseRatioRange", "expenseRatioCount")
                VALUES (%s, %s, %s)
                """,
                (f"EXPENSE_RATIO#{ratio_range}", ratio_range, count)
            )

        conn.commit()
        logger.info(f"✓ Market statistics saved for {len(stats['issuers'])} issuers")
        logger.info(f"✓ Expense ratio distribution saved: {stats['expense_ratios']}")
        cur.close()

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to save market statistics: {e}")


def main():
    """Main ETL orchestration function."""
    start_time = datetime.utcnow()

    healthcheck_start()
    logger.info("="*60)
    logger.info(f"ETF Data Sync Job Started at {start_time.isoformat()}")
    logger.info("="*60)

    conn = None
    try:
        # Connect to PostgreSQL
        conn = get_db_connection()

        # Fetch existing ETF tickers
        existing_tickers = fetch_existing_etf_tickers(conn)
        logger.info(f"Existing ETFs in database: {len(existing_tickers)}")

        # Fetch data from API
        etf_data = fetch_etf_data()
        new_tickers = set(etf_data.keys())
        logger.info(f"New ETFs from API: {len(new_tickers)}")

        # Identify delisted ETFs
        delisted_count = identify_delisted_etfs(conn, existing_tickers, new_tickers)

        # Upsert ETF data
        success_count, error_count = batch_write_to_postgresql(conn, etf_data)

        # Calculate and save market statistics
        calculate_and_save_market_statistics(conn, etf_data)

        # Process new launch ETFs
        new_launch_count = save_new_launch_etfs(conn, etf_data)

        # Process gainers and losers
        gainers_losers_count = save_gainers_and_losers(conn, etf_data)

        # Calculate duration
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        logger.info("\n" + "="*60)
        logger.info(f"✓ Job completed successfully!")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info(f"Records processed: {success_count}/{len(etf_data)}")
        logger.info(f"Delisted ETFs: {delisted_count}")
        logger.info(f"New launch ETFs (last 10 days): {new_launch_count}")
        logger.info(f"Gainers/Losers data updated: {gainers_losers_count} items")
        logger.info("="*60)

        healthcheck_success()
        return 0

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.error("\n" + "="*60)
        logger.error(f"✗ Job failed: {error_msg}")
        logger.error("="*60)
        logger.exception("Full traceback:")

        healthcheck_fail(error_msg)
        return 1

    finally:
        if conn:
            conn.close()


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
