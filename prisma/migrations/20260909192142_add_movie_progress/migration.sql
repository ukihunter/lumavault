-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Progress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "position" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "episodeId" TEXT,
    "movieId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Progress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Progress_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Progress" ("completed", "episodeId", "id", "position", "updatedAt") SELECT "completed", "episodeId", "id", "position", "updatedAt" FROM "Progress";
DROP TABLE "Progress";
ALTER TABLE "new_Progress" RENAME TO "Progress";
CREATE UNIQUE INDEX "Progress_episodeId_key" ON "Progress"("episodeId");
CREATE UNIQUE INDEX "Progress_movieId_key" ON "Progress"("movieId");
CREATE INDEX "Progress_updatedAt_idx" ON "Progress"("updatedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
