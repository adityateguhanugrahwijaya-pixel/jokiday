-- Migration: Two-Way Rating System (Sistem Rating Dua Arah)
-- Safe, additive migration for PostgreSQL/Supabase

-- 1. Tambah field agregat customer rating pada tabel User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerRatingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "customerRatingCount" INTEGER NOT NULL DEFAULT 0;

-- 2. Adaptasi tabel Review
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "direction" TEXT NOT NULL DEFAULT 'CUSTOMER_TO_DESIGNER';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'VISIBLE';
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "hiddenReason" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "hiddenBy" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "designerReply" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "designerRepliedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 3. Constraint Unik dan Indeks untuk Review
CREATE UNIQUE INDEX IF NOT EXISTS "Review_orderId_direction_key" ON "Review"("orderId", "direction");
CREATE INDEX IF NOT EXISTS "Review_direction_status_idx" ON "Review"("direction", "status");
CREATE INDEX IF NOT EXISTS "Review_revieweeId_direction_idx" ON "Review"("revieweeId", "direction");
CREATE INDEX IF NOT EXISTS "Review_reviewerId_idx" ON "Review"("reviewerId");

-- 4. Buat tabel ReviewReport untuk moderasi ulasan
CREATE TABLE IF NOT EXISTS "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- 5. Indeks dan Foreign Keys untuk ReviewReport
CREATE INDEX IF NOT EXISTS "ReviewReport_reviewId_idx" ON "ReviewReport"("reviewId");
CREATE INDEX IF NOT EXISTS "ReviewReport_reporterId_idx" ON "ReviewReport"("reporterId");
CREATE INDEX IF NOT EXISTS "ReviewReport_status_idx" ON "ReviewReport"("status");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ReviewReport_reviewId_fkey'
    ) THEN
        ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey"
        FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ReviewReport_reporterId_fkey'
    ) THEN
        ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey"
        FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
