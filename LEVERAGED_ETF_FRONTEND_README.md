# Leveraged ETF Frontend Integration

This document describes the integration of the Leveraged ETF data from DynamoDB into the frontend application.

## Overview

The home page (`/pages/index.tsx`) has been redesigned to display leveraged ETF performance data from DynamoDB, providing users with:
- Real-time leveraged ETF performance tracking
- Interactive filtering by leverage type
- Comprehensive performance metrics
- Sortable table with multiple metrics
- Bilingual support (EN/ZH)
- Responsive design

## Files Created/Modified

### Backend API Endpoints

1. **`/pages/api/etf-leverage.ts`** - Main API endpoint for fetching ETF data
   - Query by leverage type using GSI for performance
   - Server-side sorting and limiting
   - Returns detailed ETF information

2. **`/pages/api/etf-leverage-summary.ts`** - Summary statistics endpoint
   - Calculates aggregate statistics by leverage type
   - Average performance metrics
   - Total assets and count by leverage type

### Frontend Pages

1. **`/pages/index.tsx`** - New home page (replaced old version)
   - Clean, modern design focused on leveraged ETF performance
   - Interactive leverage type cards
   - Sortable performance table
   - Real-time data fetching from DynamoDB

2. **`/pages/index-old-backup.tsx`** - Backup of original home page
   - Preserved for reference or rollback if needed

## Features

### 1. Leverage Overview Cards

Interactive cards showing summary statistics for each leverage type:
- **3X Long** - Triple leveraged long ETFs
- **2X Long** - Double leveraged long ETFs
- **Long** - Standard long ETFs
- **-1X Short** - Inverse ETFs
- **-2X Short** - Double inverse ETFs
- **-3X Short** - Triple inverse ETFs

Each card displays:
- ETF count
- Total assets under management
- Average 1-month performance
- Average YTD performance
- Average 1-year performance

### 2. ETF Performance Table

Sortable table with the following columns:
- **Ticker** - ETF symbol
- **Leverage Type** - Color-coded leverage category
- **Issuer** - Fund provider
- **Assets** - Total AUM (formatted as $XXB/$XXM)
- **Price** - Current closing price
- **1 Week** - Weekly performance (color-coded)
- **1 Month** - Monthly performance (color-coded)
- **YTD** - Year-to-date performance (color-coded)
- **1 Year** - Annual performance (color-coded)
- **3 Year** - 3-year performance (color-coded)

### 3. Interactive Filtering

- Click any leverage type card to filter ETFs
- "All Leveraged ETFs" button to view all ETFs
- Selected filter highlighted with blue background

### 4. Performance Indicators

- Green color for positive returns
- Red color for negative returns
- Percentage change with +/- prefix
- Null values shown as "-"

### 5. Responsive Design

- Mobile-friendly grid layout for cards
- Responsive table that adjusts to screen size
- Smooth transitions and hover effects

## Data Flow

```
DynamoDB (ETFData Table)
    ↓
Next.js API Routes (/api/etf-leverage, /api/etf-leverage-summary)
    ↓
React Frontend (index.tsx)
    ↓
User Interface
```

## API Usage Examples

### Fetch All ETFs
```javascript
GET /api/etf-leverage?leverageType=all&sortBy=assets&sortOrder=desc&limit=200
```

### Fetch 2X Long ETFs
```javascript
GET /api/etf-leverage?leverageType=2X Long&sortBy=ch1y&sortOrder=desc&limit=100
```

### Fetch Summary Statistics
```javascript
GET /api/etf-leverage-summary
```

## Data Requirements

The frontend expects the following data from DynamoDB:

### Required Fields
- `ticker` - ETF symbol (String)
- `etfLeverage` - Leverage type (String)
- `issuer` - Fund issuer (String)
- `assets` - Total assets (Number)

