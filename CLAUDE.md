# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application for tracking QDII fund quotas and leveraged ETF performance data. The application uses a hybrid data architecture:
- **PostgreSQL** (via Prisma) for QDII fund quota data
- **AWS DynamoDB** for ETF leverage data and US index constituents
- **Python backend scripts** for data synchronization via cron jobs

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma client (run after schema changes)
npm run prisma
# or
npx prisma generate

# Database migrations
npx prisma migrate dev
npx prisma migrate deploy
```

## Backend Data Sync

The Python backend scripts sync data to DynamoDB on a daily schedule:

```bash
# ETF data sync (run from backend directory)
cd backend
python fetch_etf_to_dynamodb.py

# Install Python dependencies
pip install -r requirements_etf.txt
```

**Cron Setup**: ETF data is synced daily via cron (see `backend/crontab_example.txt`). The script uses upsert logic, so it's safe to run multiple times.

**Monitoring**: Health checks report to healthchecks.io. Logs are written to `backend/etf_sync.log`.

## Architecture

### Data Layer

**Two separate data sources:**

1. **PostgreSQL (Prisma)**
   - Table: `fund_quota`
   - Schema: `prisma/schema.prisma`
   - Used for: QDII fund quota tracking
   - API: `/api/quotas.ts`

2. **AWS DynamoDB**
   - **ETFData Table**:
     - Primary key: `ticker` (String)
     - GSI: `etfLeverage-index` on `etfLeverage` field
     - Contains 4000+ ETF records with leverage types (Long, 2X Long, -2X Short, etc.)
     - APIs: `/api/etf-leverage.ts`, `/api/etf-leverage-summary.ts`, `/api/etf-issuers.ts`

   - **index-constituents Table**:
     - Primary key: `pk` (format: `INDEX#<index_name>`)
     - Contains constituents for NASDAQ 100, S&P 500, Dow Jones
     - API: `/api/index-constituents.ts`

### Frontend Architecture

**Next.js Pages Router** with TypeScript and Tailwind CSS.

**Key Pages:**
- `/pages/index.tsx` - Leveraged ETF performance tracker (main home page)
- `/pages/funds.tsx` - QDII fund quota page
- `/pages/nasdaq100.tsx`, `/pages/sp500.tsx`, `/pages/dow.tsx` - Index constituent pages
- `/pages/mag7.tsx` - Magnificent 7 stocks page

**Shared Components:**
- `components/Navigation.tsx` - Main navigation with language toggle
- `components/Footer.tsx` - Footer component
- `components/IndexReturnsChart.tsx` - Chart component for index returns

**Internationalization**: The app supports English (EN) and Chinese (ZH) via URL query parameter `?lang=zh`. Language state is managed in individual pages and passed to components.

**UI Libraries:**
- Material-UI (`@mui/material`) for tables and data display
- Tailwind CSS for styling
- Chart.js and lightweight-charts for visualizations

### API Routes

**DynamoDB APIs** (use AWS SDK v3):
- `/api/etf-leverage.ts` - Query ETFs by leverage type using GSI, supports sorting and filtering by issuer
- `/api/etf-leverage-summary.ts` - Aggregate statistics by leverage type
- `/api/etf-issuers.ts` - List of unique ETF issuers
- `/api/index-constituents.ts` - Query index constituents by index name

**PostgreSQL APIs** (use Prisma):
- `/api/quotas.ts` - Query fund quotas with fuzzy search using Fuse.js

**Important**: The `/api/quotas.ts` endpoint uses `$queryRawUnsafe` which is vulnerable to SQL injection. When modifying this endpoint, use parameterized queries or Prisma's query builder instead.

### Configuration

**Environment Variables** (`.env.local`):
- `DATABASE_URL` - PostgreSQL connection string for Prisma
- `AWS_REGION` - AWS region for DynamoDB (defaults to `us-east-1`)
- AWS credentials are configured via default credential chain (environment variables, AWS CLI, or IAM role)

**Next.js Config** (`next.config.js`):
- PWA support via `next-pwa` (disabled in development)
- Custom webpack config to filter out GenerateSW plugin

**Vercel i18n**: The app uses Vercel's i18n routing for EN/ZH language support.

## Key Implementation Details

### ETF Data Flow

1. **Data Sync**: Python script (`backend/fetch_etf_to_dynamodb.py`) fetches ETF data from StockAnalysis API and batch upserts to DynamoDB
2. **API Layer**: Next.js API routes query DynamoDB using GSI for efficient filtering by leverage type
3. **Frontend**: React components fetch data from API routes and display in sortable tables with pagination

### Performance Optimizations

- **GSI Usage**: ETF queries use `etfLeverage-index` GSI for fast filtering (avoid full table scans)
- **Smart Limits**: Initial "all" view loads top 200 ETFs; filtered views load up to 5000
- **Server-side Sorting**: API routes handle sorting to reduce client-side processing
- **Pagination**: Frontend paginates large datasets (20 rows per page)
- **Dual Scrollbars**: Index pages use synchronized top/bottom scrollbars for wide tables

### DynamoDB Query Patterns

**ETF Leverage Query** (efficient):
```typescript
// Use GSI when filtering by leverage type
QueryCommand({
  TableName: 'ETFData',
  IndexName: 'etfLeverage-index',
  KeyConditionExpression: 'etfLeverage = :leverage',
  ExpressionAttributeValues: { ':leverage': { S: '2X Long' } }
})
```

**Index Constituents Query**:
```typescript
QueryCommand({
  TableName: 'index-constituents',
  KeyConditionExpression: 'pk = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'INDEX#NASDAQ_100' } }
})
```

### Styling Conventions

- Use Tailwind utility classes for layout and basic styling
- Material-UI components for complex data tables
- Color coding for performance metrics:
  - Green: Positive returns
  - Red: Negative returns
  - Purple: 3X leverage
  - Orange: 2X leverage
  - Red background: Short/inverse positions

## Important Notes

- **SQL Injection Risk**: The `/api/quotas.ts` endpoint uses `$queryRawUnsafe` with string interpolation. This should be refactored to use parameterized queries.
- **AWS Credentials**: Ensure AWS credentials are configured before running the app or backend scripts. The app uses the default credential chain.
- **Prisma Client**: Run `npm run prisma` or `npx prisma generate` after any schema changes to regenerate the Prisma client.
- **DynamoDB Tables**: The backend Python scripts automatically create tables if they don't exist. Table names are hardcoded: `ETFData` and `index-constituents`.
- **Backup Files**: `pages/index-old-backup.tsx` contains the original home page before the leveraged ETF redesign.
