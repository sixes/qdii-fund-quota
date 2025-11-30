# ETF Data to DynamoDB

This script fetches ETF leverage data from StockAnalysis API and stores it in AWS DynamoDB with efficient querying capabilities. Designed for daily cron execution with production-ready features.

## Features

- **Batch Operations**: Efficiently processes 4000+ ETF records using DynamoDB batch_write_item
- **Upsert Logic**: Automatically updates existing records or inserts new ones (safe for daily cron runs)
- **Health Check Monitoring**: Reports job status to healthchecks.io for monitoring
- **Comprehensive Logging**: Logs to both file (`etf_sync.log`) and console with timestamps
- **Optimized Indexing**: Uses Global Secondary Index (GSI) on `etfLeverage` for efficient searching
- **Error Handling**: Automatic retry logic for failed batches with individual fallback
- **Data Type Safety**: Handles float to Decimal conversion for DynamoDB compatibility
- **Timestamp Tracking**: Adds `lastUpdated` field to track when each record was synced

## Table Schema

**Table Name:** `ETFData`

**Primary Key:**
- Partition Key: `ticker` (String) - The ETF ticker symbol (e.g., "AOK")

**Global Secondary Index:**
- Index Name: `etfLeverage-index`
- Partition Key: `etfLeverage` (String) - Leverage type (e.g., "Long", "2X Long", "-2X Short")
- Projection: ALL (includes all attributes)

This design allows you to:
1. Get ETF data by ticker symbol: O(1) lookup
2. Query all ETFs by leverage type efficiently using the GSI

## Data Fields

Each ETF record contains:
- `ticker`: ETF symbol (Primary Key)
- `etfLeverage`: Leverage type (Long, 2X Long, -2X Short, 3X Long, etc.) - Indexed
- `lastUpdated`: ISO timestamp of last sync (added automatically)
- `issuer`: Fund issuer (e.g., BlackRock)
- `assets`: Total assets under management
- `assetClass`: Asset class category
- `expenseRatio`: Annual expense ratio
- `peRatio`: Price-to-earnings ratio
- `close`: Latest closing price
- `volume`: Trading volume
- `ch1w`, `ch1m`, `ch6m`, `chYTD`, `ch1y`, `ch3y`, `ch5y`, `ch10y`: Performance changes
- `high52`, `low52`: 52-week high/low
- `allTimeLow`, `allTimeHigh`: All-time low/high prices
- Various date and change percentage fields

## Prerequisites

1. Python 3.7+
2. AWS account with DynamoDB access
3. AWS credentials configured (using AWS CLI, environment variables, or IAM role)

## Installation

```bash
# Install dependencies
pip install -r requirements_etf.txt
```

## AWS Configuration

Make sure you have AWS credentials configured. You can do this in several ways:

### Option 1: AWS CLI
```bash
aws configure
```

### Option 2: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Option 3: IAM Role
If running on EC2 or Lambda, attach an IAM role with DynamoDB permissions.

## Required IAM Permissions

Your AWS credentials need the following DynamoDB permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:CreateTable",
                "dynamodb:PutItem",
                "dynamodb:Query",
                "dynamodb:DescribeTable"
            ],
            "Resource": [
                "arn:aws:dynamodb:*:*:table/ETFData",
                "arn:aws:dynamodb:*:*:table/ETFData/index/*"
            ]
        }
    ]
}
```

## Usage

### Manual Execution

```bash
# Run the script once
python fetch_etf_to_dynamodb.py
```

The script will:
1. Signal job start to healthchecks.io
2. Create the DynamoDB table (if it doesn't exist)
3. Fetch ETF data from the API (4000+ records)
4. Batch upsert all records into DynamoDB
5. Run example queries for verification
6. Log all operations to `etf_sync.log`
7. Signal success/failure to healthchecks.io

### Cron Setup (Daily Execution)

For daily automated execution, set up a cron job:

```bash
# Edit your crontab
crontab -e

# Add one of these lines (see crontab_example.txt for more options):

# Run every day at 2:00 AM
0 2 * * * cd /home/fec/qdii-fund-quota/backend && /usr/bin/python3 fetch_etf_to_dynamodb.py >> etf_sync_cron.log 2>&1

# Or run every day at midnight
0 0 * * * cd /home/fec/qdii-fund-quota/backend && /usr/bin/python3 fetch_etf_to_dynamodb.py >> etf_sync_cron.log 2>&1
```

**Note**: The script uses upsert logic, so it's safe to run multiple times. Existing records will be updated with the latest data.

### Healthcheck Monitoring

The script reports to healthchecks.io at: `https://hc-ping.com/f626df6e-552b-46a7-8ebf-f23865a042c4`

**Health check events:**
- `/start` - Job has started
- Base URL - Job completed successfully
- `/fail` - Job failed (includes error message)

You can monitor your cron job at the healthchecks.io dashboard. If the job fails to run or encounters errors, you'll receive an alert.