### Performance Fields (all optional)
- `close` - Closing price (Number)
- `volume` - Trading volume (Number)
- `ch1w` - 1-week change % (Number)
- `ch1m` - 1-month change % (Number)
- `ch6m` - 6-month change % (Number)
- `chYTD` - YTD change % (Number)
- `ch1y` - 1-year change % (Number)
- `ch3y` - 3-year change % (Number)
- `high52` - 52-week high (Number)
- `low52` - 52-week low (Number)

## Internationalization

The page supports both English (EN) and Chinese (ZH) languages:

### Translations Included
- Page title and description
- Column headers
- Leverage type labels
- UI buttons and labels
- Loading states

### Language Toggle
Users can switch between EN and ZH using the navigation bar language toggle.

## Styling

### Technologies Used
- **Tailwind CSS** - Utility-first CSS framework
- **Material-UI** - Table components
- **Custom color schemes**:
  - Blue: Selected filters
  - Green: Positive performance
  - Red: Negative performance
  - Purple: 3X leverage
  - Orange: 2X leverage
  - Green: Long positions
  - Red: Short positions

### Design Principles
- Clean, modern interface
- Clear visual hierarchy
- Color-coded performance indicators
- Smooth transitions and hover effects
- Mobile-first responsive design

## Performance Optimizations

1. **Server-side sorting** - Reduces client-side processing
2. **GSI queries** - Fast filtering by leverage type
3. **Limited results** - Default 200 ETFs per request
4. **Lazy loading** - Data fetched only when needed
5. **React state management** - Efficient re-rendering

## Setup Instructions

### 1. Ensure DynamoDB is Populated

Run the ETF sync script to populate data:
```bash
cd backend
python fetch_etf_to_dynamodb.py
```

### 2. Start the Development Server

```bash
npm run dev
```

### 3. Access the Application

Open browser to: http://localhost:3000

## Monitoring

The ETF data is automatically updated daily via cron job (configured in backend).

Monitor updates via:
- **Healthcheck.io**: https://hc-ping.com/f626df6e-552b-46a7-8ebf-f23865a042c4
- **Log files**: `backend/etf_sync.log`

## Troubleshooting

### No Data Displayed

**Check:**
1. DynamoDB table exists and has data
2. AWS credentials are configured
3. Table name matches: `ETFData`
4. Region matches: `us-east-1`

**Debug:**
```bash
# Check API endpoint
curl http://localhost:3000/api/etf-leverage?leverageType=all&limit=10

# Check summary endpoint
curl http://localhost:3000/api/etf-leverage-summary
```

### API Errors

**Common issues:**
- AWS credentials not configured
- DynamoDB table not created
- Network connectivity issues
- Incorrect region configuration

**Solutions:**
1. Verify AWS credentials in environment
2. Run backend sync script to create table
3. Check AWS console for table status
4. Update region in API files if needed

### Styling Issues

**If styles don't load:**
1. Ensure Tailwind CSS is configured
2. Check Material-UI installation
3. Rebuild the application: `npm run build`

## Future Enhancements

Potential improvements:
1. **Charts** - Add performance charts for visual analysis
2. **Comparison** - Compare multiple ETFs side-by-side
3. **Alerts** - Set price/performance alerts
4. **Favorites** - Save favorite ETFs
5. **Export** - Export data to CSV/Excel
6. **Advanced filters** - Filter by asset class, issuer, etc.
7. **Search** - Search ETFs by ticker or name
8. **Pagination** - Handle large datasets more efficiently
9. **Real-time updates** - WebSocket for live price updates
10. **Historical data** - View historical performance charts

## Rollback

If you need to restore the original home page:

```bash
cd /home/fec/qdii-fund-quota
mv pages/index.tsx pages/index-leveraged-etf.tsx
mv pages/index-old-backup.tsx pages/index.tsx
```

## Support

For issues or questions:
- Check the API endpoint responses
- Review DynamoDB table data
- Check browser console for errors
- Review server logs: `npm run dev` output
