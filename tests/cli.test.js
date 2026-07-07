import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/utils.js', () => ({
  fileExists: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
}));

jest.unstable_mockModule('../src/crypto.js', () => ({
  generateKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
}));

const { init, encrypt, decrypt, OverwriteError } = await import('../src/index.js');
const utils = await import('../src/utils.js');
const crypto = await import('../src/crypto.js');

describe('CLI Logic (src/index.js)', () => {
  const MOCK_KEY_HEX = 'a'.repeat(64);
  const MOCK_CONTENT = 'SECRET=123';
  const MOCK_ENCRYPTED_CONTENT = 'iv:tag:encrypted';
  const SECRET_MODE = 0o600;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.DOTENV_KEY;
  });

  describe('init', () => {
    it('should generate key and write to file with restrictive permissions if not exists', async () => {
      utils.fileExists.mockResolvedValue(false);
      crypto.generateKey.mockReturnValue(MOCK_KEY_HEX);
      utils.writeFile.mockResolvedValue();

      const result = await init();

      expect(utils.fileExists).toHaveBeenCalledWith(expect.stringContaining('.env.key'));
      expect(crypto.generateKey).toHaveBeenCalled();
      expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('.env.key'), MOCK_KEY_HEX, SECRET_MODE);
      expect(result).toContain('.env.key');
    });

    it('should throw if .env.key exists', async () => {
      utils.fileExists.mockResolvedValue(true);

      await expect(init()).rejects.toThrow('already exists');
    });
  });

  describe('encrypt', () => {
    it('should encrypt content and write encrypted file with restrictive permissions', async () => {
      utils.fileExists.mockResolvedValue(true);
      utils.readFile.mockImplementation((path) => {
        if (path.endsWith('.env.key')) return Promise.resolve(MOCK_KEY_HEX);
        if (path.endsWith('.env')) return Promise.resolve(MOCK_CONTENT);
        return Promise.resolve(null);
      });
      crypto.encrypt.mockReturnValue(MOCK_ENCRYPTED_CONTENT);
      utils.writeFile.mockResolvedValue();

      const result = await encrypt('.env', '.env.enc');

      expect(utils.readFile).toHaveBeenCalledWith(expect.stringContaining('.env'));
      expect(utils.readFile).toHaveBeenCalledWith(expect.stringContaining('.env.key'));
      expect(crypto.encrypt).toHaveBeenCalledWith(MOCK_CONTENT, MOCK_KEY_HEX);
      expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('.env.enc'), MOCK_ENCRYPTED_CONTENT, SECRET_MODE);
      expect(result).toContain('.env.enc');
    });

    it('should use DOTENV_KEY when present', async () => {
      process.env.DOTENV_KEY = MOCK_KEY_HEX;
      utils.readFile.mockResolvedValue(MOCK_CONTENT);
      crypto.encrypt.mockReturnValue(MOCK_ENCRYPTED_CONTENT);
      utils.writeFile.mockResolvedValue();

      await encrypt('.env', '.env.enc');

      expect(utils.readFile).toHaveBeenCalledTimes(1);
      expect(crypto.encrypt).toHaveBeenCalledWith(MOCK_CONTENT, MOCK_KEY_HEX);
    });

    it('should throw if input file missing', async () => {
      utils.readFile.mockResolvedValue(null);
      await expect(encrypt('missing.env', 'out.enc')).rejects.toThrow('not found');
    });

    it('should show the correct env-vault command in missing key error', async () => {
      utils.fileExists.mockResolvedValue(false);
      utils.readFile.mockResolvedValue(MOCK_CONTENT);
      await expect(encrypt('.env', '.env.enc')).rejects.toThrow("env-vault init");
    });
  });

  describe('decrypt', () => {
    beforeEach(() => {
      utils.readFile.mockImplementation((path) => {
        if (path.endsWith('.env.key')) return Promise.resolve(MOCK_KEY_HEX);
        if (path.endsWith('.env.enc')) return Promise.resolve(MOCK_ENCRYPTED_CONTENT);
        return Promise.resolve(null);
      });
      crypto.decrypt.mockReturnValue(MOCK_CONTENT);
      utils.writeFile.mockResolvedValue();
    });

    it('should decrypt content and return data if output not specified', async () => {
      utils.fileExists.mockResolvedValue(true);

      const result = await decrypt('.env.enc', null);

      expect(utils.readFile).toHaveBeenCalledWith(expect.stringContaining('.env.enc'));
      expect(crypto.decrypt).toHaveBeenCalledWith(MOCK_ENCRYPTED_CONTENT, MOCK_KEY_HEX);
      expect(result).toEqual({ type: 'content', data: MOCK_CONTENT });
    });

    it('should refuse to overwrite an existing output file unless force=true', async () => {
      utils.fileExists.mockResolvedValue(true);

      await expect(decrypt('.env.enc', 'out.env')).rejects.toBeInstanceOf(OverwriteError);
    });

    it('should decrypt content and write to file with restrictive permissions if force=true', async () => {
      utils.fileExists.mockResolvedValue(true);

      const result = await decrypt('.env.enc', 'out.env', { force: true });

      expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('out.env'), MOCK_CONTENT, SECRET_MODE);
      expect(result.type).toBe('file');
    });

    it('should preserve original decrypt error as cause', async () => {
      const originalError = new Error('auth tag mismatch');
      utils.fileExists.mockResolvedValue(true);
      crypto.decrypt.mockImplementation(() => { throw originalError; });

      await expect(decrypt('.env.enc', null)).rejects.toMatchObject({ cause: originalError });
    });
  });
});