To change the healthcheck URL, edit the `HEALTHCHECK_URL` constant in the script.

### Log Files

The script creates two log files:
1. **etf_sync.log** - Main application log (detailed logging from the script)
2. **etf_sync_cron.log** - Cron execution log (optional, captures stdout/stderr)

Log rotation is recommended for production:
```bash
# Install logrotate configuration
sudo tee /etc/logrotate.d/etf-sync <<EOF
/home/fec/qdii-fund-quota/backend/etf_sync*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
EOF
```

## Querying Data

### Using boto3 in Python

```python
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('ETFData')

# Get specific ETF by ticker
response = table.get_item(Key={'ticker': 'AOK'})
item = response['Item']

# Query all "2X Long" leveraged ETFs
response = table.query(
    IndexName='etfLeverage-index',
    KeyConditionExpression='etfLeverage = :leverage',
    ExpressionAttributeValues={
        ':leverage': '2X Long'
    }
)
items = response['Items']
```

### Using AWS CLI

```bash
# Get specific ETF
aws dynamodb get-item \
    --table-name ETFData \
    --key '{"ticker": {"S": "AOK"}}'

# Query by leverage type
aws dynamodb query \
    --table-name ETFData \
    --index-name etfLeverage-index \
    --key-condition-expression "etfLeverage = :leverage" \
    --expression-attribute-values '{":leverage": {"S": "2X Long"}}'
```

## Configuration

You can modify the following constants in the script:

- `TABLE_NAME`: Change the DynamoDB table name (default: "ETFData")
- `REGION_NAME`: Change the AWS region (default: "us-east-1")
- Provisioned throughput settings for table and GSI

## Cost Considerations

- The table is created with 5 read/write capacity units (provisioned mode)
- Consider switching to on-demand billing for variable workloads
- Monitor costs in AWS Cost Explorer

## Troubleshooting

**Table already exists error:**
The script handles this automatically and will use the existing table.

**Region error:**
Update the `REGION_NAME` constant in the script to match your AWS region.

**Credentials error:**
Ensure AWS credentials are properly configured using one of the methods above.

**Float/Decimal conversion errors:**
The script automatically converts float values to Decimal for DynamoDB compatibility.

## Example Output

```
2025-11-26 02:00:01,234 - INFO - Healthcheck: Job started
2025-11-26 02:00:01,235 - INFO - ============================================================
2025-11-26 02:00:01,236 - INFO - ETF Data Sync Job Started at 2025-11-26T02:00:01.236000
2025-11-26 02:00:01,237 - INFO - ============================================================
2025-11-26 02:00:01,238 - INFO - Table ETFData already exists.
2025-11-26 02:00:01,239 - INFO - Waiting for table to be fully active...
2025-11-26 02:00:01,456 - INFO - Fetching data from API...
2025-11-26 02:00:02,789 - INFO - Fetched 4123 ETF records
2025-11-26 02:00:02,790 - INFO - Starting batch upsert of 4123 ETF records...
2025-11-26 02:00:03,123 - INFO - Batch 1/165: Upserted 25 records (Total: 25/4123)
2025-11-26 02:00:03,456 - INFO - Batch 2/165: Upserted 25 records (Total: 50/4123)
...
2025-11-26 02:00:45,890 - INFO - Batch 165/165: Upserted 23 records (Total: 4123/4123)
2025-11-26 02:00:45,891 - INFO - Batch upsert complete! Success: 4123, Errors: 0
2025-11-26 02:00:45,892 - INFO -
============================================================
2025-11-26 02:00:45,893 - INFO - Sample queries for verification:
2025-11-26 02:00:45,894 - INFO - ============================================================
2025-11-26 02:00:45,895 - INFO - Querying ETFs with leverage type: Long
2025-11-26 02:00:46,012 - INFO - Found 2847 ETFs with leverage type 'Long'
2025-11-26 02:00:46,013 - INFO -   1. AOK - BlackRock
2025-11-26 02:00:46,014 - INFO -   2. SPY - State Street
2025-11-26 02:00:46,015 - INFO -   3. VOO - Vanguard
2025-11-26 02:00:46,016 - INFO - Querying ETFs with leverage type: 2X Long
2025-11-26 02:00:46,123 - INFO - Found 178 ETFs with leverage type '2X Long'
2025-11-26 02:00:46,124 - INFO -   1. SSO - ProShares
2025-11-26 02:00:46,125 - INFO -   2. QLD - ProShares
2025-11-26 02:00:46,126 - INFO -   3. UWM - ProShares
2025-11-26 02:00:46,127 - INFO -
============================================================
2025-11-26 02:00:46,128 - INFO - ✓ Job completed successfully!
2025-11-26 02:00:46,129 - INFO - Duration: 44.89 seconds
2025-11-26 02:00:46,130 - INFO - Records processed: 4123/4123
2025-11-26 02:00:46,131 - INFO - ============================================================
2025-11-26 02:00:46,234 - INFO - Healthcheck: Job completed successfully
```
