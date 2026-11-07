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

let isWindowFocused = typeof document !== "undefined" && typeof document.hasFocus === "function" ? document.hasFocus() : true;
let isInactive = false;
let inactivityTimer = null;
let presenceHeartbeatInterval = null;

/**
 * Resets 90-second inactivity timer and handles active/idle transition
 */
function resetInactivityTimer(onStatusChange) {
  if (isInactive) {
    isInactive = false;
    if (typeof onStatusChange === "function") {
      onStatusChange();
    }
  }
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }
  inactivityTimer = setTimeout(() => {
    isInactive = true;
    if (typeof onStatusChange === "function") {
      onStatusChange();
    }
  }, 90000); // 90 seconds
}

/**
 * Evaluates the current presence status based on window focus, visibility, and user activity
 */
export function getEvaluatedStatus() {
  const isHidden = typeof document !== "undefined" && document.hidden;
  if (isHidden) return "idle";
  return (isWindowFocused && !isInactive) ? "active" : "idle";
}

/**
 * Explicitly updates the local session presence status in Firebase RTDB
 */
export function updatePresenceStatus(status) {
  if (status === "active") {
    isWindowFocused = true;
    isInactive = false;
  } else if (status === "idle") {
    isWindowFocused = false;
  }
  const database = getFirebaseDb();
  const sessionId = getSessionId();
  if (!database || !sessionId) return;
  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    update(userPresenceRef, {
      status: status || getEvaluatedStatus(),
      lastActive: serverTimestamp()
    }).catch(() => {});
  } catch (e) {}
}

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
 * Generates and strictly validates an authentic Windows device identifier: DESKTOP-XXXXXXX
 * Purges invalid formats or test tokens (WIN1, WIN2, K1, K2, SAIKRISHNA, MOCK)
 * and strictly enforces /^DESKTOP-[A-Z0-9]{7}$/.
 */
