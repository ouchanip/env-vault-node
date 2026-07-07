import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile, fileExists } from '../src/utils.js';

describe('Utils Module', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-vault-utils-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('readFile returns file content', async () => {
    const file = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(file, 'hello', 'utf8');

    await expect(readFile(file)).resolves.toBe('hello');
  });

  it('readFile returns null for missing files', async () => {
    const file = path.join(tmpDir, 'missing.txt');

    await expect(readFile(file)).resolves.toBeNull();
  });

  it('writeFile writes content using the supplied mode', async () => {
    const file = path.join(tmpDir, 'secret.txt');
    await writeFile(file, 'secret', 0o600);

    await expect(readFile(file)).resolves.toBe('secret');

    if (process.platform !== 'win32') {
      const stat = await fs.stat(file);
      expect(stat.mode & 0o777).toBe(0o600);
    }
  });

  it('writeFile reapplies the supplied mode when overwriting an existing file', async () => {
    const file = path.join(tmpDir, 'existing-secret.txt');
    await fs.writeFile(file, 'old-secret', { encoding: 'utf8', mode: 0o644 });
    if (process.platform !== 'win32') {
      await fs.chmod(file, 0o644);
    }

    await writeFile(file, 'new-secret', 0o600);

    await expect(readFile(file)).resolves.toBe('new-secret');
    if (process.platform !== 'win32') {
      const stat = await fs.stat(file);
      expect(stat.mode & 0o777).toBe(0o600);
    }
  });

  it('fileExists returns true only when a file exists', async () => {
    const file = path.join(tmpDir, 'exists.txt');

    await expect(fileExists(file)).resolves.toBe(false);
    await fs.writeFile(file, 'x', 'utf8');
    await expect(fileExists(file)).resolves.toBe(true);
  });
});
