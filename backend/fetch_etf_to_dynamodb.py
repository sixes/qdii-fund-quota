#!/usr/bin/env python3
"""
Script to fetch ETF data from StockAnalysis API and store in DynamoDB.
Creates a table with efficient searching on etfLeverage field using GSI.
Runs daily via cron with batch operations, health check reporting, and logging.
"""

import json
import logging
import os
import sys
from datetime import datetime
from decimal import Decimal

import boto3
import requests
from botocore.exceptions import ClientError

# Configuration
API_URL = "https://stockanalysis.com/api/screener/e/bd/etfLeverage+issuer+aum+etfIndex+assetClass+expenseRatio+peRatio+price+volume+ch1w+ch1m+ch6m+chYTD+ch1y+ch3y+ch5y+ch10y+high52+low52+allTimeLow+allTimeLowChange+allTimeHigh+allTimeHighDate+allTimeHighChange+allTimeLowDate.json"
TABLE_NAME = "ETFData"
MARKET_STATS_TABLE = "ETFMarketStats"
REGION_NAME = "us-east-1"  # Change to your preferred region
HEALTHCHECK_URL = "https://hc-ping.com/f626df6e-552b-46a7-8ebf-f23865a042c4"
LOG_FILE = "etf_sync.log"
BATCH_SIZE = 25  # DynamoDB batch_write_item limit

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb', region_name=REGION_NAME)

# Setup logging
def setup_logging():
    """Configure logging to both file and console."""
    log_format = '%(asctime)s - %(levelname)s - %(message)s'

    # Create logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    # Remove existing handlers
    logger.handlers = []

    # File handler
    file_handler = logging.FileHandler(LOG_FILE)
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(file_handler)

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(log_format))
    logger.addHandler(console_handler)

    return logger

logger = setup_logging()


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


