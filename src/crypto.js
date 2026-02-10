import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

export function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

export function encrypt(text, keyHex) {
  if (!text) {
    throw new Error('No text to encrypt');
  }
  if (!keyHex || keyHex.length !== KEY_LENGTH * 2) { // 32 bytes = 64 hex chars
    throw new Error('Invalid key length');
  }

  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: IV (hex) : AuthTag (hex) : Encrypted (hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText, keyHex) {
    if (!encryptedText) {
        throw new Error('No text to decrypt');
    }
    if (!keyHex || keyHex.length !== KEY_LENGTH * 2) {
        throw new Error('Invalid key length');
    }

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted format');
    }

    const [ivHex, authTagHex, contentHex] = parts;

    const key = Buffer.from(keyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
