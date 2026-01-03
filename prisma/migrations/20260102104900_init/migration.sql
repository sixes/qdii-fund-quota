-- CreateTable
CREATE TABLE "fund_quota" (
    "id" SERIAL NOT NULL,
    "fund_company" TEXT NOT NULL,
    "fund_name" TEXT NOT NULL,
    "share_class" TEXT NOT NULL,
    "fund_code" VARCHAR(20) NOT NULL,
    "quota" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "otc" VARCHAR(10) NOT NULL,
    "pdf_id" INTEGER NOT NULL,

    CONSTRAINT "fund_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "etf_data" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "etfLeverage" TEXT,
    "issuer" TEXT,
    "aum" DECIMAL(15,2),
    "assetClass" TEXT,
    "expenseRatio" DECIMAL(5,3),
    "peRatio" DECIMAL(10,4),
    "price" DECIMAL(10,2),
    "volume" BIGINT,
    "ch1w" DECIMAL(10,4),
    "ch1m" DECIMAL(10,4),
    "ch6m" DECIMAL(10,4),
    "chYTD" DECIMAL(10,4),
    "ch1y" DECIMAL(10,4),
    "ch3y" DECIMAL(10,4),
    "ch5y" DECIMAL(10,4),
    "ch10y" DECIMAL(10,4),
    "high52" DECIMAL(10,2),
    "low52" DECIMAL(10,2),
    "allTimeLow" DECIMAL(10,2),
    "allTimeLowChange" DECIMAL(10,4),
    "allTimeHigh" DECIMAL(10,2),
    "allTimeHighChange" DECIMAL(10,4),
    "allTimeHighDate" TEXT,
    "allTimeLowDate" TEXT,
    "etfIndex" TEXT,
    "inceptionDate" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etf_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delisted_etfs" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "delistedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etfLeverage" TEXT,
    "issuer" TEXT,
    "aum" DECIMAL(15,2),
    "assetClass" TEXT,
    "expenseRatio" DECIMAL(5,3),
    "etfIndex" TEXT,

    CONSTRAINT "delisted_etfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "new_launch_etfs" (
    "id" SERIAL NOT NULL,
    "ticker" TEXT NOT NULL,
    "issuer" TEXT,
    "inceptionDate" TEXT NOT NULL,
    "aum" DECIMAL(15,2),
    "assetClass" TEXT,
    "expenseRatio" DECIMAL(5,3),
    "etfIndex" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "new_launch_etfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gainer_losers" (
    "id" SERIAL NOT NULL,
    "period" TEXT NOT NULL,
    "rankType" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "ticker" TEXT NOT NULL,
    "issuer" TEXT,
    "etfLeverage" TEXT,
    "aum" DECIMAL(15,2),
    "etfIndex" TEXT,
    "returnValue" DECIMAL(10,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gainer_losers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_stats" (
    "id" SERIAL NOT NULL,
    "statKey" TEXT NOT NULL,
    "totalAUM" DECIMAL(20,2),
    "totalETFCount" INTEGER,
    "issuer" TEXT,
    "issuerAUM" DECIMAL(20,2),
    "issuerCount" INTEGER,
    "leverageType" TEXT,
    "leverageAUM" DECIMAL(20,2),
    "leverageCount" INTEGER,
    "expenseRatio" TEXT,
    "expenseCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "index_constituents" (
    "id" SERIAL NOT NULL,
    "indexName" TEXT NOT NULL,
    "symbols" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "index_constituents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etf_data_ticker_key" ON "etf_data"("ticker");

-- CreateIndex
CREATE INDEX "etf_data_etfLeverage_idx" ON "etf_data"("etfLeverage");

-- CreateIndex
CREATE INDEX "etf_data_issuer_idx" ON "etf_data"("issuer");

-- CreateIndex
CREATE INDEX "delisted_etfs_delistedDate_idx" ON "delisted_etfs"("delistedDate");

-- CreateIndex
CREATE UNIQUE INDEX "delisted_etfs_ticker_delistedDate_key" ON "delisted_etfs"("ticker", "delistedDate");

-- CreateIndex
CREATE INDEX "new_launch_etfs_inceptionDate_idx" ON "new_launch_etfs"("inceptionDate");

-- CreateIndex
CREATE UNIQUE INDEX "new_launch_etfs_ticker_inceptionDate_key" ON "new_launch_etfs"("ticker", "inceptionDate");

-- CreateIndex
CREATE INDEX "gainer_losers_period_idx" ON "gainer_losers"("period");

-- CreateIndex
CREATE INDEX "gainer_losers_ticker_idx" ON "gainer_losers"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "gainer_losers_period_rankType_rank_key" ON "gainer_losers"("period", "rankType", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "market_stats_statKey_key" ON "market_stats"("statKey");

-- CreateIndex
CREATE INDEX "market_stats_statKey_idx" ON "market_stats"("statKey");

-- CreateIndex
CREATE INDEX "market_stats_issuer_idx" ON "market_stats"("issuer");

-- CreateIndex
CREATE INDEX "market_stats_leverageType_idx" ON "market_stats"("leverageType");

-- CreateIndex
CREATE UNIQUE INDEX "index_constituents_indexName_key" ON "index_constituents"("indexName");
