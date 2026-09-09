import path from "node:path";

function getDriveMappings(): Record<string, string> {
  const mappings: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith("LUMAVAULT_WINDOWS_DRIVE_")) {
      continue;
    }

    if (!value) {
      continue;
    }

    const drive = key
      .replace("LUMAVAULT_WINDOWS_DRIVE_", "")
      .trim()
      .toUpperCase();

    if (!/^[A-Z]$/.test(drive)) {
      continue;
    }

    mappings[drive] = path.normalize(value);
  }

  return mappings;
}

export function normalizeWindowsPath(inputPath: string): string {
  const trimmed = inputPath.trim();

  if (!trimmed) {
    return trimmed;
  }

  /*
   * Already a Linux path.
   */
  if (trimmed.startsWith("/")) {
    return path.normalize(trimmed);
  }

  /*
   * Convert Windows separators.
   *
   * D:\Games\Ben 10
   * becomes
   * D:/Games/Ben 10
   */
  const windowsPath = trimmed.replaceAll("\\", "/");

  /*
   * Match:
   *
   * D:
   * D:\
   * D:/Games
   * D:\Games
   */
  const driveMatch = windowsPath.match(
    /^([A-Za-z]):(?:\/(.*))?$/,
  );

  if (!driveMatch) {
    return trimmed;
  }

  const drive = driveMatch[1].toUpperCase();
  const relativePath = driveMatch[2] ?? "";

  const mappings = getDriveMappings();
  const mountPath = mappings[drive];

  if (!mountPath) {
    throw new Error(
      `Windows drive ${drive}: is not configured. Add LUMAVAULT_WINDOWS_DRIVE_${drive} to .env.`,
    );
  }

  if (!relativePath) {
    return mountPath;
  }

  const parts = relativePath
    .split("/")
    .filter(Boolean);

  return path.join(
    mountPath,
    ...parts,
  );
}