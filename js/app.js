import { 
  getRepositoryIndex, 
  getOfflineFallback, 
  loadCachedIndex, 
  getCacheStatus, 
  REPO_CONFIG 
} from './api.js';
import { Terminal } from './terminal.js';
import { 
  initPresenceEngine, 
  subscribeToPresence, 
  unsubscribeFromPresence,
  showPresenceWidget,
  hidePresenceWidget 
} from './presence.js';
import { getAuthorizedWhitelist, isSessionActive } from './auth.js';

export function updatePresenceUI(presenceMap, count) {
  const countText = document.getElementById("presenceCountText");
  const activeSection = document.getElementById("presenceActiveSection");
  const offlineSection = document.getElementById("presenceOfflineSection");

  if (countText) {
    countText.textContent = `${count} Live ${count === 1 ? 'User' : 'Users'}`;
  }

  if (activeSection) {
    let activeHtml = "";
    const activeUserHandles = new Set();
    const sessions = Object.values(presenceMap || {});

    for (const sess of sessions) {
      const u = sess.user || "anonymous";
      const status = sess.status === "active" ? "active" : "idle";
      const statusLabel = status === "idle" ? " (Idle)" : "";

      if (u.startsWith("anonymous-")) {
        activeHtml += `
          <div class="presence-item">
            <span class="presence-status-dot ${status}">[●]</span>
            <span style="color: #888888;">${u} - Sign-in screen${statusLabel}</span>
          </div>`;
      } else {
        activeUserHandles.add(u.toLowerCase());
        activeHtml += `
          <div class="presence-item">
            <span class="presence-status-dot ${status}">[●]</span>
            <span style="color: #cccccc;">${u}${statusLabel}</span>
          </div>`;
      }
    }

    if (!activeHtml) {
      activeHtml = `<div class="presence-item" style="color: #666666;">No active sessions</div>`;
    }
    activeSection.innerHTML = activeHtml;

    if (offlineSection) {
      const whitelist = getAuthorizedWhitelist();
      let offlineHtml = "";
      for (const handle of Object.keys(whitelist)) {
        if (!activeUserHandles.has(handle.toLowerCase())) {
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

export function startPresenceSubscription() {
  showPresenceWidget();
  subscribeToPresence(updatePresenceUI);
}

export function stopPresenceSubscription() {
  hidePresenceWidget();
  unsubscribeFromPresence();
}

window.__startPresenceSubscription = startPresenceSubscription;
window.__stopPresenceSubscription = stopPresenceSubscription;

async function initApp() {
  const elements = {
    output: document.getElementById("outputHistory"),
    input: document.getElementById("cliInput"),
    suggestions: document.getElementById("suggestionBox"),
    actions: document.getElementById("actionBox"),
    viewport: document.getElementById("terminalViewport"),
    window: document.getElementById("terminalWindow"),
    grepWarningBox: document.getElementById("grepWarningBox"),
    statusText: document.getElementById("statusText"),
    statusCount: document.getElementById("statusCount"),
    statusIndicator: document.getElementById("statusIndicator"),
    sessionTimerWidget: document.getElementById("sessionTimerWidget"),
    sessionTimerClock: document.getElementById("sessionTimerClock")
  };

  // Setup presence popover toggle
  const presenceWidget = document.getElementById("livePresenceWidget");
  const presencePopover = document.getElementById("presencePopover");
  if (presenceWidget && presencePopover) {
    presenceWidget.addEventListener("click", (e) => {
      e.stopPropagation();
      presencePopover.classList.toggle("visible");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#presenceWidgetContainer")) {
        presencePopover.classList.remove("visible");
      }
    });
  }

  // Keep terminal clicked to focus input
  elements.viewport.addEventListener("click", (e) => {
    if (!e.target.closest(".action-btn") && 
        !e.target.closest("a") && 
        !e.target.closest(".suggestion-item") &&
        !e.target.closest(".clone-cmd") &&
        !e.target.closest("#presenceWidgetContainer")) {
      elements.input.focus();
      if (window.__pwshTerminal) {
        window.__pwshTerminal.updateCaret();
      }
    }
  });

  // Restore focus whenever returning to window from system dialogs/prompts
  window.addEventListener("focus", () => {
    elements.input.focus();
    if (window.__pwshTerminal) {
      window.__pwshTerminal.updateCaret();
    }
  });

  // Global keyboard shortcuts (Ctrl+L to clear)
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      if (window.__pwshTerminal) {
        if (window.__pwshTerminal.mode === "INPUT") {
          window.__pwshTerminal.clearScreen();
        }
      }
    }
  });

  // Initialize Cloud Presence Heartbeat Engine
  initPresenceEngine();

  // Presence visibility gating: visible ONLY for authenticated users
  if (isSessionActive()) {
    startPresenceSubscription();
  } else {
    stopPresenceSubscription();
  }

  try {
    const cachedEntry = loadCachedIndex();
    const files = await getRepositoryIndex();
    const cacheStatus = getCacheStatus();

    if (elements.statusIndicator) {
      elements.statusIndicator.className = cachedEntry ? "status-indicator cached" : "status-indicator online";
    }

    if (elements.statusCount) {
      elements.statusCount.textContent = `${files.length.toLocaleString()} items`;
    }

    if (elements.statusText) {
      elements.statusText.textContent = `Connected: ${REPO_CONFIG.repo} [${cacheStatus.refetchesUsed}/6 refetches]`;
    }

    const terminalInstance = new Terminal(files, elements);
    window.__pwshTerminal = terminalInstance;
  } catch (error) {
    console.warn("[App] Initial tree fetch failed, switching to fallback:", error);

    if (elements.statusIndicator) {
      elements.statusIndicator.className = "status-indicator offline";
    }

    if (elements.statusText) {
      elements.statusText.textContent = "Offline Fallback Mode";
    }

    const fallbackFiles = getOfflineFallback();
    const terminalInstance = new Terminal(fallbackFiles, elements);
    window.__pwshTerminal = terminalInstance;

    terminalInstance.appendRaw(
      `[!] Warning: ${error.message}\n` +
      `Continuing in offline fallback mode with pre-indexed repository files.\n\n`
    );
  }

  setTimeout(() => {
    elements.input.focus();
  }, 100);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
