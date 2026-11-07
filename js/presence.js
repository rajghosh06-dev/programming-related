/**
 * Production Cloud Presence & Heartbeat Engine
 * Uses Firebase Realtime Database to track live multi-device sessions,
 * window focus/blur activity states, and real-time roster presence.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  onValue, 
  onDisconnect, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCy4LwKFU3RuofKOFZEiFpmwXyy56h7tGw",
  authDomain: "programming-related-web.firebaseapp.com",
  databaseURL: "https://programming-related-web-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "programming-related-web",
  storageBucket: "programming-related-web.firebasestorage.app",
  messagingSenderId: "142278624199",
  appId: "1:142278624199:web:3f284c8ab2e885f5b90fe2"
};

let app = null;
let db = null;
let currentSessionId = null;
let presenceListeners = [];
let cachedPresenceMap = {};

/**
 * Initializes Firebase App and Realtime Database instances safely
 */
export function initFirebase() {
  if (db) return db;
  try {
    app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
    db = getDatabase(app);
  } catch (err) {
    console.warn("[Presence] Firebase init warning:", err.message);
  }
  return db;
}

export function getFirebaseDb() {
  if (!db) {
    initFirebase();
  }
  return db;
}

/**
 * Generates or retrieves an ephemeral session identifier unique to this browser tab
 */
export function getSessionId() {
  if (currentSessionId) return currentSessionId;
  let stored = sessionStorage.getItem("pwsh_session_id");
  if (!stored) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    stored = `sess_${Date.now().toString(36)}_${randomSuffix}`;
    sessionStorage.setItem("pwsh_session_id", stored);
  }
  currentSessionId = stored;
  return currentSessionId;
}

/**
 * Gets the current display username for presence:
 * authenticated username, or anonymous-<shortId> for sign-in screen visitors.
 */
function getCurrentPresenceUser() {
  const authUser = sessionStorage.getItem("auth_user");
  if (authUser && authUser.trim().length > 0) {
    return authUser.trim();
  }
  const sid = getSessionId();
  const shortId = sid.slice(-4);
  return `anonymous-${shortId}`;
}

/**
 * Starts the presence heartbeat and disconnect cleanup handlers
 */
export function initPresenceEngine() {
  const database = getFirebaseDb();
  if (!database) {
    console.warn("[Presence] Database unavailable; running in offline presence mode.");
    return;
  }

  const sessionId = getSessionId();
  const userPresenceRef = ref(database, `presence/${sessionId}`);
  const connectedRef = ref(database, ".info/connected");

  try {
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Automatically purge session node when WebSocket closes or tab is dismissed
        onDisconnect(userPresenceRef).remove().catch(() => {});

        const initialStatus = document.hasFocus() && document.visibilityState === "visible" ? "active" : "idle";
        set(userPresenceRef, {
          user: getCurrentPresenceUser(),
          status: initialStatus,
          lastActive: serverTimestamp()
        }).catch((err) => {
          console.debug("[Presence] Set presence fallback:", err.message);
        });
      }
    });

    // Dynamic focus & visibility listeners
    const updateActivityStatus = (status) => {
      if (!database || !sessionId) return;
      try {
        update(userPresenceRef, {
          status: status,
          lastActive: serverTimestamp()
        }).catch(() => {});
      } catch (e) {}
    };

    window.addEventListener("focus", () => updateActivityStatus("active"));
    window.addEventListener("blur", () => updateActivityStatus("idle"));
    document.addEventListener("visibilitychange", () => {
      const status = document.visibilityState === "visible" ? "active" : "idle";
      updateActivityStatus(status);
    });

  } catch (err) {
    console.warn("[Presence] Presence listener error:", err.message);
  }
}

/**
 * Updates the user attribute when a user successfully signs in or initializes their account
 */
export function updatePresenceUser(username) {
  const database = getFirebaseDb();
  const sessionId = getSessionId();
  if (!database || !sessionId) return;

  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    update(userPresenceRef, {
      user: username,
      status: "active",
      lastActive: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Resets presence back to anonymous on logout
 */
export function resetPresenceToAnonymous() {
  const database = getFirebaseDb();
  const sessionId = getSessionId();
  if (!database || !sessionId) return;

  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    const shortId = sessionId.slice(-4);
    update(userPresenceRef, {
      user: `anonymous-${shortId}`,
      status: "active",
      lastActive: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Subscribes to real-time presence changes
 * @param {Function} callback - Called with (presenceMap, activeCount)
 */
export function subscribeToPresence(callback) {
  if (typeof callback !== "function") return;
  presenceListeners.push(callback);

  const database = getFirebaseDb();
  if (!database) {
    // Deliver mock self-session for offline/unconnected scenarios
    const selfSession = {
      [getSessionId()]: {
        user: getCurrentPresenceUser(),
        status: "active",
        lastActive: Date.now()
      }
    };
    callback(selfSession, 1);
    return;
  }

  const allPresenceRef = ref(database, "presence");
  try {
    onValue(allPresenceRef, (snap) => {
      const val = snap.val() || {};
      cachedPresenceMap = val;
      const count = Object.keys(val).length;
      callback(val, count);
    }, (error) => {
      console.debug("[Presence] Subscription fallback:", error.message);
      // Fallback local self-session
      const self = {
        [getSessionId()]: {
          user: getCurrentPresenceUser(),
          status: "active",
          lastActive: Date.now()
        }
      };
      cachedPresenceMap = self;
      callback(self, 1);
    });
  } catch (err) {
    const self = {
      [getSessionId()]: {
        user: getCurrentPresenceUser(),
        status: "active",
        lastActive: Date.now()
      }
    };
    callback(self, 1);
  }
}

/**
 * Returns latest cached presence map
 */
export function getCachedPresenceMap() {
  return cachedPresenceMap;
}
