import crypto from 'crypto';
import prisma from './prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32) 
  : crypto.scryptSync(JWT_SECRET, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

export function encryptKey(text: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return { encryptedKey: encrypted + ':' + authTag, keyIv: iv.toString('hex') };
}

export function decryptKey(encryptedKeyWithTag: string, keyIv: string) {
  const [encrypted, authTag] = encryptedKeyWithTag.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(keyIv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getDecryptedKey(userId: string, provider: string): Promise<string | null> {
  const keyRecord = await prisma.apiKey.findUnique({
    where: { userId_provider: { userId, provider } }
  });
  if (!keyRecord) return null;
  try {
    return decryptKey(keyRecord.encryptedKey, keyRecord.keyIv);
  } catch (e) {
    console.error(`Failed to decrypt key for user ${userId}, provider ${provider}`);
    return null;
  }
}
