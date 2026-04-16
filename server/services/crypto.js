"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptKey = encryptKey;
exports.decryptKey = decryptKey;
exports.getDecryptedKey = getDecryptedKey;
const crypto_1 = __importDefault(require("crypto"));
const prisma_js_1 = __importDefault(require("./prisma.js"));
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-for-dev';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? crypto_1.default.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32)
    : crypto_1.default.scryptSync(JWT_SECRET, 'salt', 32);
const ALGORITHM = 'aes-256-gcm';
function encryptKey(text) {
    const iv = crypto_1.default.randomBytes(12);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { encryptedKey: encrypted + ':' + authTag, keyIv: iv.toString('hex') };
}
function decryptKey(encryptedKeyWithTag, keyIv) {
    const [encrypted, authTag] = encryptedKeyWithTag.split(':');
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(keyIv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
async function getDecryptedKey(userId, provider) {
    const keyRecord = await prisma_js_1.default.apiKey.findUnique({
        where: { userId_provider: { userId, provider } }
    });
    if (!keyRecord)
        return null;
    try {
        return decryptKey(keyRecord.encryptedKey, keyRecord.keyIv);
    }
    catch (e) {
        console.error(`Failed to decrypt key for user ${userId}, provider ${provider}`);
        return null;
    }
}
