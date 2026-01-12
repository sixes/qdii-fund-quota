-- AlterTable
ALTER TABLE "fund_quota" ADD COLUMN "effective_date" date;

-- Make it non-nullable with a default value for existing rows
UPDATE "fund_quota" SET "effective_date" = CURRENT_DATE WHERE "effective_date" IS NULL;
ALTER TABLE "fund_quota" ALTER COLUMN "effective_date" SET NOT NULL;
