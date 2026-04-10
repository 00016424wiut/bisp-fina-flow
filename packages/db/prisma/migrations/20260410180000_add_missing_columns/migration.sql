-- AlterTable: add missing "phone" column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable: add missing columns to Venue table
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "minGuests" INTEGER;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "maxGuests" INTEGER;
ALTER TABLE "Venue" ADD COLUMN IF NOT EXISTS "menuUrl" TEXT;
