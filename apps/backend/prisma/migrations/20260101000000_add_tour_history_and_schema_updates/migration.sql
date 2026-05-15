-- ============================================================
-- Migration: Add TourHistory, isPublished, imageUrl, updatedAt
-- ============================================================

-- Add imageUrl column to Route (optional)
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Add isPublished column to Route (default true so all existing routes are published)
ALTER TABLE "Route" ADD COLUMN IF NOT EXISTS "isPublished" BOOLEAN NOT NULL DEFAULT true;

-- Add updatedAt column to GroupSession if missing
ALTER TABLE "GroupSession" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
-- Set updatedAt for existing rows
UPDATE "GroupSession" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
-- Make updatedAt NOT NULL after setting values
ALTER TABLE "GroupSession" ALTER COLUMN "updatedAt" SET NOT NULL;

-- CreateTable TourHistory
CREATE TABLE IF NOT EXISTS "TourHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "pointsCount" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for TourHistory
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TourHistory_userId_fkey'
    ) THEN
        ALTER TABLE "TourHistory" ADD CONSTRAINT "TourHistory_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'TourHistory_routeId_fkey'
    ) THEN
        ALTER TABLE "TourHistory" ADD CONSTRAINT "TourHistory_routeId_fkey"
            FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Update foreign keys to CASCADE where appropriate
-- Rating → Route (change RESTRICT to CASCADE)
ALTER TABLE "Rating" DROP CONSTRAINT IF EXISTS "Rating_routeId_fkey";
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PointOfInterest → Route (change RESTRICT to CASCADE)
ALTER TABLE "PointOfInterest" DROP CONSTRAINT IF EXISTS "PointOfInterest_routeId_fkey";
ALTER TABLE "PointOfInterest" ADD CONSTRAINT "PointOfInterest_routeId_fkey"
    FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContentCache → PointOfInterest (change RESTRICT to CASCADE)
ALTER TABLE "ContentCache" DROP CONSTRAINT IF EXISTS "ContentCache_pointId_fkey";
ALTER TABLE "ContentCache" ADD CONSTRAINT "ContentCache_pointId_fkey"
    FOREIGN KEY ("pointId") REFERENCES "PointOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Performance Indexes
-- ============================================================

-- Route indexes
CREATE INDEX IF NOT EXISTS "Route_city_idx" ON "Route"("city");
CREATE INDEX IF NOT EXISTS "Route_city_difficulty_idx" ON "Route"("city", "difficulty");
CREATE INDEX IF NOT EXISTS "Route_isPublished_idx" ON "Route"("isPublished");
CREATE INDEX IF NOT EXISTS "Route_createdAt_idx" ON "Route"("createdAt");

-- PointOfInterest indexes
CREATE INDEX IF NOT EXISTS "PointOfInterest_routeId_idx" ON "PointOfInterest"("routeId");
CREATE INDEX IF NOT EXISTS "PointOfInterest_stableId_idx" ON "PointOfInterest"("stableId");

-- ContentCache indexes
CREATE INDEX IF NOT EXISTS "ContentCache_pointId_idx" ON "ContentCache"("pointId");

-- GroupSession indexes
CREATE INDEX IF NOT EXISTS "GroupSession_code_idx" ON "GroupSession"("code");
CREATE INDEX IF NOT EXISTS "GroupSession_hostUserId_idx" ON "GroupSession"("hostUserId");
CREATE INDEX IF NOT EXISTS "GroupSession_status_idx" ON "GroupSession"("status");

-- Rating indexes
CREATE INDEX IF NOT EXISTS "Rating_routeId_idx" ON "Rating"("routeId");
CREATE INDEX IF NOT EXISTS "Rating_userId_idx" ON "Rating"("userId");

-- User indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- TourHistory indexes
CREATE INDEX IF NOT EXISTS "TourHistory_userId_idx" ON "TourHistory"("userId");
CREATE INDEX IF NOT EXISTS "TourHistory_userId_completedAt_idx" ON "TourHistory"("userId", "completedAt");
