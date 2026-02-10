import { generateKey, encrypt, decrypt } from '../src/crypto.js';

describe('Crypto Module', () => {
  const TEST_KEY_LENGTH = 32; // bytes
  const TEST_CONTENT = 'SECRET_VALUE=123456';

  describe('generateKey', () => {
    it('should generate a 32-byte key as a hex string', () => {
      const key = generateKey();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(TEST_KEY_LENGTH * 2); // hex string length
    });

    it('should generate unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encrypt and decrypt', () => {
    let key;

    beforeEach(() => {
      key = generateKey();
    });

    it('should encrypt and decrypt content correctly', () => {
      const encrypted = encrypt(TEST_CONTENT, key);
      expect(encrypted).not.toBe(TEST_CONTENT);
      expect(encrypted).toContain(':'); // should have IV and AuthTag

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(TEST_CONTENT);
    });

    it('should throw error if key is invalid', () => {
      expect(() => encrypt(TEST_CONTENT, 'invalid-key')).toThrow();
      expect(() => decrypt('some:data', 'invalid-key')).toThrow();
    });

    it('should throw error if content is empty', () => {
      expect(() => encrypt('', key)).toThrow();
      expect(() => decrypt('', key)).toThrow();
    });

    it('should throw error if encrypted format is invalid', () => {
      expect(() => decrypt('invalid-format', key)).toThrow();
    });

    it('should fail with wrong key', () => {
        const encrypted = encrypt(TEST_CONTENT, key);
        const wrongKey = generateKey();
        expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });
  });
});
