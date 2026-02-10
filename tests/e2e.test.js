import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BIN_PATH = path.resolve(__dirname, '../bin/env-vault.js');

describe('E2E Tests', () => {
  let tmpDir;
  let originalCwd;

  beforeEach(() => {
    // Create a temp directory for each test
    // We create it inside os.tmpdir() but we need to ensure unique name
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-vault-e2e-'));
    originalCwd = process.cwd();
    // We cannot change process.cwd() in Jest parallel tests safely,
    // but if we run sequentially or use absolute paths it's better.
    // However, the CLI relies on process.cwd() for .env and .env.key resolution.
    // So changing process.cwd() is necessary for the CLI to find files in tmpDir
    // UNLESS we pass paths explicitly.
    // But `init` command generates .env.key in CWD.
    // So we must change CWD.
    // Assuming tests run serially or in separate processes.
    try {
      process.chdir(tmpDir);
    } catch (err) {
      console.error('Failed to change directory:', err);
    }
  });

  afterEach(() => {
    // Cleanup
    if (originalCwd) {
        process.chdir(originalCwd);
    }
    if (tmpDir && fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('should complete the full workflow: init -> encrypt -> decrypt', () => {
    // 1. Init
    // We use node executable to run the bin script
    // execSync throws if exit code != 0
    let output;
    try {
        output = execSync(`node "${BIN_PATH}" init`, { encoding: 'utf8' });
    } catch (e) {
        console.error('Init failed:', e.stderr);
        throw e;
    }
    expect(output).toContain('Key generated');
    expect(fs.existsSync('.env.key')).toBe(true);

    // 2. Create .env
    const envContent = 'SECRET=e2e-test-value';
    fs.writeFileSync('.env', envContent);

    // 3. Encrypt
    try {
        output = execSync(`node "${BIN_PATH}" encrypt`, { encoding: 'utf8' });
    } catch (e) {
        console.error('Encrypt failed:', e.stderr);
        throw e;
    }
    expect(output).toContain('Encrypted to');
    expect(fs.existsSync('.env.enc')).toBe(true);

    // 4. Decrypt to stdout
    try {
        output = execSync(`node "${BIN_PATH}" decrypt`, { encoding: 'utf8' });
    } catch (e) {
        console.error('Decrypt failed:', e.stderr);
        throw e;
    }
    // The output should contain the content
    expect(output).toContain(envContent);

    // 5. Decrypt to file
    try {
        output = execSync(`node "${BIN_PATH}" decrypt --output-file .env.decrypted`, { encoding: 'utf8' });
    } catch (e) {
        console.error('Decrypt to file failed:', e.stderr);
        throw e;
    }
    expect(output).toContain('Decrypted to');
    expect(fs.existsSync('.env.decrypted')).toBe(true);
    const decryptedContent = fs.readFileSync('.env.decrypted', 'utf8');
    expect(decryptedContent).toBe(envContent);
  });

  test('should fail if key is missing', () => {
    fs.writeFileSync('.env', 'FOO=bar');
    // skip init
    try {
      execSync(`node "${BIN_PATH}" encrypt`, { stdio: 'pipe' }); // stdio pipe to capture stderr
      // Should fail
      throw new Error('Should have failed');
    } catch (error) {
      expect(error.status).not.toBe(0);
      // stderr is a buffer if not specified encoding, or use error.stderr
      const stderr = error.stderr.toString();
      expect(stderr).toContain('Error');
    }
  });
});
