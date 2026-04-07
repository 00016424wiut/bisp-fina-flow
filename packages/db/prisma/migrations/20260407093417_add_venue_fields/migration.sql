-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "averageCheck" TEXT,
ADD COLUMN     "duration" TEXT,
ADD COLUMN     "hours" TEXT,
ADD COLUMN     "menus" JSONB,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "tags" TEXT[];
