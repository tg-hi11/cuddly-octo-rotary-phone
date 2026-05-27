/**
 * Format milliseconds into a readable duration string
 * e.g. 3723000 -> "1h 2m 3s"
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Format a Unix timestamp (seconds) into a Discord timestamp string
 */
export function discordTimestamp(unixSeconds: number, style: 'R' | 'F' | 'f' | 'D' | 'd' | 't' | 'T' = 'f'): string {
  return `<t:${Math.floor(unixSeconds)}:${style}>`;
}

/**
 * Truncate a string to a max length, appending "..." if cut
 */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

/**
 * Chunk an array into pages of a given size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Seconds since a given Date
 */
export function secondsSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 1000);
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