export function getDeviceId() {
  const current = localStorage.getItem("pwsh_terminal_device_id");
  const testTokens = ["WIN1", "WIN2", "K1", "K2", "SAIKRISHNA", "MOCK"];
  const hasTestToken = current && testTokens.some(token => current.includes(token));
  const isValidFormat = current && /^DESKTOP-[A-Z0-9]{7}$/.test(current);

  if (!current || hasTestToken || !isValidFormat) {
    localStorage.removeItem("pwsh_terminal_device_id");
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 7; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const deviceId = `DESKTOP-${code}`;
    localStorage.setItem("pwsh_terminal_device_id", deviceId);
    return deviceId;
  }
  return current;
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

        const initialStatus = getEvaluatedStatus();
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
      updatePresenceStatus(status);
    };

    // User activity listeners to reset 90-second inactivity timer
    const onUserActivity = () => {
      resetInactivityTimer(() => updateActivityStatus(getEvaluatedStatus()));
    };

    resetInactivityTimer(() => updateActivityStatus(getEvaluatedStatus()));

    ["mousemove", "keydown", "click", "scroll"].forEach((evt) => {
      window.addEventListener(evt, onUserActivity, { passive: true });
    });

    window.addEventListener("focus", () => {
      isWindowFocused = true;
      updateActivityStatus("active");
    });

    window.addEventListener("blur", () => {
      isWindowFocused = false;
      updateActivityStatus("idle");
    });

    document.addEventListener("visibilitychange", () => {
      const isHidden = document.hidden;
      const status = isHidden ? "idle" : (document.hasFocus() ? "active" : "idle");
      if (!isHidden && document.hasFocus()) {
        isWindowFocused = true;
      } else if (isHidden) {
        isWindowFocused = false;
      }
      updateActivityStatus(status);
    });

    // Heartbeat Guard: periodic presence heartbeat interval (never write hardcoded "active")
    if (presenceHeartbeatInterval) {
      clearInterval(presenceHeartbeatInterval);
    }
    presenceHeartbeatInterval = setInterval(() => {
      if (!database || !sessionId) return;
      const currentEvaluated = (isWindowFocused && !isInactive && !document.hidden) ? "active" : "idle";
      try {
        update(userPresenceRef, {
          status: currentEvaluated,
          lastActive: serverTimestamp()
        }).catch(() => {});
      } catch (e) {}
    }, 30000);

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

  const currentStatus = getEvaluatedStatus();

  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    update(userPresenceRef, {
      user: username,
      status: currentStatus,
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

  const currentStatus = getEvaluatedStatus();

  try {
    const userPresenceRef = ref(database, `presence/${sessionId}`);
    const shortId = sessionId.slice(-4);
    update(userPresenceRef, {
      user: `anonymous-${shortId}`,
      status: currentStatus,
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

/**
 * Terminates all sessions belonging to a specific user (Admin capability)
 * @param {string} userKey
 */
export async function terminateAllSessionsForUser(userKey) {
  if (!userKey) return;
  const lower = userKey.trim().toLowerCase();
  const presenceMap = cachedPresenceMap || {};
  const terminatePromises = [];
  const targetSessionIds = new Set();

  for (const [sid, sess] of Object.entries(presenceMap)) {
    if (sess && sess.user && sess.user.toLowerCase() === lower && !sess.terminated) {
      targetSessionIds.add(sid);
      terminatePromises.push(terminateSession(sid));
    }
  }

  // Also query Firebase RTDB presence directly to ensure full coverage
  const database = getFirebaseDb();
  if (database) {
    try {
      const snap = await get(ref(database, "presence"));
      if (snap.exists()) {
        const data = snap.val() || {};
        for (const [sid, sess] of Object.entries(data)) {
          if (sess && sess.user && sess.user.toLowerCase() === lower && !sess.terminated && !targetSessionIds.has(sid)) {
            targetSessionIds.add(sid);
            terminatePromises.push(terminateSession(sid));
          }
        }
      }
    } catch (e) {}
  }

  await Promise.all(terminatePromises);
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
        const isTargetViewer = userKey === currentUser.toLowerCase();
        const isAdmin = currentRole === "ADMIN" || currentUser.toLowerCase() === "rajghosh06-dev";

        // Parent Summary Dot:
        // If ALL sessions of a user are idle: Parent dot is Yellow.
        // If AT LEAST ONE session of a user is active: Parent dot is Green.
        const hasActiveSession = group.sessions.some(s => s.status === "active");
        const overallStatus = hasActiveSession ? "active" : "idle";
        const statusLabel = overallStatus === "idle" ? " (Idle)" : "";

        if (group.isAnonymous) {
          const sess = group.sessions[0];
          const isThisSession = sess && sess.sessionId === currentSessionId;
          const canEnd = isAdmin && !isThisSession;
          activeHtml += `
            <div class="presence-user-group">
              <div class="presence-user-row presence-item">
                <span class="presence-toggle-slot"><span class="presence-toggle-spacer"></span></span>
                <span class="presence-status-dot status-dot ${overallStatus}">[●]</span>
                <span class="presence-user-name" style="color: #888888;">${group.displayUser} - Sign-in screen${statusLabel}</span>
                ${canEnd ? `<button class="end-session-btn" data-session-id="${sess.sessionId}" title="Terminate visitor session remotely">[End Session]</button>` : ''}
              </div>
            </div>`;
        } else if (sessCount === 1) {
          // Exactly 1 session:
          const sess = group.sessions[0];
          const isThisSession = sess && sess.sessionId === currentSessionId;
          const deviceLabel = sess ? (sess.device || (sess.sessionId ? sess.sessionId.slice(-8) : "Session")) : "";
          const sessStatus = sess ? (sess.status === "active" ? "active" : "idle") : overallStatus;
          const sessDot = `<span class="presence-status-dot status-dot ${sessStatus}">[●]</span>`;

          if (isThisSession) {
            activeHtml += `
              <div class="presence-user-group">
                <div class="presence-user-row presence-item">
                  <span class="presence-toggle-slot"><span class="presence-toggle-spacer"></span></span>
                  ${sessDot}
                  <span class="presence-user-name">${group.displayUser}</span>
                  <span class="presence-device-tag">${deviceLabel}</span>
                  <span class="session-current-badge">${sessStatus === "active" ? "(this session)" : "(this session, Idle)"}</span>
                </div>
              </div>`;
          } else if (isAdmin) {
            // Admin viewing single-session peer:
            // Render [●] <user>  <device> followed directly by [End Session]
            const idleTag = sessStatus === "idle" ? `<span class="session-status-tag idle" style="color: #e5c07b; font-size: 10px; margin-left: 2px;">(Idle)</span>` : "";
            activeHtml += `
              <div class="presence-user-group">
                <div class="presence-user-row presence-item">
                  <span class="presence-toggle-slot"><span class="presence-toggle-spacer"></span></span>
                  ${sessDot}
                  <span class="presence-user-name">${group.displayUser}</span>
                  <span class="presence-device-tag">${deviceLabel}</span>
                  ${idleTag}
                  <button class="end-session-btn" data-session-id="${sess.sessionId}" title="Terminate session remotely">[End Session]</button>
                </div>
              </div>`;
          } else {
            // Regular user viewing peer:
            activeHtml += `
              <div class="presence-user-group">
                <div class="presence-user-row presence-item">
                  <span class="presence-toggle-slot"><span class="presence-toggle-spacer"></span></span>
                  ${sessDot}
                  <span class="presence-user-name">${group.displayUser}</span>${statusLabel}
                </div>
              </div>`;
          }
        } else {
          // Multi-Session Users (sessCount > 1):
          // Parent header: [▼] [●] <user> (N)
          // If viewer is ADMIN (and target is not viewer):
          // Include an [End All] button on the parent row next to the count.
          const canEndAll = isAdmin && !isTargetViewer;
          const endAllBtnHtml = canEndAll 
            ? `<button class="end-all-btn" data-user="${userKey}" title="Terminate all sessions for ${group.displayUser}">[End All]</button>` 
            : "";

          let subItemsHtml = "";
          for (const sess of group.sessions) {
            const isThisSession = sess.sessionId === currentSessionId;
            const deviceLabel = sess.device || (sess.sessionId ? sess.sessionId.slice(-8) : "Session");
            const sessStatus = sess.status === "active" ? "active" : "idle";
            const sessDot = `<span class="presence-status-dot status-dot ${sessStatus}">[●]</span>`;

            if (isThisSession) {
              subItemsHtml += `
                <div class="presence-subsession-row presence-sub-item">
                  ${sessDot}
                  <span class="session-device">${deviceLabel}</span>
                  <span class="session-current-badge">${sessStatus === "active" ? "(this session)" : "(this session, Idle)"}</span>
                </div>`;
            } else {
              const canEnd = isAdmin || (isTargetViewer && !isThisSession);
              const statusTag = sessStatus === "active"
                ? `<span class="session-status-tag active" style="color: #16c60c; font-size: 10px;">(Active)</span>`
                : `<span class="session-status-tag idle" style="color: #e5c07b; font-size: 10px;">(Idle)</span>`;

              subItemsHtml += `
                <div class="presence-subsession-row presence-sub-item">
                  ${sessDot}
                  <span class="session-device">${deviceLabel}</span>
                  ${statusTag}
                  ${canEnd ? `<button class="end-session-btn" data-session-id="${sess.sessionId}" title="Terminate session remotely">[End Session]</button>` : ''}
                </div>`;
            }
          }

          activeHtml += `
            <div class="presence-user-group">
              <div class="presence-user-row presence-item">
                <span class="presence-toggle-slot"><span class="presence-toggle-btn" data-user="${userKey}" role="button" tabindex="0">${isExpanded ? '[▲]' : '[▼]'}</span></span>
                <span class="presence-status-dot status-dot ${overallStatus}">[●]</span>
                <span class="presence-user-name">${group.displayUser}</span>
                <span class="presence-session-count" style="color: #888888; font-size: 11px;">(${sessCount})</span>${statusLabel}
                ${endAllBtnHtml}
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
            <div class="presence-offline-row presence-item">
              <span class="presence-toggle-slot"><span class="presence-toggle-spacer"></span></span>
              <span class="presence-status-dot status-dot offline">[○]</span>
              <span class="presence-user-name" style="color: #777777;">${handle} - Offline</span>
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

      const endAllBtn = e.target.closest(".end-all-btn");
      if (endAllBtn) {
        e.stopPropagation();
        const targetUser = endAllBtn.getAttribute("data-user");
        if (targetUser) {
          endAllBtn.disabled = true;
          endAllBtn.textContent = "[Ending All...]";
          await terminateAllSessionsForUser(targetUser);
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
