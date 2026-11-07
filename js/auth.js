/**
 * CLI Authentication Subsystem & Session Manager
 * Provides SHA-256 password cryptography, 3-hour hard session invalidation,
 * first-time password initialization, and authorized whitelist verification.
 */

import { getFirebaseDb } from './presence.js';
import { ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export const SESSION_TTL_MS = 3 * 60 * 60 * 1000; // 3 Hours (10,800,000 ms)
export const PASSWORD_SALT_PREFIX = "pr-salt-2026:";

/**
 * Default Authorized Whitelist and Roles (Case-Insensitive)
 */
export const DEFAULT_WHITELIST = {
  "karthik10-dev": { role: "USER" },
  "metrinaveen08": { role: "USER" },
  "rajghosh06-dev": { role: "ADMIN" },
  "saieshwar-web": { role: "USER" },
  "saikrishna-dev-oss": { role: "USER" },
  "starcloud-retro": { role: "USER" },
  "rayainwarrior-dev": { role: "USER" }
};

const LOCAL_STORAGE_PWD_KEY = "pwsh_auth_credentials_vault";
const LOCAL_STORAGE_WHITELIST_KEY = "pwsh_auth_whitelist_custom";

/**
 * Computes salted SHA-256 hash using native Web Crypto API
 * @param {string} password 
 * @returns {Promise<string>} Hex-encoded hash
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(PASSWORD_SALT_PREFIX + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Returns merged whitelist map (built-in + locally/remotely customized)
 */
export function getAuthorizedWhitelist() {
  const custom = localStorage.getItem(LOCAL_STORAGE_WHITELIST_KEY);
  let customMap = {};
  if (custom) {
    try {
      customMap = JSON.parse(custom);
    } catch (e) {}
  }
  return { ...DEFAULT_WHITELIST, ...customMap };
}

/**
 * Checks whether a given username is on the authorized whitelist (case-insensitive)
 * @param {string} username 
 * @returns {{ authorized: boolean, canonicalName: string, role: string }}
 */
export function checkUserWhitelist(username) {
  if (!username) return { authorized: false, canonicalName: "", role: "" };
  const lower = username.trim().toLowerCase();
  const whitelist = getAuthorizedWhitelist();

  for (const [key, val] of Object.entries(whitelist)) {
    if (key.toLowerCase() === lower) {
      return {
        authorized: true,
        canonicalName: key,
        role: val.role || "USER"
      };
    }
  }

  return { authorized: false, canonicalName: "", role: "" };
}

/**
 * Retrieves the stored password hash for a user from Firebase RTDB or fallback vault
 * @param {string} username 
 * @returns {Promise<string|null>}
 */
export async function getUserPasswordHash(username) {
  const lower = username.trim().toLowerCase();

  // Try Firebase Realtime Database
  const db = getFirebaseDb();
  if (db) {
    try {
      const authRef = ref(db, `auth/${lower}`);
      const snap = await get(authRef);
      if (snap.exists()) {
        const val = snap.val();
        if (val && val.reset) return null;
        if (typeof val === "string") return val;
        if (val && val.hash) return val.hash;
      }
    } catch (err) {
      console.debug("[Auth] Firebase read fallback to local vault:", err.message);
    }
  }

  // Fallback to local storage vault
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PWD_KEY);
    if (raw) {
      const vault = JSON.parse(raw);
      if (vault[lower]) return vault[lower].hash || vault[lower];
    }
  } catch (e) {}

  return null;
}

/**
 * Stores a user's salted password hash into Firebase RTDB and local backup
 * @param {string} username 
 * @param {string} hash 
 */
export async function setUserPasswordHash(username, hash) {
  const lower = username.trim().toLowerCase();
  const payload = {
    hash: hash,
    updatedAt: Date.now()
  };

  // Write to Firebase Realtime Database
  const db = getFirebaseDb();
  if (db) {
    try {
      const authRef = ref(db, `auth/${lower}`);
      await set(authRef, payload);
    } catch (err) {
      console.debug("[Auth] Firebase write fallback to local storage:", err.message);
    }
  }

  // Backup to localStorage vault
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PWD_KEY);
    const vault = raw ? JSON.parse(raw) : {};
    vault[lower] = payload;
    localStorage.setItem(LOCAL_STORAGE_PWD_KEY, JSON.stringify(vault));
  } catch (e) {}
}

/**
 * Deletes a stored password hash (for /reset-user-pwd)
 * @param {string} username 
 */
export async function deleteUserPasswordHash(username) {
  const lower = username.trim().toLowerCase();

  const db = getFirebaseDb();
  if (db) {
    try {
      const authRef = ref(db, `auth/${lower}`);
      await remove(authRef).catch(async () => {
        await set(authRef, { reset: true, updatedAt: Date.now() });
      });
    } catch (err) {}
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PWD_KEY);
    if (raw) {
      const vault = JSON.parse(raw);
      delete vault[lower];
      localStorage.setItem(LOCAL_STORAGE_PWD_KEY, JSON.stringify(vault));
    }
  } catch (e) {}
}

/**
 * Adds a new user to the authorized list (Admin tool)
 */
export function addAuthorizedUser(username, role = "USER") {
  const lower = username.trim().toLowerCase();
  const custom = localStorage.getItem(LOCAL_STORAGE_WHITELIST_KEY);
  const customMap = custom ? JSON.parse(custom) : {};
  customMap[lower] = { role };
  localStorage.setItem(LOCAL_STORAGE_WHITELIST_KEY, JSON.stringify(customMap));
}

/**
 * Removes a user from the authorized list (Admin tool)
 */
export async function removeAuthorizedUser(username) {
  const lower = username.trim().toLowerCase();
  const custom = localStorage.getItem(LOCAL_STORAGE_WHITELIST_KEY);
  if (custom) {
    const customMap = JSON.parse(custom);
    delete customMap[lower];
    localStorage.setItem(LOCAL_STORAGE_WHITELIST_KEY, JSON.stringify(customMap));
  }
  await deleteUserPasswordHash(username);
}

/**
 * Session Lifecycle Management via sessionStorage
 */

export function saveSession(user, role) {
  sessionStorage.setItem("auth_user", user);
  sessionStorage.setItem("auth_role", role);
  sessionStorage.setItem("auth_login_time", Date.now().toString());
}

export function clearSession() {
  sessionStorage.removeItem("auth_user");
  sessionStorage.removeItem("auth_role");
  sessionStorage.removeItem("auth_login_time");
}

export function getCurrentSession() {
  const user = sessionStorage.getItem("auth_user");
  const role = sessionStorage.getItem("auth_role");
  const loginTimeStr = sessionStorage.getItem("auth_login_time");

  if (!user || !loginTimeStr) return null;

  const loginTime = parseInt(loginTimeStr, 10);
  if (isNaN(loginTime)) {
    clearSession();
    return null;
  }

  const elapsed = Date.now() - loginTime;
  if (elapsed >= SESSION_TTL_MS) {
    clearSession();
    return null;
  }

  return {
    user,
    role: role || "USER",
    loginTime,
    remainingMs: SESSION_TTL_MS - elapsed
  };
}

export function isSessionActive() {
  return getCurrentSession() !== null;
}
