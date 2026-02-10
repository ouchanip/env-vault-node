import fs from 'node:fs/promises';
import { constants } from 'node:fs';

export async function readFile(filepath) {
  try {
    return await fs.readFile(filepath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function writeFile(filepath, content) {
  await fs.writeFile(filepath, content, 'utf8');
}

export async function fileExists(filepath) {
  try {
    await fs.access(filepath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
