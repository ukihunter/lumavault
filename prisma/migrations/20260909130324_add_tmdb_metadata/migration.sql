-- AlterTable
ALTER TABLE "Movie" ADD COLUMN "overview" TEXT;
ALTER TABLE "Movie" ADD COLUMN "tmdbId" INTEGER;
ALTER TABLE "Movie" ADD COLUMN "voteAverage" REAL;

-- AlterTable
ALTER TABLE "Series" ADD COLUMN "overview" TEXT;
ALTER TABLE "Series" ADD COLUMN "tmdbId" INTEGER;
ALTER TABLE "Series" ADD COLUMN "voteAverage" REAL;
