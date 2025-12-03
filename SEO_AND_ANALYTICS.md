# SEO and Analytics Setup

This document describes the SEO optimizations and analytics integrations added to the QDII Fund Quota application.

## Google Analytics Integration

### Setup

1. **Environment Variable Configuration**

   Add your Google Analytics ID to `.env.local`:

   ```bash
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```

   Replace `G-XXXXXXXXXX` with your actual Google Analytics 4 measurement ID.

2. **Global Implementation**

   Google Analytics is configured in `/pages/_app.tsx` and will automatically track:
   - Page views
   - User interactions
   - Custom events

### Custom Events Tracked

The application tracks the following events to understand user engagement:

#### 1. **Export Data Events**
   - **Event Name**: `export_data`
   - **Triggers**: When users export ETF data to Excel or CSV
   - **Parameters**:
     - `export_format`: "excel" or "csv"
     - `event_category`: "engagement"

   **Location**: `/pages/index.tsx` → `handleExport()` function

#### 2. **Filter Events**

   **Filter by Leverage Type**
   - **Event Name**: `filter_by_leverage`
   - **Triggers**: When users click leverage type cards (All, Long, 2X Long, etc.)
   - **Parameters**:
     - `leverage_type`: Selected leverage type (e.g., "Long", "2X Long")
     - `event_category`: "engagement"

   **Filter by Issuer**
   - **Event Name**: `filter_by_issuer`
   - **Triggers**: When users select an issuer from the dropdown menu
   - **Parameters**:
     - `issuer`: Selected issuer name
     - `event_category`: "engagement"

   **Quick Filter by Issuer**
   - **Event Name**: `quick_filter_issuer`
   - **Triggers**: When users click prominent issuer quick filter buttons (Direxion, ProShares, etc.)
   - **Parameters**:
     - `issuer`: Selected issuer name
     - `event_category`: "engagement"

   **Location**: `/pages/index.tsx` → Filter UI components

#### 3. **Sort Events**
   - **Event Name**: `sort_data`
   - **Triggers**: When users click column headers to sort ETF table
   - **Parameters**:
     - `sort_by`: Column being sorted (e.g., "ticker", "assets", "chYTD")
     - `sort_order`: Sort direction ("asc" or "desc")
     - `event_category`: "engagement"

   **Location**: `/pages/index.tsx` → `handleSort()` function

#### 4. **Search Events**
   - **Event Name**: `search_etf`
   - **Triggers**: When users type in the search input box (ticker, issuer, index search)
   - **Parameters**:
     - `search_term`: The search text entered (e.g., "TQQQ", "Direxion")
     - `search_length`: Length of the search term in characters
     - `event_category`: "engagement"

   **Location**: `/pages/index.tsx` → Search input onChange handler

## Vercel Analytics

Vercel Analytics is integrated via the `@vercel/analytics/react` package and automatically tracks:

- Web Vitals (Core Web Vitals metrics)
- User interactions
- Page performance metrics
- API route performance

No additional configuration required - it works automatically in production.

## SEO Meta Tags

All main pages include comprehensive SEO meta tags:

### Homepage (`/pages/index.tsx`)
- **Title**: "Leveraged ETF Performance Tracker | Leveraged ETF Tracker"
- **Description**: Comprehensive tracking of leveraged ETF performance with real-time data
- **Keywords**: leveraged ETF, 3X ETF, 2X ETF, Direxion, ProShares, etc.
- **Canonical URL**: https://www.qdiiquota.pro

### US Markets Pages (`/pages/funds.tsx`, `/pages/nasdaq100.tsx`, `/pages/sp500.tsx`, `/pages/dow.tsx`)
- **Titles**: Include specific index names (Nasdaq 100, S&P 500, Dow Jones)
- **Descriptions**: Real-time tracking information tailored to each index
- **Keywords**: Index-specific keywords for better search visibility
- **Canonical URLs**: 
  - https://www.qdiiquota.pro/funds
  - https://www.qdiiquota.pro/nasdaq100
  - https://www.qdiiquota.pro/sp500
  - https://www.qdiiquota.pro/dow

### Magnificent 7 Page (`/pages/mag7.tsx`)
- **Title**: "Magnificent 7 Stocks | Real-time Tech Stock Charts"
- **Description**: Real-time intraday charts for Apple, Microsoft, Alphabet, Amazon, NVIDIA, Meta, Tesla
- **Keywords**: Tech stock symbols, market analysis terms
- **Canonical URL**: https://www.qdiiquota.pro/mag7

### Multi-language Support
- Meta tags dynamically switch between English and Chinese (ZH) content
- Proper `lang` attribute handling for both languages

## Sitemap

The application includes a comprehensive sitemap at `/public/sitemap.xml` with:
- All main pages listed
- i18n alternate links for English and Chinese versions
- Appropriate priority and frequency settings for each page type
- Last modified dates for tracking freshness

## Key Features

### 1. **Open Graph Tags**
- All pages include OG meta tags for better sharing on social media
- Dynamic titles and descriptions based on language

### 2. **Dynamic Meta Tags**
- Meta tags adjust based on user language selection (EN/ZH)
- Keywords are localized for both languages

### 3. **Canonical URLs**
- All pages include canonical links to prevent duplicate content issues
- Helps Google understand the primary version of each page

### 4. **Robots Meta Tag**
- Set to "index, follow" for all public pages
- Allows search engines to crawl and index the site

## Analytics Dashboard

To view the tracked events and metrics:

1. **Google Analytics 4 Dashboard**
   - Go to [Google Analytics 4](https://analytics.google.com)
   - Select your property
   - View custom events under: Events section

2. **Vercel Analytics Dashboard**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Select your project
   - Analytics tab shows Web Vitals and performance metrics

## Best Practices

1. **Test Events Locally**: You can verify event tracking works by:
   - Opening the browser DevTools
   - Go to Network tab
   - Filter for "gtag" or "google-analytics"
   - Trigger events and verify requests are sent

2. **Monitor Search Console**: Add your site to [Google Search Console](https://search.google.com/search-console) to:
   - Monitor indexing status
   - Check search performance
   - Fix crawl errors

3. **Optimize Keywords**: Regularly review:
   - Google Analytics → Acquisition → Channels
   - Which keywords drive most traffic
   - Update meta descriptions and keywords accordingly

4. **Track Goal Performance**: Set up conversion goals in Google Analytics:
   - Track how many users export data
   - Monitor which filters are most used
   - Analyze user journey through different pages

## Environment Configuration

Example `.env.local`:

```bash
# Google Analytics - Required for tracking
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Database and AWS configs (existing)
DATABASE_URL=postgresql://...
AWS_REGION=us-east-1
```

## Troubleshooting

### Events Not Showing in Google Analytics
1. Verify `NEXT_PUBLIC_GA_ID` is set correctly
2. Check that the ID is for a GA4 property (starts with "G-")
3. Allow 24-48 hours for events to appear in the dashboard
4. Use [Google Analytics Debugger](https://chrome.google.com/webstore) browser extension to debug

### Missing Meta Tags
- Verify `<Head>` components include all required meta tags
- Check that language switching correctly updates meta tag content
- Use [Open Graph Debugger](https://developers.facebook.com/tools/debug) to test OG tags

### Vercel Analytics Not Working
- Ensure `@vercel/analytics/react` package is installed
- Check that `<Analytics />` component is rendered in `_app.tsx`
- Vercel Analytics requires deployment to Vercel (doesn't work in local development)
