export type MediaSourceType = "FILE" | "ARCHIVE";

export type ScanMedia = {
  sourceType: MediaSourceType;

  /**
   * Absolute filesystem path when the media is a normal file.
   */
  filePath?: string;

  /**
   * Absolute path to the archive.
   */
  archivePath?: string;

  /**
   * Path of the media entry inside the archive.
   */
  entryPath?: string;

  /**
   * Path relative to the library root.
   */
  relativePath: string;

  /**
   * Actual media filename.
   */
  filename: string;
};