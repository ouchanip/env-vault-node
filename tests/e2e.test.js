import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BIN_PATH = path.resolve(__dirname, '../bin/env-vault.js');

function modeOf(file) {
  return fs.statSync(file).mode & 0o777;
}

describe('E2E Tests', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-vault-e2e-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    if (originalCwd) process.chdir(originalCwd);
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('should complete the full workflow: init -> encrypt -> decrypt', () => {
    let output = execSync(`node "${BIN_PATH}" init --no-color`, { encoding: 'utf8' });
    expect(output).toContain('Key generated');
    expect(fs.existsSync('.env.key')).toBe(true);
    if (process.platform !== 'win32') expect(modeOf('.env.key')).toBe(0o600);

    const envContent = 'SECRET=e2e-test-value';
    fs.writeFileSync('.env', envContent);

    output = execSync(`node "${BIN_PATH}" encrypt --no-color`, { encoding: 'utf8' });
    expect(output).toContain('Encrypted .env');
    expect(fs.existsSync('.env.enc')).toBe(true);
    if (process.platform !== 'win32') expect(modeOf('.env.enc')).toBe(0o600);

    output = execSync(`node "${BIN_PATH}" decrypt`, { encoding: 'utf8' });
    expect(output).toContain(envContent);

    output = execSync(`node "${BIN_PATH}" decrypt --output-file .env.decrypted --no-color`, { encoding: 'utf8' });
    expect(output).toContain('Decrypted .env.enc');
    expect(fs.existsSync('.env.decrypted')).toBe(true);
    expect(fs.readFileSync('.env.decrypted', 'utf8')).toBe(envContent);
    if (process.platform !== 'win32') expect(modeOf('.env.decrypted')).toBe(0o600);
  });

  test('should fail if key is missing and suggest env-vault init', () => {
    fs.writeFileSync('.env', 'FOO=bar');

    try {
      execSync(`node "${BIN_PATH}" encrypt --no-color`, { stdio: 'pipe' });
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.status).toBe(1);
      expect(error.stderr.toString()).toContain('env-vault init');
    }
  });

  test('should refuse to overwrite existing decrypted output without --force', () => {
    execSync(`node "${BIN_PATH}" init`, { stdio: 'pipe' });
    fs.writeFileSync('.env', 'FOO=bar');
    execSync(`node "${BIN_PATH}" encrypt`, { stdio: 'pipe' });
    fs.writeFileSync('.env.out', 'existing');

    try {
      execSync(`node "${BIN_PATH}" decrypt -o .env.out --no-color`, { stdio: 'pipe' });
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.status).toBe(2);
      expect(error.stderr.toString()).toContain('Use --force');
      expect(fs.readFileSync('.env.out', 'utf8')).toBe('existing');
    }

    execSync(`node "${BIN_PATH}" decrypt -o .env.out --force`, { stdio: 'pipe' });
    expect(fs.readFileSync('.env.out', 'utf8')).toBe('FOO=bar');
    if (process.platform !== 'win32') expect(modeOf('.env.out')).toBe(0o600);
  });

  test('should support JSON output for agents', () => {
    let output = execSync(`node "${BIN_PATH}" init --json`, { encoding: 'utf8' });
    let parsed = JSON.parse(output);
    expect(parsed).toMatchObject({ ok: true, type: 'success', command: 'init' });
    expect(parsed.keyPath).toContain('.env.key');

    fs.writeFileSync('.env', 'AGENT=ready');

    output = execSync(`node "${BIN_PATH}" encrypt --json`, { encoding: 'utf8' });
    parsed = JSON.parse(output);
    expect(parsed).toMatchObject({ ok: true, type: 'success', command: 'encrypt' });

    output = execSync(`node "${BIN_PATH}" decrypt --json`, { encoding: 'utf8' });
    parsed = JSON.parse(output);
    expect(parsed).toMatchObject({ ok: true, type: 'success', command: 'decrypt', data: 'AGENT=ready' });
  });

  test('should print large decrypted output to stdout without truncation', () => {
    execSync(`node "${BIN_PATH}" init`, { stdio: 'pipe' });
    const largeValue = `LARGE=${'x'.repeat(1024 * 1024)}`;
    fs.writeFileSync('.env', largeValue);
    execSync(`node "${BIN_PATH}" encrypt`, { stdio: 'pipe' });

    const output = execSync(`node "${BIN_PATH}" decrypt`, {
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    });

    expect(output).toBe(largeValue);
  });
});
