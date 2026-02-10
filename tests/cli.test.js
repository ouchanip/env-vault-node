import { jest } from '@jest/globals';

// Define mocks before importing the module under test
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

// Import modules dynamically after mocking
const { init, encrypt, decrypt } = await import('../src/index.js');
const utils = await import('../src/utils.js');
const crypto = await import('../src/crypto.js');

describe('CLI Logic (src/index.js)', () => {
  const MOCK_KEY_HEX = 'a'.repeat(64);
  const MOCK_CONTENT = 'SECRET=123';
  const MOCK_ENCRYPTED_CONTENT = 'iv:tag:encrypted';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('init', () => {
    it('should generate key and write to file if not exists', async () => {
      utils.fileExists.mockResolvedValue(false);
      crypto.generateKey.mockReturnValue(MOCK_KEY_HEX);
      utils.writeFile.mockResolvedValue();

      const result = await init();

      expect(utils.fileExists).toHaveBeenCalledWith(expect.stringContaining('.env.key'));
      expect(crypto.generateKey).toHaveBeenCalled();
      expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('.env.key'), MOCK_KEY_HEX);
      expect(result).toContain('.env.key');
    });

    it('should throw if .env.key exists', async () => {
      utils.fileExists.mockResolvedValue(true);

      await expect(init()).rejects.toThrow('already exists');
    });
  });

  describe('encrypt', () => {
    it('should encrypt content and write to file', async () => {
      utils.fileExists.mockResolvedValue(true); // key exists
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
      expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('.env.enc'), MOCK_ENCRYPTED_CONTENT);
    });

    it('should throw if input file missing', async () => {
        utils.readFile.mockResolvedValue(null);
        await expect(encrypt('missing.env', 'out.enc')).rejects.toThrow('not found');
    });
  });

  describe('decrypt', () => {
    it('should decrypt content and return data if output not specified', async () => {
        utils.fileExists.mockResolvedValue(true); // key exists
        utils.readFile.mockImplementation((path) => {
            if (path.endsWith('.env.key')) return Promise.resolve(MOCK_KEY_HEX);
            if (path.endsWith('.env.enc')) return Promise.resolve(MOCK_ENCRYPTED_CONTENT);
            return Promise.resolve(null);
        });
        crypto.decrypt.mockReturnValue(MOCK_CONTENT);

        const result = await decrypt('.env.enc', null);

        expect(utils.readFile).toHaveBeenCalledWith(expect.stringContaining('.env.enc'));
        expect(crypto.decrypt).toHaveBeenCalledWith(MOCK_ENCRYPTED_CONTENT, MOCK_KEY_HEX);
        expect(result).toEqual({ type: 'content', data: MOCK_CONTENT });
    });

    it('should decrypt content and write to file if output specified', async () => {
        utils.fileExists.mockResolvedValue(true); // key exists
        utils.readFile.mockImplementation((path) => {
            if (path.endsWith('.env.key')) return Promise.resolve(MOCK_KEY_HEX);
            if (path.endsWith('.env.enc')) return Promise.resolve(MOCK_ENCRYPTED_CONTENT);
            return Promise.resolve(null);
        });
        crypto.decrypt.mockReturnValue(MOCK_CONTENT);
        utils.writeFile.mockResolvedValue();

        const result = await decrypt('.env.enc', 'out.env');

        expect(utils.writeFile).toHaveBeenCalledWith(expect.stringContaining('out.env'), MOCK_CONTENT);
        expect(result.type).toBe('file');
    });
  });
});
