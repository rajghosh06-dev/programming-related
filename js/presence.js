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
import { getAuthorizedWhitelist } from './auth.js';

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
let terminationUnsubscribe = null;
let popoverEventsInitialized = false;
const expandedUsers = new Set();

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
 * Generates an authentic Windows device identifier: DESKTOP-XXXXXXX
 */
export function getDeviceId() {
  let deviceId = localStorage.getItem("pwsh_terminal_device_id");
  if (!deviceId || !deviceId.startsWith("DESKTOP-")) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    deviceId = `DESKTOP-${code}`;
    localStorage.setItem("pwsh_terminal_device_id", deviceId);
  }
  return deviceId;
}

/**
 * Retrieves the login timestamp of this session
 */
export function getSessionLoginTime() {
  const t = sessionStorage.getItem("auth_login_time");
  return t ? parseInt(t, 10) : Date.now();
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
          sessionId: sessionId,
          device: getDeviceId(),
          loginTime: getSessionLoginTime(),
          terminated: false,
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
      sessionId: sessionId,
      device: getDeviceId(),
      loginTime: getSessionLoginTime(),
      terminated: false,
      lastActive: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}

  setupTerminationListener();
}

/**
 * Resets presence back to anonymous on logout
 */
export function resetPresenceToAnonymous() {
  teardownTerminationListener();
  const database = getFirebaseDb();
  const sessionId = getSessionId();
  if (!database || !sessionId) return;

  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    const shortId = sessionId.slice(-4);
    update(userPresenceRef, {
      user: `anonymous-${shortId}`,
      status: "active",
      sessionId: sessionId,
      device: getDeviceId(),
      loginTime: Date.now(),
      terminated: false,
      lastActive: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Listens to this session's presence record for remote termination
 */
export function setupTerminationListener() {
  teardownTerminationListener();

  const database = getFirebaseDb();
  const sessionId = getSessionId();
  if (!database || !sessionId) return;

  const authUser = sessionStorage.getItem("auth_user");
  if (!authUser) return; // Only listen for authenticated sessions

  let isInitialized = false;
  const userPresenceRef = ref(database, `presence/${sessionId}`);

  try {
    terminationUnsubscribe = onValue(userPresenceRef, (snap) => {
      const val = snap.val();
      if (val !== null) {
        isInitialized = true;
        if (val.terminated === true) {
          handleRemoteTermination();
        }
      } else if (isInitialized) {
        // Node was deleted from Firebase
        handleRemoteTermination();
      }
    }, (err) => {
      console.debug("[Presence] Termination listener error:", err.message);
    });
  } catch (err) {}
}

export function teardownTerminationListener() {
  if (terminationUnsubscribe) {
    try {
      terminationUnsubscribe();
    } catch (e) {}
    terminationUnsubscribe = null;
  }
}

function handleRemoteTermination() {
  teardownTerminationListener();
  unsubscribeFromPresence();
  if (window.__pwshTerminal && typeof window.__pwshTerminal.logout === "function") {
    window.__pwshTerminal.logout("Session ended: This session was terminated remotely.");
  }
}

/**
 * Dispatches remote termination for a target session ID
 * @param {string} targetSessionId
 */
export async function terminateSession(targetSessionId) {
  if (!targetSessionId) return;
  const database = getFirebaseDb();
  if (database) {
    try {
      const targetRef = ref(database, `presence/${targetSessionId}`);
      await update(targetRef, { terminated: true });
      setTimeout(async () => {
        try {
          await remove(targetRef);
        } catch (e) {}
      }, 400);
      return;
    } catch (err) {
      console.warn("[Presence] terminateSession error:", err.message);
    }
  }

  // REST API fallback
  try {
    const url = `https://programming-related-web-default-rtdb.asia-southeast1.firebasedatabase.app/presence/${targetSessionId}.json`;
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ terminated: true })
    });
    setTimeout(async () => {
      try {
        await fetch(url, { method: "DELETE" });
      } catch (e) {}
    }, 400);
  } catch (err) {}
}

let activeUnsubscribe = null;

/**
 * Detaches the real-time presence listener from Firebase
 */
export function unsubscribeFromPresence() {
  if (typeof activeUnsubscribe === "function") {
    try {
      activeUnsubscribe();
    } catch (e) {}
    activeUnsubscribe = null;
  }
  presenceListeners = [];
}

/**
 * Hides the entire live presence widget and popover (unauthenticated view)
 */
export function hidePresenceWidget() {
  const container = document.getElementById("presenceWidgetContainer");
  const widget = document.getElementById("livePresenceWidget");
  const popover = document.getElementById("presencePopover");
  if (container) {
    container.classList.remove("authenticated");
    container.style.setProperty("display", "none", "important");
  }
  if (widget) {
    widget.style.setProperty("display", "none", "important");
  }
  if (popover) {
    popover.classList.remove("visible", "pinned");
    popover.style.setProperty("display", "none", "important");
  }
}

/**
 * Reveals the live presence widget for authenticated users
 */
