-- Drop old columns if they exist
ALTER TABLE "market_stats" DROP COLUMN IF EXISTS "expenseRatio" CASCADE;
ALTER TABLE "market_stats" DROP COLUMN IF EXISTS "expenseCount" CASCADE;

-- Add new columns for expense ratio range distribution
ALTER TABLE "market_stats" ADD COLUMN "expenseRatioRange" TEXT;
ALTER TABLE "market_stats" ADD COLUMN "expenseRatioCount" INTEGER;

