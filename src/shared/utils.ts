/**
 * Removes characters that are invalid for file/directory names across OSes.
 * Replaces characters like < > : " / \ | ? * with an underscore.
 * @param name The input string (e.g., a hostname).
 * @returns A sanitized string safe for use in a path.
 */
export function sanitizeFilename(name: string): string {
  // eslint-disable-next-line no-useless-escape
  return name.replace(/[<>:"\/\\|?*]/g, '_');
}