def convert_floats_to_decimal(obj):
    """
    Convert float values to Decimal for DynamoDB compatibility.
    DynamoDB doesn't support float type, only Decimal.
    """
    if isinstance(obj, list):
        return [convert_floats_to_decimal(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimal(value) for key, value in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj


def create_table():
    """
    Create DynamoDB table with GSI on etfLeverage for efficient searching.
    """
    try:
        table = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {
                    'AttributeName': 'ticker',
                    'KeyType': 'HASH'  # Partition key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'ticker',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'etfLeverage',
                    'AttributeType': 'S'
                }
            ],
            GlobalSecondaryIndexes=[
                {
                    'IndexName': 'etfLeverage-index',
                    'KeySchema': [
                        {
                            'AttributeName': 'etfLeverage',
                            'KeyType': 'HASH'  # Partition key for GSI
                        }
                    ],
                    'Projection': {
                        'ProjectionType': 'ALL'  # Include all attributes
                    },
                    'ProvisionedThroughput': {
                        'ReadCapacityUnits': 5,
                        'WriteCapacityUnits': 5
                    }
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )

        # Wait until the table exists
        logger.info(f"Creating table {TABLE_NAME}...")
        table.wait_until_exists()
        logger.info(f"Table {TABLE_NAME} created successfully!")
        return table

    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            logger.info(f"Table {TABLE_NAME} already exists.")
            return dynamodb.Table(TABLE_NAME)
        else:
            raise


def create_market_stats_table():
    """
    Create DynamoDB table for ETF market statistics.
    Key structure:
    - pk (partition key): "MARKET_STATS" for global stats, "ISSUER#{issuer_name}" for issuer stats
    - sk (sort key): "TOTAL_AUM", "ISSUER", "EXPENSE_RATIO" for organizing different stat types
    """
    try:
        table = dynamodb.create_table(
            TableName=MARKET_STATS_TABLE,
            KeySchema=[
                {
                    'AttributeName': 'pk',
                    'KeyType': 'HASH'  # Partition key
                },
                {
                    'AttributeName': 'sk',
                    'KeyType': 'RANGE'  # Sort key
                }
            ],
            AttributeDefinitions=[
                {
                    'AttributeName': 'pk',
                    'AttributeType': 'S'
                },
                {
                    'AttributeName': 'sk',
                    'AttributeType': 'S'
                }
            ],
            ProvisionedThroughput={
                'ReadCapacityUnits': 5,
                'WriteCapacityUnits': 5
            }
        )

        logger.info(f"Creating table {MARKET_STATS_TABLE}...")
        table.wait_until_exists()
        logger.info(f"Table {MARKET_STATS_TABLE} created successfully!")
        return table

    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceInUseException':
            logger.info(f"Table {MARKET_STATS_TABLE} already exists.")
            return dynamodb.Table(MARKET_STATS_TABLE)
        else:
            raise


def fetch_etf_data():
    """
    Fetch ETF data from the API.
    """
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


def batch_write_to_dynamodb(table, etf_data):
    """
    Upsert ETF data into DynamoDB table using batch operations.
    Uses batch_write_item for better performance with 4000+ items.
    put_item automatically handles upsert (insert or update).
    """
    logger.info(f"Starting batch upsert of {len(etf_data)} ETF records...")

    items = []
    current_timestamp = datetime.utcnow().isoformat()

    # Prepare all items
    for ticker, data in etf_data.items():
        item = {'ticker': ticker, 'lastUpdated': current_timestamp}
        item.update(data)
        # Convert floats to Decimal
        item = convert_floats_to_decimal(item)
        items.append(item)

    # Process in batches
    success_count = 0
    error_count = 0
    total_batches = (len(items) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1

        try:
            # Prepare batch write request
            with table.batch_writer() as batch_writer:
                for item in batch:
                    batch_writer.put_item(Item=item)

            success_count += len(batch)
            logger.info(f"Batch {batch_num}/{total_batches}: Upserted {len(batch)} records (Total: {success_count}/{len(items)})")

        except ClientError as e:
            error_count += len(batch)
            logger.error(f"Batch {batch_num}/{total_batches} failed: {e}")
            # Try individual inserts for failed batch
            logger.info(f"Retrying batch {batch_num} with individual puts...")
            for item in batch:
                try:
                    table.put_item(Item=item)
                    success_count += 1
                    error_count -= 1
                except Exception as item_error:
                    logger.error(f"Failed to insert {item['ticker']}: {item_error}")

        except Exception as e:
            error_count += len(batch)
            logger.error(f"Unexpected error in batch {batch_num}: {e}")

    logger.info(f"Batch upsert complete! Success: {success_count}, Errors: {error_count}")

    if error_count > 0:
        raise Exception(f"Failed to insert {error_count} records")

    return success_count, error_count


def calculate_market_statistics(etf_data):
    """
    Calculate market statistics from ETF data:
    1. Total AUM of all ETFs
    2. Total AUM and product count for each issuer
    3. Product count for each expense ratio range
    
    Returns: dict with organized market statistics
    """
    logger.info("Calculating market statistics...")
    
    stats = {
        'total_aum': Decimal('0'),
        'total_etf_count': 0,
        'issuers': {},  # {issuer_name: {aum, count}}
        'expense_ratios': {},  # {ratio_range: count}
        'leverage_types': {},  # {leverage_type: {aum, count}}
        'issuer_leverage': {},  # {issuer_name: {leverage_type: {aum, count}}}
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Expense ratio ranges for bucketing
    expense_ratio_ranges = {
        '0.00-0.10': 0,
        '0.10-0.25': 0,
        '0.25-0.50': 0,
        '0.50-1.00': 0,
        '1.00-2.00': 0,
        '2.00+': 0,
        'N/A': 0
    }
    
    for ticker, data in etf_data.items():
        stats['total_etf_count'] += 1
        
        # Calculate total AUM
        aum = data.get('aum')
        if aum is not None:
            aum_value = Decimal(str(aum)) if isinstance(aum, (int, float)) else Decimal('0')
            stats['total_aum'] += aum_value
        
        # Track by issuer
        issuer = data.get('issuer', 'Unknown')
        if issuer not in stats['issuers']:
            stats['issuers'][issuer] = {
                'aum': Decimal('0'),
                'count': 0
            }
        
        stats['issuers'][issuer]['count'] += 1
        if aum is not None:
            aum_value = Decimal(str(aum)) if isinstance(aum, (int, float)) else Decimal('0')
            stats['issuers'][issuer]['aum'] += aum_value
        
        # Track by expense ratio
        expense_ratio = data.get('expenseRatio')
        if expense_ratio is None:
            expense_ratio_ranges['N/A'] += 1
        else:
            ratio = float(expense_ratio)
            if ratio < 0.10:
                expense_ratio_ranges['0.00-0.10'] += 1
            elif ratio < 0.25:
                expense_ratio_ranges['0.10-0.25'] += 1
            elif ratio < 0.50:
                expense_ratio_ranges['0.25-0.50'] += 1
            elif ratio < 1.00:
                expense_ratio_ranges['0.50-1.00'] += 1
            elif ratio < 2.00:
                expense_ratio_ranges['1.00-2.00'] += 1
            else:
                expense_ratio_ranges['2.00+'] += 1
        
        # Track by leverage type
        leverage_type = data.get('etfLeverage', 'Unknown')
        if leverage_type not in stats['leverage_types']:
            stats['leverage_types'][leverage_type] = {
                'aum': Decimal('0'),
                'count': 0
            }
        
        stats['leverage_types'][leverage_type]['count'] += 1
        if aum is not None:
            aum_value = Decimal(str(aum)) if isinstance(aum, (int, float)) else Decimal('0')
            stats['leverage_types'][leverage_type]['aum'] += aum_value
        
        # Track by issuer and leverage type
        if issuer not in stats['issuer_leverage']:
            stats['issuer_leverage'][issuer] = {}
        
        if leverage_type not in stats['issuer_leverage'][issuer]:
            stats['issuer_leverage'][issuer][leverage_type] = {
                'aum': Decimal('0'),
                'count': 0
            }
        
        stats['issuer_leverage'][issuer][leverage_type]['count'] += 1
        if aum is not None:
            aum_value = Decimal(str(aum)) if isinstance(aum, (int, float)) else Decimal('0')
            stats['issuer_leverage'][issuer][leverage_type]['aum'] += aum_value
    
    stats['expense_ratios'] = expense_ratio_ranges
    
    logger.info(f"✓ Market statistics calculated:")
    logger.info(f"  - Total AUM: ${stats['total_aum']:,.2f}")
    logger.info(f"  - Total ETF Count: {stats['total_etf_count']}")
    logger.info(f"  - Issuers: {len(stats['issuers'])}")
    logger.info(f"  - Leverage Types: {len(stats.get('leverage_types', {}))}")
    
    return stats


def save_market_statistics(stats_table, stats):
    """
    Save market statistics to DynamoDB with proper key structure.
    
    Key structure:
    - Global stats: pk="MARKET_STATS", sk="TOTAL_AUM"
    - Issuer stats: pk="ISSUER#{issuer_name}", sk="STATS"
    - Expense ratio stats: pk="MARKET_STATS", sk="EXPENSE_RATIOS"
    """
    logger.info("Saving market statistics to DynamoDB...")
    
    try:
        # 1. Save global total AUM
        stats_table.put_item(
            Item={
                'pk': 'MARKET_STATS',
                'sk': 'TOTAL_AUM',
                'totalAUM': stats['total_aum'],
                'totalETFCount': stats['total_etf_count'],
                'timestamp': stats['timestamp']
            }
        )
        logger.info("✓ Saved global total AUM")
        
        # 2. Save issuer statistics
        for issuer, issuer_stats in stats['issuers'].items():
            stats_table.put_item(
                Item={
                    'pk': f'ISSUER#{issuer}',
                    'sk': 'STATS',
                    'issuer': issuer,
                    'aum': issuer_stats['aum'],
                    'count': issuer_stats['count'],
                    'timestamp': stats['timestamp']
                }
            )
        logger.info(f"✓ Saved statistics for {len(stats['issuers'])} issuers")
        
        # 3. Save expense ratio statistics
        expense_ratio_items = []
        for ratio_range, count in stats['expense_ratios'].items():
            expense_ratio_items.append({
                'pk': 'MARKET_STATS',
                'sk': f'EXPENSE_RATIO#{ratio_range}',
                'expenseRatioRange': ratio_range,
                'count': count,
                'timestamp': stats['timestamp']
            })
        
        # Batch write expense ratio stats
        with stats_table.batch_writer() as batch:
            for item in expense_ratio_items:
                batch.put_item(Item=item)
        logger.info(f"✓ Saved expense ratio statistics")
        
        # 4. Save leverage type statistics
        leverage_items = []
        for leverage_type, leverage_stats in stats.get('leverage_types', {}).items():
            leverage_items.append({
                'pk': f'LEVERAGE#{leverage_type}',
                'sk': 'STATS',
                'leverageType': leverage_type,
                'aum': leverage_stats['aum'],
                'count': leverage_stats['count'],
                'timestamp': stats['timestamp']
            })
        
        # Batch write leverage type stats
        with stats_table.batch_writer() as batch:
            for item in leverage_items:
                batch.put_item(Item=item)
        logger.info(f"✓ Saved leverage type statistics for {len(leverage_items)} types")
        
        # 5. Save issuer-leverage type statistics
        issuer_leverage_items = []
        for issuer, leverage_stats_by_type in stats.get('issuer_leverage', {}).items():
            for leverage_type, leverage_stats in leverage_stats_by_type.items():
                issuer_leverage_items.append({
                    'pk': f'ISSUER#{issuer}',
                    'sk': f'LEVERAGE#{leverage_type}',
                    'issuer': issuer,
                    'leverageType': leverage_type,
                    'aum': leverage_stats['aum'],
                    'count': leverage_stats['count'],
                    'timestamp': stats['timestamp']
                })
        
        # Batch write issuer-leverage stats
        with stats_table.batch_writer() as batch:
            for item in issuer_leverage_items:
                batch.put_item(Item=item)
        logger.info(f"✓ Saved issuer-leverage type statistics for {len(issuer_leverage_items)} combinations")
        
        
        logger.info("✓ All market statistics saved successfully!")
        
    except ClientError as e:
        logger.error(f"Failed to save market statistics: {e}")
        raise


def main():
    """
    Main function to orchestrate the ETL process with healthcheck reporting.
    """
    start_time = datetime.utcnow()

    # Signal job start
    healthcheck_start()
    logger.info("="*60)
    logger.info(f"ETF Data Sync Job Started at {start_time.isoformat()}")
    logger.info("="*60)

    try:
        # Step 1: Create tables if not exists
        table = create_table()
        stats_table = create_market_stats_table()

        # Wait for tables to be fully active
        logger.info("Waiting for tables to be fully active...")
        table.wait_until_exists()
        stats_table.wait_until_exists()

        # Step 2: Fetch data from API
        etf_data = fetch_etf_data()

        # Step 3: Batch upsert data into DynamoDB
        success_count, error_count = batch_write_to_dynamodb(table, etf_data)

        # Step 4: Calculate and save market statistics
        market_stats = calculate_market_statistics(etf_data)
        save_market_statistics(stats_table, market_stats)

        # Step 5: Example queries (optional, for verification)
#        logger.info("\n" + "="*60)
#        logger.info("Sample queries for verification:")
#        logger.info("="*60)
#        query_by_leverage(table, "Long")
#        query_by_leverage(table, "2X Long")

        # Calculate duration
        end_time = datetime.utcnow()
        duration = (end_time - start_time).total_seconds()

        logger.info("\n" + "="*60)
        logger.info(f"✓ Job completed successfully!")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info(f"Records processed: {success_count}/{len(etf_data)}")
        logger.info(f"Market statistics saved for {len(market_stats['issuers'])} issuers")
        logger.info("="*60)

        # Signal success to healthcheck
        healthcheck_success()

        return 0

    except Exception as e:
        error_msg = f"Error: {str(e)}"
        logger.error("\n" + "="*60)
        logger.error(f"✗ Job failed: {error_msg}")
        logger.error("="*60)
        logger.exception("Full traceback:")

        # Signal failure to healthcheck
        healthcheck_fail(error_msg)

        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