export function showPresenceWidget() {
  const container = document.getElementById("presenceWidgetContainer");
  const widget = document.getElementById("livePresenceWidget");
  const popover = document.getElementById("presencePopover");
  if (container) {
    container.classList.add("authenticated");
    container.style.removeProperty("display");
    container.style.display = "inline-flex";
  }
  if (widget) {
    widget.style.removeProperty("display");
    widget.style.display = "inline-flex";
  }
  if (popover) {
    popover.style.removeProperty("display");
  }
}

/**
 * Subscribes to real-time presence changes
 * @param {Function} callback - Called with (presenceMap, activeCount)
 */
export function subscribeToPresence(callback) {
  if (typeof callback !== "function") return;
  if (activeUnsubscribe) {
    unsubscribeFromPresence();
  }
  presenceListeners.push(callback);

  const database = getFirebaseDb();
  if (!database) {
    const selfSession = {
      [getSessionId()]: {
        user: getCurrentPresenceUser(),
        status: "active",
        sessionId: getSessionId(),
        device: getDeviceId(),
        loginTime: getSessionLoginTime(),
        terminated: false,
        lastActive: Date.now()
      }
    };
    cachedPresenceMap = selfSession;
    callback(selfSession, 1);
    return;
  }

  const allPresenceRef = ref(database, "presence");
  try {
    activeUnsubscribe = onValue(allPresenceRef, (snap) => {
      const val = snap.val() || {};
      cachedPresenceMap = val;
      const nonTerminated = Object.values(val).filter(s => s && !s.terminated);
      const count = nonTerminated.length;
      callback(val, count);
    }, (error) => {
      console.debug("[Presence] Subscription fallback:", error.message);
      const self = {
        [getSessionId()]: {
          user: getCurrentPresenceUser(),
          status: "active",
          sessionId: getSessionId(),
          device: getDeviceId(),
          loginTime: getSessionLoginTime(),
          terminated: false,
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
        sessionId: getSessionId(),
        device: getDeviceId(),
        loginTime: getSessionLoginTime(),
        terminated: false,
        lastActive: Date.now()
      }
    };
    cachedPresenceMap = self;
    callback(self, 1);
  }
}

/**
 * Returns latest cached presence map
 */
export function getCachedPresenceMap() {
  return cachedPresenceMap;
}

/**
 * Renders the multi-session grouped presence roster and dropdown UI
 * @param {Object} presenceMap
 * @param {number} totalCount
 */
export function updatePresenceUI(presenceMap, totalCount) {
  const countText = document.getElementById("presenceCountText");
  const activeSection = document.getElementById("presenceActiveSection");
  const offlineSection = document.getElementById("presenceOfflineSection");

  const currentSessionId = getSessionId();
  const currentUser = (sessionStorage.getItem("auth_user") || "").trim();
  const currentRole = (sessionStorage.getItem("auth_role") || "").trim();

  // Filter non-terminated sessions
  const activeSessionsList = Object.entries(presenceMap || {})
    .filter(([sid, s]) => s && !s.terminated)
    .map(([sid, s]) => ({ sessionId: sid, ...s }));

  const activeCount = activeSessionsList.length;

  if (countText) {
    countText.textContent = `${activeCount} Live ${activeCount === 1 ? 'User' : 'Users'}`;
  }

  if (activeSection) {
    // Group active sessions by user (case-insensitive handle)
    const userGroups = new Map();
    const activeHandles = new Set();

    for (const sess of activeSessionsList) {
      const rawUser = sess.user || "anonymous";
      const key = rawUser.toLowerCase();
      activeHandles.add(key);

      if (!userGroups.has(key)) {
        userGroups.set(key, {
          displayUser: rawUser,
          isAnonymous: rawUser.startsWith("anonymous-"),
          sessions: []
        });
      }
      userGroups.get(key).sessions.push(sess);
    }

    if (userGroups.size === 0) {
      activeSection.innerHTML = `<div class="presence-item" style="color: #666666;">No active sessions</div>`;
    } else {
      let activeHtml = "";
      for (const [userKey, group] of userGroups.entries()) {
        const sessCount = group.sessions.length;
        const isExpanded = expandedUsers.has(userKey);
        const overallStatus = group.sessions.some(s => s.status === "active") ? "active" : "idle";
        const statusLabel = overallStatus === "idle" ? " (Idle)" : "";

        if (group.isAnonymous) {
          activeHtml += `
            <div class="presence-user-group">
              <div class="presence-item">
                <span class="presence-toggle placeholder">[&nbsp;&nbsp;&nbsp;]</span>
                <span class="presence-status-dot ${overallStatus}">[●]</span>
                <span style="color: #888888;">${group.displayUser} - Sign-in screen${statusLabel}</span>
              </div>
            </div>`;
        } else if (sessCount === 1) {
          // Exactly 1 session: [   ] [●] <user>
          activeHtml += `
            <div class="presence-user-group">
              <div class="presence-item">
                <span class="presence-toggle placeholder">[&nbsp;&nbsp;&nbsp;]</span>
                <span class="presence-status-dot ${overallStatus}">[●]</span>
                <span class="presence-user-label" style="color: #cccccc;">${group.displayUser}${statusLabel}</span>
              </div>
            </div>`;
        } else {
          // > 1 sessions: [▼] [●] <user> (N)
          let subItemsHtml = "";
          for (const sess of group.sessions) {
            const isThisSession = sess.sessionId === currentSessionId;
            const deviceLabel = sess.device || (sess.sessionId ? sess.sessionId.slice(-8) : "Session");
            const sessStatus = sess.status === "active" ? "active" : "idle";
            const sessDot = `<span class="presence-status-dot ${sessStatus}">[●]</span>`;

            if (isThisSession) {
              subItemsHtml += `
                <div class="presence-sub-item">
                  ${sessDot}
                  <span class="session-device">${deviceLabel}</span>
                  <span class="session-current-badge">(this session)</span>
                </div>`;
            } else {
              const isAdmin = currentRole === "ADMIN" || currentUser.toLowerCase() === "rajghosh06-dev";
              const isOwn = currentUser.toLowerCase() === userKey;
              const canEnd = isAdmin || isOwn;

              subItemsHtml += `
                <div class="presence-sub-item">
                  ${sessDot}
                  <span class="session-device">${deviceLabel}</span>
                  ${canEnd ? `<button class="end-session-btn" data-session-id="${sess.sessionId}" title="Terminate session remotely">[End Session]</button>` : ''}
                </div>`;
            }
          }

          activeHtml += `
            <div class="presence-user-group">
              <div class="presence-item">
                <span class="presence-toggle-btn" data-user="${userKey}" role="button" tabindex="0">${isExpanded ? '[▲]' : '[▼]'}</span>
                <span class="presence-status-dot ${overallStatus}">[●]</span>
                <span class="presence-user-label" style="color: #cccccc;">${group.displayUser} (${sessCount})${statusLabel}</span>
              </div>
              ${isExpanded ? `<div class="presence-sub-sessions">${subItemsHtml}</div>` : ''}
            </div>`;
        }
      }
      activeSection.innerHTML = activeHtml;
    }

    // Offline section (flat list without session numbers or dropdowns)
    if (offlineSection) {
      const whitelist = getAuthorizedWhitelist();
      let offlineHtml = "";
      for (const handle of Object.keys(whitelist)) {
        if (!activeHandles.has(handle.toLowerCase())) {
          offlineHtml += `
            <div class="presence-item">
              <span class="presence-status-dot offline">[○]</span>
              <span style="color: #777777;">${handle} - Offline</span>
            </div>`;
        }
      }
      offlineSection.innerHTML = offlineHtml || `<div class="presence-item" style="color:#555555;">All authorized users online</div>`;
    }
  }
}

/**
 * Configures click-to-pin, popover preview, close button, Esc, and delegation handlers
 */
export function setupPopoverEvents() {
  if (popoverEventsInitialized) return;
  popoverEventsInitialized = true;

  const widget = document.getElementById("livePresenceWidget");
  const popover = document.getElementById("presencePopover");
  const activeSection = document.getElementById("presenceActiveSection");

  if (!popover || !widget) return;

  // Click on widget toggles pinned state
  widget.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.classList.toggle("pinned");
    if (popover.classList.contains("pinned")) {
      popover.classList.add("visible");
    } else {
      popover.classList.remove("visible");
    }
  });

  // Clicking inside popover pins it, unless close button is clicked
  popover.addEventListener("click", (e) => {
    e.stopPropagation();
    const closeBtn = e.target.closest("#closePresencePopover") || e.target.closest(".popover-close-btn");
    if (closeBtn) {
      popover.classList.remove("pinned", "visible");
      return;
    }
    popover.classList.add("pinned");
  });

  // Event delegation on activeSection for toggle [▼]/[▲] and [End Session] buttons
  if (activeSection) {
    activeSection.addEventListener("click", async (e) => {
      const toggle = e.target.closest(".presence-toggle-btn");
      if (toggle) {
        e.stopPropagation();
        const user = toggle.getAttribute("data-user");
        if (expandedUsers.has(user)) {
          expandedUsers.delete(user);
        } else {
          expandedUsers.add(user);
        }
        updatePresenceUI(cachedPresenceMap, Object.keys(cachedPresenceMap).length);
        return;
      }

      const endBtn = e.target.closest(".end-session-btn");
      if (endBtn) {
        e.stopPropagation();
        const sid = endBtn.getAttribute("data-session-id");
        if (sid) {
          endBtn.disabled = true;
          endBtn.textContent = "[Ending...]";
          await terminateSession(sid);
        }
        return;
      }
    });
  }

  // Click outside unpins and closes popover
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#presenceWidgetContainer")) {
      popover.classList.remove("pinned", "visible");
    }
  });

  // Esc key unpins and closes popover
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (popover.classList.contains("pinned") || popover.classList.contains("visible")) {
        popover.classList.remove("pinned", "visible");
      }
    }
  });
}
