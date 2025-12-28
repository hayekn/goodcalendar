/**
 * Derives encryption key from password + uid
 * @param {string} password - User's password
 * @param {string} uid - User's Firebase UID
 * @returns {Promise<CryptoKey>} Encryption key
 */
async function deriveKeyFromPassword(password, uid) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(uid),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Derives encryption key from security answer + uid
 * Normalizes answer (lowercase, trim) for consistency
 * @param {string} answer - Security question answer
 * @param {string} uid - User's Firebase UID
 * @returns {Promise<CryptoKey>} Encryption key
 */
async function deriveKeyFromSecurityAnswer(answer, uid) {
  const enc = new TextEncoder();
  const normalized = answer.toLowerCase().trim();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(normalized),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(uid + '-recovery'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generates a random master key for encrypting user data
 * @returns {Promise<CryptoKey>} Random master key
 */
async function generateMasterKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable (so we can wrap/unwrap it)
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports master key as base64 string
 * @param {CryptoKey} masterKey - Master key to export
 * @returns {Promise<string>} Base64-encoded key
 */
async function exportMasterKey(masterKey) {
  const keyData = await crypto.subtle.exportKey('raw', masterKey);
  return btoa(String.fromCharCode(...new Uint8Array(keyData)));
}

/**
 * Imports master key from base64 string
 * @param {string} base64Key - Base64-encoded key
 * @returns {Promise<CryptoKey>} Imported master key
 */
async function importMasterKey(base64Key) {
  const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts data using AES-GCM
 * @param {string} plaintext - Data to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Encrypted data (base64)
 */
async function encrypt(plaintext, key) {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM standard iv size
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  
  // iv and ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  // return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data using AES-GCM
 * @param {string} encryptedData - Base64 encrypted data
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<string>} Decrypted plaintext
 */
async function decrypt(encryptedData, key) {
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  
  const dec = new TextDecoder();
  return dec.decode(plaintext);
}

/**
 * Wraps the master key with a KEK
 * @param {CryptoKey} masterKey - Master key to wrap
 * @param {CryptoKey} kek - Key encryption key
 * @returns {Promise<string>} Encrypted master key (base64)
 */
async function wrapMasterKey(masterKey, kek) {
  const masterKeyBase64 = await exportMasterKey(masterKey);
  return encrypt(masterKeyBase64, kek);
}

/**
 * Unwraps the master key with a KEK
 * @param {string} wrappedKey - Encrypted master key
 * @param {CryptoKey} kek - Key encryption key
 * @returns {Promise<CryptoKey>} Decrypted master key
 */
async function unwrapMasterKey(wrappedKey, kek) {
  try {
    const masterKeyBase64 = await decrypt(wrappedKey, kek);
    return importMasterKey(masterKeyBase64);
  } catch (e) {
    throw new Error("DECRYPT_FAILED");
  }
}

/**
 * Encrypts specified fields in an object
 * @param {Object} obj - Object to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Object with encrypted fields
 */
async function encryptObject(obj, fields, key) {
  const result = { ...obj };
  for (const field of fields) {
    if (obj[field] != null) {
      result[field] = await encrypt(String(obj[field]), key);
    }
  }
  
  return result;
}

/**
 * Decrypts specified fields in an object
 * @param {Object} obj - Object with encrypted fields
 * @param {string[]} fields - Array of field names to decrypt
 * @param {CryptoKey} key - Encryption key
 * @returns {Promise<Object>} Object with decrypted fields
 */
async function decryptObject(obj, fields, key) {
  const result = { ...obj };
  
  for (const field of fields) {
    if (obj[field]) {
      try {
        result[field] = await decrypt(obj[field], key);
      } catch (e) {
        console.error(`Failed to decrypt field ${field}:`, e);
        result[field] = null;
      }
    }
  }
  
  return result;
}

export { 
  deriveKeyFromPassword,
  deriveKeyFromSecurityAnswer,
  generateMasterKey,
  exportMasterKey,
  importMasterKey,
  wrapMasterKey,
  unwrapMasterKey,
  encrypt, 
  decrypt, 
  encryptObject, 
  decryptObject
};