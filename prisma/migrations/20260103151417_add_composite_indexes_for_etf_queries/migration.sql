-- CreateIndex
CREATE INDEX "etf_data_etfLeverage_aum_idx" ON "etf_data"("etfLeverage", "aum" DESC);

-- CreateIndex
CREATE INDEX "etf_data_issuer_aum_idx" ON "etf_data"("issuer", "aum" DESC);

-- CreateIndex
CREATE INDEX "etf_data_etfLeverage_issuer_aum_idx" ON "etf_data"("etfLeverage", "issuer", "aum" DESC);

-- CreateIndex
CREATE INDEX "etf_data_chYTD_idx" ON "etf_data"("chYTD" DESC);

-- CreateIndex
CREATE INDEX "etf_data_ch1m_idx" ON "etf_data"("ch1m" DESC);

-- CreateIndex
CREATE INDEX "etf_data_ch1y_idx" ON "etf_data"("ch1y" DESC);
