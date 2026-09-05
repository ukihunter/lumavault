/*
  Warnings:

  - Added the required column `updatedAt` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `libraryId` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Season` table without a default value. This is not possible if the table is not empty.
  - Added the required column `libraryId` to the `Series` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Library" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
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
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "seasonId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("description", "duration", "filePath", "id", "number", "seasonId", "thumbnail", "title") SELECT "description", "duration", "filePath", "id", "number", "seasonId", "thumbnail", "title" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE UNIQUE INDEX "Episode_filePath_key" ON "Episode"("filePath");
CREATE UNIQUE INDEX "Episode_seasonId_number_key" ON "Episode"("seasonId", "number");
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "poster" TEXT,
    "backdrop" TEXT,
    "filePath" TEXT NOT NULL,
    "duration" INTEGER,
    "libraryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Movie_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Movie" ("backdrop", "createdAt", "description", "duration", "filePath", "id", "poster", "title", "updatedAt", "year") SELECT "backdrop", "createdAt", "description", "duration", "filePath", "id", "poster", "title", "updatedAt", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_filePath_key" ON "Movie"("filePath");
CREATE INDEX "Movie_libraryId_idx" ON "Movie"("libraryId");
CREATE INDEX "Movie_title_idx" ON "Movie"("title");
CREATE INDEX "Movie_year_idx" ON "Movie"("year");
CREATE TABLE "new_Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "seriesId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Season" ("id", "number", "seriesId", "title") SELECT "id", "number", "seriesId", "title" FROM "Season";
DROP TABLE "Season";
ALTER TABLE "new_Season" RENAME TO "Season";
CREATE UNIQUE INDEX "Season_seriesId_number_key" ON "Season"("seriesId", "number");
CREATE TABLE "new_Series" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "poster" TEXT,
    "backdrop" TEXT,
    "libraryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Series_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Series" ("backdrop", "createdAt", "description", "id", "poster", "title", "updatedAt") SELECT "backdrop", "createdAt", "description", "id", "poster", "title", "updatedAt" FROM "Series";
DROP TABLE "Series";
ALTER TABLE "new_Series" RENAME TO "Series";
CREATE INDEX "Series_libraryId_idx" ON "Series"("libraryId");
CREATE INDEX "Series_title_idx" ON "Series"("title");
CREATE INDEX "Series_year_idx" ON "Series"("year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Library_path_key" ON "Library"("path");
