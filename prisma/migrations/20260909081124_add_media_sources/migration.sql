/*
  Warnings:

  - You are about to drop the column `filePath` on the `Episode` table. All the data in the column will be lost.
  - You are about to drop the column `filePath` on the `Movie` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "MediaSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "filePath" TEXT,
    "archivePath" TEXT,
    "entryPath" TEXT,
    "movieId" TEXT,
    "episodeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MediaSource_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MediaSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "duration" INTEGER,
    "seasonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("createdAt", "description", "duration", "id", "number", "seasonId", "thumbnail", "title", "updatedAt") SELECT "createdAt", "description", "duration", "id", "number", "seasonId", "thumbnail", "title", "updatedAt" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "poster" TEXT,
    "backdrop" TEXT,
    "duration" INTEGER,
    "libraryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movie_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("backdrop", "createdAt", "description", "duration", "id", "libraryId", "poster", "title", "updatedAt", "year") SELECT "backdrop", "createdAt", "description", "duration", "id", "libraryId", "poster", "title", "updatedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE INDEX "Movie_libraryId_idx" ON "Movie"("libraryId");
CREATE INDEX "Movie_title_idx" ON "Movie"("title");
CREATE INDEX "Movie_year_idx" ON "Movie"("year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_filePath_key" ON "MediaSource"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_movieId_key" ON "MediaSource"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_episodeId_key" ON "MediaSource"("episodeId");

-- CreateIndex
CREATE INDEX "MediaSource_type_idx" ON "MediaSource"("type");

-- CreateIndex
CREATE INDEX "MediaSource_archivePath_idx" ON "MediaSource"("archivePath");

-- CreateIndex
CREATE UNIQUE INDEX "MediaSource_archivePath_entryPath_key" ON "MediaSource"("archivePath", "entryPath");
