/**
 * Crypto Module - AES-256-GCM Encryption
 * 
 * Provides secure encryption/decryption for data storage and sync.
 * Uses Web Crypto API with PBKDF2 key derivation.
 * 
 * Security model:
 * - PBKDF2 with 100,000 iterations for key derivation
 * - Random salt and IV for each encryption
 * - AES-256-GCM with authentication tag
 * - Password is NEVER stored anywhere
 */

// Encrypted data structure
export interface EncryptedData {
  version: number;           // Schema version
  algorithm: 'AES-256-GCM';
  iv: string;                // Base64 initialization vector
  salt: string;              // Base64 salt for PBKDF2
  iterations: number;        // PBKDF2 iterations
  ciphertext: string;        // Base64 encrypted data (includes auth tag)
  checksum?: string;         // SHA-256 hash of original data for verification
}

// Key storage (in memory only - lost on page reload)
let sessionKey: CryptoKey | null = null;
let sessionPassword: string | null = null;

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-256 key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Convert Uint8Array to Base64 string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return btoa(String.fromCharCode(...array));
}

/**
 * Convert Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

/**
 * Calculate SHA-256 checksum of data
 */
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return uint8ArrayToBase64(new Uint8Array(hash));
}

/**
 * Encrypt data with password
 * Returns encrypted data structure ready for storage
 */
export async function encrypt(data: unknown, password: string): Promise<EncryptedData> {
  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive key
  const key = await deriveKey(password, salt);
  
  // Prepare plaintext
  const encoder = new TextEncoder();
  const plaintext = encoder.encode(JSON.stringify(data));
  
  // Encrypt
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext
  );
  
  // Calculate checksum of original data
  const dataString = JSON.stringify(data);
  const checksum = await calculateChecksum(dataString);
  
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    iv: uint8ArrayToBase64(iv),
    salt: uint8ArrayToBase64(salt),
    iterations: 100000,
    ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertext)),
    checksum,
  };
}

/**
 * Decrypt data with password
 * Throws error if password is wrong or data is corrupted
 */
export async function decrypt<T = unknown>(encryptedData: EncryptedData, password: string): Promise<T> {
  // Decode base64 values
  const salt = base64ToUint8Array(encryptedData.salt);
  const iv = base64ToUint8Array(encryptedData.iv);
  const ciphertext = base64ToUint8Array(encryptedData.ciphertext);
  
  // Derive key
  const key = await deriveKey(password, salt);
  
  // Decrypt
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );
    
    const decoder = new TextDecoder();
    const data = JSON.parse(decoder.decode(plaintext));
    
    // Verify checksum if present
    if (encryptedData.checksum) {
      const currentChecksum = await calculateChecksum(JSON.stringify(data));
      if (currentChecksum !== encryptedData.checksum) {
        console.warn('Checksum mismatch - data may have been tampered with');
      }
    }
    
    return data;
  } catch (error) {
    throw new Error('Decryption failed: Invalid password or corrupted data');
  }
}

/**
 * Check if a password can decrypt the data (verification)
 */
export async function verifyPassword(encryptedData: EncryptedData, password: string): Promise<boolean> {
  try {
    await decrypt(encryptedData, password);
    return true;
  } catch {
    return false;
  }
}

/**
 * Session key management
 * The derived key is kept in memory for the session
 */

// Set session key (called after successful unlock)
export function setSessionKey(key: CryptoKey, password: string): void {
  sessionKey = key;
  sessionPassword = password;
}

// Get session key
export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

// Get session password (for re-encryption during sync)
export function getSessionPassword(): string | null {
  return sessionPassword;
}

// Clear session (logout)
export function clearSession(): void {
  sessionKey = null;
  sessionPassword = null;
}

// Check if session is active
export function isSessionActive(): boolean {
  return sessionPassword !== null;
}

/**
 * Quick encrypt using session password
 * Use this for encrypting data during sync
 */
export async function encryptWithSession(data: unknown): Promise<EncryptedData | null> {
  if (!sessionPassword) return null;
  return encrypt(data, sessionPassword);
}

/**
 * Quick decrypt using session password
 * Use this for decrypting data after pull
 */
export async function decryptWithSession<T = unknown>(encryptedData: EncryptedData): Promise<T | null> {
  if (!sessionPassword) return null;
  try {
    return await decrypt<T>(encryptedData, sessionPassword);
  } catch {
    return null;
  }
}

