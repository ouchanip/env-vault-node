import path from 'node:path';
import { readFile, writeFile, fileExists } from './utils.js';
import { generateKey, encrypt as encryptData, decrypt as decryptData } from './crypto.js';

const KEY_FILENAME = '.env.key';
const DEFAULT_INPUT_ENV = '.env';
const DEFAULT_OUTPUT_ENC = '.env.enc';

async function getKey() {
  if (process.env.DOTENV_KEY) {
    return process.env.DOTENV_KEY.trim();
  }

  const keyPath = path.resolve(process.cwd(), KEY_FILENAME);
  if (await fileExists(keyPath)) {
    return (await readFile(keyPath)).trim();
  }

  throw new Error(`Key file ${KEY_FILENAME} not found. Run 'vault init' first.`);
}

export async function init() {
  const keyPath = path.resolve(process.cwd(), KEY_FILENAME);

  if (await fileExists(keyPath)) {
    throw new Error(`${KEY_FILENAME} already exists.`);
  }

  const key = generateKey();
  await writeFile(keyPath, key);
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

  await writeFile(resolvedOutput, encrypted);
  return resolvedOutput;
}

export async function decrypt(inputPath = DEFAULT_OUTPUT_ENC, outputPath = null) {
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
    throw new Error('Decryption failed. Invalid key or corrupted file.');
  }

  if (outputPath) {
    const resolvedOutput = path.resolve(process.cwd(), outputPath);
    await writeFile(resolvedOutput, decrypted);
    return { type: 'file', path: resolvedOutput };
  } else {
    return { type: 'content', data: decrypted };
  }
}
