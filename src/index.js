import path from 'node:path';
import { readFile, writeFile, fileExists } from './utils.js';
import { generateKey, encrypt as encryptData, decrypt as decryptData } from './crypto.js';

const KEY_FILENAME = '.env.key';
const DEFAULT_INPUT_ENV = '.env';
const DEFAULT_OUTPUT_ENC = '.env.enc';
const SECRET_MODE = 0o600;

async function getKey() {
  if (process.env.DOTENV_KEY) {
    return process.env.DOTENV_KEY.trim();
  }

  const keyPath = path.resolve(process.cwd(), KEY_FILENAME);
  if (await fileExists(keyPath)) {
    return (await readFile(keyPath)).trim();
  }

  throw new Error(`Key file ${KEY_FILENAME} not found. Run 'env-vault init' first.`);
}

export async function init() {
  const keyPath = path.resolve(process.cwd(), KEY_FILENAME);

  if (await fileExists(keyPath)) {
    throw new Error(`${KEY_FILENAME} already exists.`);
  }

  const key = generateKey();
  await writeFile(keyPath, key, SECRET_MODE);
  return keyPath;
}

export async function encrypt(inputPath = DEFAULT_INPUT_ENV, outputPath = DEFAULT_OUTPUT_ENC) {
  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = path.resolve(process.cwd(), outputPath);

  const content = await readFile(resolvedInput);
  if (content === null) {
    throw new Error(`Input file ${inputPath} not found.`);
  }

  const key = await getKey();
  const encrypted = encryptData(content, key);

  // Write .env.enc with restrictive permissions (issue #6)
  await writeFile(resolvedOutput, encrypted, SECRET_MODE);
  return resolvedOutput;
}

export async function decrypt(inputPath = DEFAULT_OUTPUT_ENC, outputPath = null, options = {}) {
  const { force = false } = options;
  const resolvedInput = path.resolve(process.cwd(), inputPath);

  const content = await readFile(resolvedInput);
  if (content === null) {
    throw new Error(`Input file ${inputPath} not found.`);
  }

  const key = await getKey();
  let decrypted;
  try {
    decrypted = decryptData(content, key);
  } catch (error) {
    // Preserve original error for debugging (issue #7)
    throw new Error('Decryption failed. Invalid key or corrupted file.', { cause: error });
  }

  if (outputPath) {
    const resolvedOutput = path.resolve(process.cwd(), outputPath);

    // Warn before overwriting existing files (issue #4)
    if (!force && await fileExists(resolvedOutput)) {
      throw new OverwriteError(resolvedOutput);
    }

    await writeFile(resolvedOutput, decrypted, SECRET_MODE);
    return { type: 'file', path: resolvedOutput };
  } else {
    return { type: 'content', data: decrypted };
  }
}

/**
 * Custom error for overwrite protection — allows CLI to distinguish
 * exit code 2 (overwrite warning) from exit code 1 (generic error).
 */
export class OverwriteError extends Error {
  constructor(filepath) {
    super(`Output file already exists: ${filepath}. Use --force to overwrite.`);
    this.name = 'OverwriteError';
    this.code = 'OVERWRITE';
    this.filepath = filepath;
  }
}
