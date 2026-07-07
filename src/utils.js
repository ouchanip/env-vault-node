import fs from 'node:fs/promises';
import { constants } from 'node:fs';

/**
 * Read a file, returning null if it doesn't exist (ENOENT).
 * All other errors are re-thrown with the original error as `cause`.
 */
export async function readFile(filepath) {
  try {
    return await fs.readFile(filepath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw new Error(`Failed to read ${filepath}: ${error.message}`, { cause: error });
  }
}

/**
 * Write a file with optional restrictive permissions.
 * @param {string} filepath - Destination path
 * @param {string} content - File content
 * @param {number} [mode=0o644] - File permission mode (use 0o600 for secrets)
 */
export async function writeFile(filepath, content, mode = 0o644) {
  await fs.writeFile(filepath, content, { encoding: 'utf8', mode });
  await fs.chmod(filepath, mode);
}

/**
 * Check if a file exists.
 */
export async function fileExists(filepath) {
  try {
    await fs.access(filepath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