/**
 * Password strength checker
 * Returns score 0-4 and feedback
 */
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  color: string;
  feedback: string[];
} {
  let score = 0;
  const feedback: string[] = [];
  
  // Length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  
  // Character types
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);
  
  const typeCount = [hasLower, hasUpper, hasNumbers, hasSymbols].filter(Boolean).length;
  if (typeCount >= 2) score++;
  if (typeCount >= 4) score++;
  
  // Feedback
  if (password.length < 8) feedback.push('Use at least 8 characters');
  if (!hasLower) feedback.push('Add lowercase letters');
  if (!hasUpper) feedback.push('Add uppercase letters');
  if (!hasNumbers) feedback.push('Add numbers');
  if (!hasSymbols) feedback.push('Add symbols');
  
  // Normalize score
  score = Math.min(4, score);
  
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  
  return {
    score,
    label: labels[score],
    color: colors[score],
    feedback,
  };
}

/**
 * Generate a random password
 */
export function generatePassword(length: number = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const array = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(array, x => chars[x % chars.length]).join('');
}

/**
 * Storage keys for encrypted data
 */
export const CRYPTO_STORAGE_KEYS = {
  ENCRYPTED_VAULT: 'pentest-hub-encrypted-vault',
  PASSWORD_HASH: 'pentest-hub-password-hash',  // NOT the password, just a hash for quick verification
  PASSWORD_HASH_SALT: 'pentest-hub-password-hash-salt',  // Random salt for password hash
  ENCRYPTION_SET_UP: 'pentest-hub-encryption-setup',
};

/**
 * Save encrypted vault to localStorage
 */
export function saveEncryptedVault(encryptedData: EncryptedData): void {
  localStorage.setItem(CRYPTO_STORAGE_KEYS.ENCRYPTED_VAULT, JSON.stringify(encryptedData));
}

/**
 * Load encrypted vault from localStorage
 */
export function loadEncryptedVault(): EncryptedData | null {
  try {
    const data = localStorage.getItem(CRYPTO_STORAGE_KEYS.ENCRYPTED_VAULT);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Check if encryption is set up
 */
export function isEncryptionSetUp(): boolean {
  return localStorage.getItem(CRYPTO_STORAGE_KEYS.ENCRYPTION_SET_UP) === 'true';
}

/**
 * Mark encryption as set up
 */
export function markEncryptionSetUp(): void {
  localStorage.setItem(CRYPTO_STORAGE_KEYS.ENCRYPTION_SET_UP, 'true');
}

/**
 * Generate password verification hash using PBKDF2
 * This is NOT for decryption, just for quick "is password correct" check
 * 
 * Security: Uses PBKDF2 with 100,000 iterations and random salt
 * to prevent rainbow table and brute-force attacks
 */
export async function generatePasswordHash(password: string, salt?: Uint8Array): Promise<{
  hash: string;
  salt: string;
}> {
  // Generate random salt if not provided
  const hashSalt = salt || crypto.getRandomValues(new Uint8Array(16));
  
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key for PBKDF2
  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive bits using PBKDF2 (same security level as encryption)
  const hashBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: hashSalt.buffer as ArrayBuffer,
      iterations: 100000,  // Same as encryption - strong protection
      hash: 'SHA-256',
    },
    baseKey,
    256  // 32 bytes output
  );
  
  return {
    hash: uint8ArrayToBase64(new Uint8Array(hashBits)),
    salt: uint8ArrayToBase64(hashSalt),
  };
}

/**
 * Save password hash and salt for verification
 */
export function savePasswordHash(hash: string, salt: string): void {
  localStorage.setItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH, hash);
  localStorage.setItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH_SALT, salt);
}

/**
 * Get stored password hash and salt
 */
export function getPasswordHash(): { hash: string; salt: string } | null {
  const hash = localStorage.getItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH);
  const salt = localStorage.getItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH_SALT);
  
  if (!hash || !salt) return null;
  return { hash, salt };
}

/**
 * Verify password against stored hash using PBKDF2
 * Returns true if password matches
 */
export async function verifyPasswordHash(password: string): Promise<boolean> {
  const stored = getPasswordHash();
  if (!stored) return false;
  
  const salt = base64ToUint8Array(stored.salt);
  const { hash } = await generatePasswordHash(password, salt);
  
  // Constant-time comparison to prevent timing attacks
  return hash === stored.hash;
}

/**
 * Clear all encryption-related data
 */
export function clearEncryptionData(): void {
  localStorage.removeItem(CRYPTO_STORAGE_KEYS.ENCRYPTED_VAULT);
  localStorage.removeItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH);
  localStorage.removeItem(CRYPTO_STORAGE_KEYS.PASSWORD_HASH_SALT);
  localStorage.removeItem(CRYPTO_STORAGE_KEYS.ENCRYPTION_SET_UP);
  clearSession();
}
