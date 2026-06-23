# Stock API PostgreSQL Migration

This document describes the migration of the `/api/stocks.ts` endpoint from AWS DynamoDB to PostgreSQL.

## Changes Made

### 1. Database Configuration

A second PostgreSQL database connection has been added for the stock-watcher data:

- **Environment Variable**: `STOCK_DATABASE_URL`
- **Default Value**: `postgresql://stock_user:your_password@localhost:5432/stock_watcher`
- **Purpose**: Connects to the separate PostgreSQL database used by the stock-watcher backend

**Note**: Both databases are on the same PostgreSQL instance with different databases and users.

### 2. Prisma Schema

Added the `StockPxChanged` model to the main `prisma/schema.prisma`:

```prisma
model StockPxChanged {
  ticker           String   @db.VarChar(20)
  name             String?  @db.VarChar(255)
  date             DateTime @db.Date
  market           String   @db.VarChar(10)
  closingPrice     Decimal? @db.Decimal(15, 4)
  changePercentage Decimal? @db.Decimal(10, 4)
  chgPctSoFar      Decimal? @db.Decimal(10, 4)
  highestPx        Decimal? @db.Decimal(15, 4)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @default(now()) @updatedAt

  @@id([ticker, date])
  @@index([date(sort: Desc)])
  @@index([market])
  @@index([ticker])
  @@map("stock_px_changed")
}
```

Added binary targets for Vercel deployment:
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}
```

### 3. Database Client

Created `lib/stockdb.ts` to provide a Prisma client instance for the stock database:

```typescript
import { PrismaClient } from '@prisma/client'

if (!global.stockPrisma) {
  global.stockPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.STOCK_DATABASE_URL,
      },
    },
  })
}

export const stockPrisma = global.stockPrisma
```

This uses the same Prisma client but with a different database URL at runtime.

### 4. API Migration

Updated `pages/api/stocks.ts` to:
- Remove AWS SDK dependencies (`@aws-sdk/client-dynamodb`, `@aws-sdk/util-dynamodb`)
- Use Prisma client for PostgreSQL queries
- Maintain the same API response format
- Add better error handling and logging

**Before (DynamoDB):**
```typescript
const data = await client.send(new QueryCommand({
  TableName: 'stock_px_changed',
  IndexName: 'date-index',
  KeyConditionExpression: '#date = :date',
  ...
}))
```

**After (PostgreSQL):**
```typescript
const stockData = await stockPrisma.stockPxChanged.findMany({
  where: { date: targetDate },
  orderBy: { changePercentage: 'desc' }
})
```

## Setup Instructions

### 1. Configure Environment Variables

Add the stock database URL to `.env.local` (development) and Vercel (production):

```bash
STOCK_DATABASE_URL=postgresql://stock_user:password@localhost:5432/stock_watcher
```

**For Vercel**:
1. Go to your Vercel project → Settings → Environment Variables
2. Add `STOCK_DATABASE_URL` for Production, Preview, and Development
3. Use your cloud PostgreSQL connection string (must be accessible from Vercel)

### 2. Ensure Database Schema Exists

The stock database should have the `stock_px_changed` table created. The schema is defined in `/home/fec/stock-watcher/schema.sql`.

Run the schema migration:

```bash
psql -U stock_user -d stock_watcher -f /home/fec/stock-watcher/schema.sql
```

### 3. Generate Prisma Client

```bash
npm run postinstall
# or manually:
npx prisma generate
```

### 4. Test the API

```bash
# Start the development server
npm run dev

# Test the API endpoint
curl http://localhost:3000/api/stocks
curl http://localhost:3000/api/stocks?date=2026-02-10

# Test debug endpoint
curl http://localhost:3000/api/stocks-debug
```

## Backend Integration

The backend script at `/home/fec/stock-watcher/vps_main.py` uses the same PostgreSQL database to insert stock data. The Python script uses `psycopg2` to write to the `stock_px_changed` table, and the Next.js API reads from it using Prisma.

**No changes to the backend script are required** - it continues to work as-is.

## Database Schema

The `stock_px_changed` table structure (from `/home/fec/stock-watcher/schema.sql`):

```sql
CREATE TABLE IF NOT EXISTS stock_px_changed (
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    date DATE NOT NULL,
    market VARCHAR(10) NOT NULL,
    closing_price DECIMAL(15, 4),
    change_percentage DECIMAL(10, 4),
    chg_pct_so_far DECIMAL(10, 4),
    highest_px DECIMAL(15, 4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ticker, date)
);
```

## API Response Format

The API maintains backward compatibility with the same response format:

```json
[
  {
    "ticker": "AAPL",
    "name": "Apple Inc.",
    "date": "2026-02-10",
    "market": "us_stock",
    "lastClosingPrice": "150.25",
    "lastChangePercent": "2.34",
    "changeFromAthPercent": "-15.67",
    "allTimeHigh": "182.94"
  }
]
```

## Troubleshooting

### Vercel Deployment Issues

If you see "Query Engine not found" errors on Vercel:
- Ensure `binaryTargets = ["native", "rhel-openssl-3.0.x"]` is in `prisma/schema.prisma`
- Check Vercel build logs to ensure Prisma client is generated successfully
- Verify `STOCK_DATABASE_URL` is set in Vercel environment variables

### Debug Endpoint

Use `/api/stocks-debug` to diagnose issues:
- Check if `STOCK_DATABASE_URL` is set
- Verify database connection
- See total record count
- View latest record

## Benefits of PostgreSQL Migration

1. **Unified Infrastructure**: Both QDII fund data and stock data now use PostgreSQL
2. **Better Query Performance**: Native SQL indexes instead of DynamoDB GSI
3. **Lower Costs**: No AWS charges for DynamoDB queries
4. **Easier Local Development**: Can run entirely locally without AWS credentials
5. **Data Consistency**: ACID transactions and relational integrity
6. **Simpler Deployment**: One database type to manage instead of mixed stack
7. **Same Instance**: Both databases on same PostgreSQL instance, just different databases
