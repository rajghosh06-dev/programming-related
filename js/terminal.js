import { 
  REPO_CONFIG, 
  getCacheStatus, 
  refetchRepositoryIndex 
} from './api.js';
import {
  SESSION_TTL_MS,
  hashPassword,
  getAuthorizedWhitelist,
  checkUserWhitelist,
  getUserPasswordHash,
  setUserPasswordHash,
  deleteUserPasswordHash,
  addAuthorizedUser,
  removeAuthorizedUser,
  saveSession,
  clearSession,
  getCurrentSession,
  isSessionActive,
  handlePasswordInit,
  formatRemainingTime,
  syncSessionTimer,
  clearSessionTimer,
  listenToSessionTimer
} from './auth.js';
import {
  updatePresenceUser,
  resetPresenceToAnonymous,
  getCachedPresenceMap,
  setupTerminationListener,
  teardownTerminationListener,
  terminateSession,
  terminateAllSessionsForUser,
  getDeviceId,
  markActive
} from './presence.js';

/**
 * Pinned authoring build version extracted from DistanceVector.pkt in TEST-CISCO
 */
export const COMPATIBLE_PKT_VERSION = "9.0.1.0858";
export const COMPATIBLE_PKT_VERSION_PREFIX = "9.0.1";

/**
 * Generates an authentic Windows setup device identifier:
 * Format: "DESKTOP-" followed by 7 random uppercase alphanumeric characters (e.g., "DESKTOP-7K4M9J2").
 */
export function generateDesktopId() {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `DESKTOP-${code}`;
}

/**
 * Validates and retrieves an authentic Windows device identifier.
 * Purges invalid formats or test tokens (WIN1, WIN2, K1, K2, SAIKRISHNA, MOCK)
 * and strictly enforces /^DESKTOP-[A-Z0-9]{7}$/.
 * @returns {string} Validated deviceId
 */
export function getOrCreateDeviceId() {
  const current = localStorage.getItem("pwsh_terminal_device_id");
  const testTokens = ["WIN1", "WIN2", "K1", "K2", "SAIKRISHNA", "MOCK"];
  const hasTestToken = current && testTokens.some(token => current.includes(token));
  const isValidFormat = current && /^DESKTOP-[A-Z0-9]{7}$/.test(current);

  if (!current || hasTestToken || !isValidFormat) {
    localStorage.removeItem("pwsh_terminal_device_id");
    const deviceId = generateDesktopId();
    localStorage.setItem("pwsh_terminal_device_id", deviceId);
    return deviceId;
  }
  return current;
}

export class Terminal {
  constructor(apiFiles, elements) {
    // Normalize both files (blobs) and directories (trees)
    this.rawItems = Array.isArray(apiFiles) ? apiFiles : [];
    this.items = this.rawItems.map(item => {
      if (typeof item === 'string') {
        return { path: item, type: 'blob', size: 0, mode: '100644' };
      }
      return item;
    });

    // Lookup map
    this.fileMap = new Map();
    this.items.forEach(i => this.fileMap.set(i.path, i));

    // DOM Elements
    this.output = elements.output;
    this.input = elements.input;
    this.suggestions = elements.suggestions;
    this.actions = elements.actions;
    this.viewport = elements.viewport;
    this.window = elements.window || document.getElementById('terminalWindow');
    this.grepWarningBox = elements.grepWarningBox || document.getElementById('grepWarningBox');
    this.promptTextElement = document.getElementById('promptText') || document.querySelector('.prompt-text');
    this.statusText = elements.statusText || document.getElementById('statusText');
    this.statusCount = elements.statusCount || document.getElementById('statusCount');
    this.statusIndicator = elements.statusIndicator || document.getElementById('statusIndicator');
    this.caretElement = document.getElementById('customCaret');
    this.caretMirror = document.getElementById('caretMirror');

    // Terminal State & Authentication
    this.filteredResults = [];
    this.selectedIndex = 0;
    this.activeItem = null;
    this.selectedItem = null;
    this.currentQuery = "";
    this.actionMode = null; // null | "ITEM" | "SERVE_OS"
    this.grepActive = false;
    this.commandHistory = [];
    this.history = this.commandHistory;
    this.historyIndex = -1;

    // Virtual File System (VFS) State
    this.cwd = "";
    this.indexer = { files: this.items };

    // Authentication Subsystem
    this.isMaskedInput = false;
    this.rawPasswordBuffer = "";
    this.authMode = "USERNAME";
    this.pendingAuthUser = null;
    this.pendingUsername = "";
    this.pendingAuthRole = null;
    this.tempInitPassword = null;
    this.sessionTimer = null;
    this.isInputDisabled = false;

    this.sessionTimerWidget = elements.sessionTimerWidget || document.getElementById('sessionTimerWidget');
    this.sessionTimerClock = elements.sessionTimerClock || document.getElementById('sessionTimerClock');
    this.sessionCountdownInterval = null;

    const activeSession = getCurrentSession();
    if (activeSession) {
      this.currentUser = activeSession.user;
      this.currentRole = activeSession.role;
      this.mode = "INPUT";
      this.authState = null;
      this.initPromptConfig();
      this.initBootBanner();
      this.scheduleSessionExpiration(activeSession.remainingMs);
      this.startSessionCountdown();
      setupTerminationListener();
      if (window.__startPresenceSubscription) {
        window.__startPresenceSubscription();
      }
    } else {
      this.currentUser = null;
      this.currentRole = null;
      this.mode = "AUTH";
      this.authState = "AUTH_USERNAME";
      this.initPromptConfig();
      this.initAuthGate();
      this.stopSessionCountdown();
      teardownTerminationListener();
      if (window.__stopPresenceSubscription) {
        window.__stopPresenceSubscription();
      }
    }

    this.bindEvents();
    this.updateStatus();
    this.updatePromptDisplay();
    this.updateCaret();
  }

  get history() {
    return this.commandHistory;
  }

  set history(val) {
    this.commandHistory = val;
  }

  get passwordBuffer() {
    return this.rawPasswordBuffer;
  }

  set passwordBuffer(val) {
    this.rawPasswordBuffer = val;
  }

  get pendingUsername() {
    return this.pendingAuthUser;
  }

  set pendingUsername(val) {
    this.pendingAuthUser = val;
  }

  renderPrompt(text) {
    if (this.promptTextElement) {
      this.promptTextElement.textContent = text;
    }
  }

  handleCtrlC() {
    if (this.mode === "AUTH") {
      const currentInput = this.isMaskedInput ? "*".repeat(this.rawPasswordBuffer.length) : (this.input ? this.input.value : "");
      const prefix = this.getPromptPrefix();
      this.appendRaw(`${prefix}${currentInput}^C\n\n`);

      this.authMode = "USERNAME";
      this.authState = "AUTH_USERNAME";
      this.pendingUsername = "";
      this.pendingAuthUser = null;
      this.pendingAuthRole = null;
      this.passwordBuffer = "";
      this.rawPasswordBuffer = "";
      this.tempInitPassword = null;
      this.isMaskedInput = false;
      if (this.input) {
        this.input.value = "";
      }
      this.renderPrompt("Enter Username: ");
      this.updateCaret();
      this.scrollBottom();
      if (this.input) {
        this.input.focus();
      }
      return;
    }

    // Standard Interactive CLI Mode (INPUT / ACTION / GREP)
    if (this.actions) {
      this.actions.style.display = "none";
      this.actions.innerHTML = "";
    }
    this.hideSuggestions();
    this.hideGrepWarning();
    this.mode = "INPUT";
    this.actionMode = null;
    this.activeItem = null;

    const prefix = this.getPromptPrefix();
    const currentCmd = this.input ? this.input.value : "";
    this.appendRaw(`${prefix}${currentCmd}^C\n`);
    if (this.input) {
      this.input.value = "";
    }
    this.historyIndex = this.history.length;
    this.updatePromptDisplay();
    this.updateCaret();
    this.scrollBottom();
    if (this.input) {
      this.input.focus();
    }
  }

  printLine(text) {
    this.appendRaw(`${text}\n`);
    this.scrollBottom();
  }

  printSuccess(text) {
    this.resetPrompt(text);
  }

  printError(text) {
    this.appendRaw(`${text}\n`);
    this.scrollBottom();
  }

  async downloadFile(path, filename) {
    const fname = filename || (path ? path.split("/").pop() : "file");
    this.printLine(`[*] Downloading ${fname}...`);
    const rawUrl = `https://raw.githubusercontent.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/${REPO_CONFIG.branch}/${path}`;
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      this.printSuccess(`[OK] Download complete: ${fname}`);
    } catch (err) {
      this.printError(`[ERR] Failed to download file: ${err.message}`);
      // Fallback: window.open as last resort
      window.open(rawUrl, "_blank");
      this.resetPrompt(`Opened download URL in new tab: ${fname}`);
    }
  }

  /**
   * Initializes prompt drive and username/device-id from localStorage
   * Preserves authentic DESKTOP-XXXXXXX uniform prompt naming across all users
   */
  initPromptConfig() {
    this.drive = localStorage.getItem("pwsh_terminal_drive") || "D";

    const customUser = localStorage.getItem("pwsh_terminal_username");
    if (customUser && customUser.trim().length > 0) {
      this.userOrDevice = customUser.trim();
    } else {
      this.userOrDevice = getOrCreateDeviceId();
    }
    this.deviceId = this.userOrDevice;
  }

  get deviceId() {
    return this.userOrDevice;
  }

  set deviceId(v) {
    this.userOrDevice = v;
  }

  formatPromptPath() {
    const base = `${this.drive}:\\${this.userOrDevice}\\Programming-Related`;
    const cleanCwd = (this.cwd || "").replace(/^[\\\/]+|[\\\/]+$/g, "").replace(/\//g, "\\");
    if (!cleanCwd) {
      return base;
    }
    return `${base}\\${cleanCwd}`;
  }

  getPromptPath() {
    return this.formatPromptPath();
  }

  getPromptPrefix() {
    if (this.mode === "AUTH") {
      if (this.authState === "AUTH_USERNAME") return "Enter Username: ";
      if (this.authState === "AUTH_PASSWORD") return "Password: ";
      if (this.authState === "AUTH_INIT_PWD") return "Initialize Password (min 8 characters): ";
      if (this.authState === "AUTH_CONFIRM_PWD") return "Confirm Password: ";
    }
    return `PS ${this.getPromptPath()}> `;
  }

  updatePromptDisplay() {
    if (this.promptTextElement) {
      this.promptTextElement.textContent = this.getPromptPrefix();
    }
  }

  initAuthGate(alertMessage = null) {
    this.stopSessionCountdown();
    this.cwd = "";
    this.mode = "AUTH";
    this.authMode = "USERNAME";
    this.authState = "AUTH_USERNAME";
    this.isMaskedInput = false;
    this.rawPasswordBuffer = "";
    this.pendingAuthUser = null;
    this.pendingUsername = "";
    this.pendingAuthRole = null;
    this.tempInitPassword = null;

    this.output.textContent = "";
    let html = `PowerShell 7.6.9 - Authentication Subsystem\nRepository: Programming-Related\n\n`;

    const flashNotice = sessionStorage.getItem("auth_init_flash");
    if (flashNotice) {
      sessionStorage.removeItem("auth_init_flash");
      html += `<span style="color: #16c60c;">[OK] Account setup complete. Please sign-in to continue.</span>\n\n`;
    } else if (alertMessage) {
      html += `<span style="color: #e5c07b;">[!] ${alertMessage}</span>\n\n`;
    }

    this.appendHTML(html.replace(/\n/g, "<br>"));
    if (this.promptTextElement) {
      this.promptTextElement.textContent = "Enter Username: ";
    }
    this.input.value = "";
    this.setInputDisabled(false);
    this.hideSuggestions();
    this.hideGrepWarning();
    this.updateCaret();
    this.scrollBottom();
  }

  renderAuthGate(alertMessage = null) {
    return this.initAuthGate(alertMessage);
  }

  setInputDisabled(disabled) {
    this.isInputDisabled = !!disabled;
    if (this.input) {
      this.input.disabled = !!disabled;
      if (disabled) {
        this.input.blur();
      } else {
        this.input.focus();
      }
    }
    if (this.caretElement) {
      this.caretElement.style.display = disabled ? "none" : "";
    }
    this.updateCaret();
  }

  scheduleSessionExpiration(ms) {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
    }
    this.sessionTimer = setTimeout(() => {
      this.logout("Session expired after 3 hours. Please sign in again.");
    }, ms);
  }

  /**
   * Starts live 1-second countdown clock in status bar
   */
  startSessionCountdown() {
    this.stopSessionCountdown();

    const widget = this.sessionTimerWidget || document.getElementById("sessionTimerWidget");
    const clock = this.sessionTimerClock || document.getElementById("sessionTimerClock");

    if (widget) {
      widget.classList.add("authenticated");
      widget.style.display = "inline-flex";
    }

    const updateClock = () => {
      const loginTimeStr = sessionStorage.getItem("auth_login_time");
      const loginTime = loginTimeStr ? parseInt(loginTimeStr, 10) : Date.now();
      const elapsed = Date.now() - loginTime;
      const remainingMs = Math.max(0, SESSION_TTL_MS - elapsed);

      if (clock) {
        clock.textContent = formatRemainingTime(remainingMs);
      }

      if (widget) {
        widget.classList.remove("timer-warning", "timer-critical");
        // Thresholds: Critical <= 5 mins (300,000 ms), Warning <= 15 mins (900,000 ms)
        if (remainingMs <= 5 * 60 * 1000) {
          widget.classList.add("timer-critical");
        } else if (remainingMs <= 15 * 60 * 1000) {
          widget.classList.add("timer-warning");
        }
      }

      if (remainingMs <= 0) {
        this.stopSessionCountdown();
        if (this.currentUser) {
          clearSessionTimer(this.currentUser);
        }
        this.logout("Session expired after 3 hours. Please sign in again.");
      }
    };

    updateClock();
    this.sessionCountdownInterval = setInterval(updateClock, 1000);

    // Synchronize with Firebase shared timer node
    if (this.currentUser) {
      syncSessionTimer(this.currentUser).then(() => {
        updateClock();
      }).catch(() => {});

      if (this.sessionTimerUnsubscribe) {
        this.sessionTimerUnsubscribe();
      }
      this.sessionTimerUnsubscribe = listenToSessionTimer(this.currentUser, () => {
        this.stopSessionCountdown();
        this.logout("Session expired after 3 hours. Please sign in again.");
      });
    }
  }

  /**
   * Stops live session countdown clock and hides widget
   */
  stopSessionCountdown() {
    if (this.sessionCountdownInterval) {
      clearInterval(this.sessionCountdownInterval);
      this.sessionCountdownInterval = null;
    }
    if (this.sessionTimerUnsubscribe) {
      this.sessionTimerUnsubscribe();
      this.sessionTimerUnsubscribe = null;
    }
    const widget = this.sessionTimerWidget || document.getElementById("sessionTimerWidget");
    const clock = this.sessionTimerClock || document.getElementById("sessionTimerClock");
    if (widget) {
      widget.classList.remove("authenticated", "timer-warning", "timer-critical");
      widget.style.display = "none";
    }
    if (clock) {
      clock.textContent = "03:00:00";
    }
  }

  logout(reason = "You have signed out.") {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    this.stopSessionCountdown();
    teardownTerminationListener();
    this.cwd = "";
    clearSession();
    resetPresenceToAnonymous();
    if (typeof window.__stopPresenceSubscription === "function") {
      window.__stopPresenceSubscription();
    }
    this.currentUser = null;
    this.currentRole = null;
    this.initAuthGate(reason);
  }

  initBootBanner() {
    this.output.textContent = "PowerShell 7.6.9\n\n";
  }

  /**
   * Complete resolution of /clear & /cls viewport scroll bug:
   * Sets textContent, resets scrollTop to 0 immediately with scrollTo top:0 instant.
   */
  clearScreen() {
    this.output.textContent = "PowerShell 7.6.9\n\n";
    this.viewport.scrollTop = 0;
    if (typeof this.viewport.scrollTo === 'function') {
      this.viewport.scrollTo({ top: 0, behavior: 'instant' });
    }
    this.input.value = "";
    this.hideSuggestions();
    this.hideGrepWarning();
    this.actions.style.display = "none";
    this.actions.innerHTML = "";
    this.mode = "INPUT";
    this.actionMode = null;
    this.activeItem = null;
    this.updatePromptDisplay();
    this.input.focus();
    this.updateCaret();
  }

  updateStatus(customMessage = null) {
    if (this.statusCount) {
      this.statusCount.textContent = `${this.items.length.toLocaleString()} items`;
    }
    if (this.statusText) {
      if (customMessage) {
        this.statusText.textContent = customMessage;
      } else {
        const cache = getCacheStatus();
        this.statusText.textContent = `Connected: ${REPO_CONFIG.repo} [${cache.refetchesUsed}/6 refetches]`;
      }
    }
  }

  appendRaw(text) {
    const textNode = document.createTextNode(text);
    this.output.appendChild(textNode);
    this.scrollBottom();
  }

  appendHTML(html) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    while (wrapper.firstChild) {
      this.output.appendChild(wrapper.firstChild);
    }
    this.scrollBottom();
  }

  scrollBottom() {
    requestAnimationFrame(() => {
      this.viewport.scrollTop = this.viewport.scrollHeight;
    });
  }

  bindEvents() {
    this.input.addEventListener("input", (e) => {
      markActive();
      this.handleInput(e);
      this.updateCaret();
    });
    this.input.addEventListener("keydown", (e) => {
      markActive();
      this.handleKeydown(e);
      this.updateCaret();
    });
    this.input.addEventListener("keyup", () => this.updateCaret());
    this.input.addEventListener("click", () => this.updateCaret());
    this.input.addEventListener("select", () => this.updateCaret());
    this.input.addEventListener("focus", () => this.updateCaret());
    this.input.addEventListener("blur", () => this.updateCaret());

    // Viewport click to refocus input
    this.viewport.addEventListener("click", (e) => {
      if (this.isInputDisabled || (this.input && this.input.disabled)) return;
      if (!e.target.closest(".action-btn") && 
          !e.target.closest("a") && 
          !e.target.closest(".suggestion-item") &&
          !e.target.closest(".clone-cmd")) {
        this.input.focus();
        this.updateCaret();
      }
    });

    // Window focus/blur restoration
    window.addEventListener("focus", () => {
      if (this.isInputDisabled || (this.input && this.input.disabled)) return;
      this.input.focus();
      this.updateCaret();
    });
    window.addEventListener("blur", () => {
      this.updateCaret();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        if (this.isInputDisabled || (this.input && this.input.disabled)) return;
        this.input.focus();
        this.updateCaret();
      }
    });
  }

  /**
   * Tracks and renders the authentic Windows Terminal block cursor.
   * Blinks when focused; renders an authentic persistent outline block when unfocused.
   */
  updateCaret() {
    if (!this.caretElement || !this.input) return;

    const val = this.input.value || "";
    const pos = typeof this.input.selectionStart === "number" ? this.input.selectionStart : val.length;

    if (this.caretMirror) {
      // Calculate text width up to cursor position
      this.caretMirror.textContent = val.substring(0, pos);
      const textWidth = this.caretMirror.getBoundingClientRect().width;
      const scrollLeft = this.input.scrollLeft || 0;
      const leftPos = Math.max(0, textWidth - scrollLeft);
      this.caretElement.style.left = `${leftPos}px`;

      // Match character cell width
      this.caretMirror.textContent = "W";
      const charWidth = this.caretMirror.getBoundingClientRect().width || 9;
      this.caretElement.style.width = `${charWidth}px`;
    }

    // Active focus state: if focused, blink; if blurred (dialog open), show persistent outline
    const isFocused = document.activeElement === this.input;
    if (isFocused) {
      this.caretElement.classList.remove("unfocused");
      // Reset animation to solid phase immediately on user action
      this.caretElement.style.animation = "none";
      this.caretElement.offsetHeight; // trigger reflow
      this.caretElement.style.animation = "";
    } else {
      this.caretElement.classList.add("unfocused");
    }
  }

  toggleMaximize() {
    const isMax = this.window.classList.toggle("maximized");
    document.body.classList.toggle("has-maximized", isMax);
    const btn = document.getElementById("btnMaximize");
    if (btn) {
      btn.textContent = isMax ? "[R]" : "[M]";
      btn.title = isMax ? "Restore Down" : "Maximize";
    }
    this.scrollBottom();
  }

  /**
   * Handle user typing in the CLI input box.
   * Dispatches '$' to Grep Guard, '/' to Slash Commands, and '@' to File/Dir Search.
   */
  handleInput(e) {
    if (this.mode !== "INPUT") return;
    const value = e.target.value;
    const trimmed = value.trim();

    // 1. In-File Grep Guard on '$'
    if (trimmed.startsWith("$")) {
      this.hideSuggestions();
      this.showGrepWarning();
      return;
    } else {
      this.hideGrepWarning();
    }

    // 2. Built-in Slash Commands (Single '/' prefix fix)
    if (trimmed.startsWith("/")) {
      const query = trimmed.slice(1).toLowerCase();
      const commands = [
        { name: "clear", desc: "Clear terminal buffer", usage: "/clear" },
        { name: "cls", desc: "Clear terminal buffer", usage: "/cls" },
        { name: "re-fetch", desc: "Force cache refresh (max 6/session)", usage: "/re-fetch" },
        { name: "cache", desc: "Inspect cache status & quota", usage: "/cache" },
        { name: "serve", desc: "Interactive multi-OS standalone launcher", usage: "/serve" },
        { name: "install-cisco-pkt-compatible", desc: "Align Cisco Packet Tracer to the repository lab version", usage: "/install-cisco-pkt-compatible" },
        { name: "install-cisco-pkt", desc: "Install/update Cisco Packet Tracer to latest release", usage: "/install-cisco-pkt" },
        { name: "install-winget", desc: "Install or update Windows Package Manager (winget)", usage: "/install-winget" },
        { name: "install-wt", desc: "Generate Windows Terminal installer", usage: "/install-wt" },
        { name: "install-pwsh", desc: "Install or update PowerShell 7", usage: "/install-pwsh" },
        { name: "set-user", desc: "Change prompt username", usage: "/set-user " },
        { name: "set-drive", desc: "Change prompt drive letter", usage: "/set-drive " },
        { name: "reset-prompt", desc: "Reset prompt to default DESKTOP-XXXXXXX", usage: "/reset-prompt" },
        { name: "users", desc: "List authorized users & status (Admin)", usage: "/users" },
        { name: "reset-user-pwd", desc: "Reset user password (Admin)", usage: "/reset-user-pwd " },
        { name: "add-user", desc: "Add user to access list (Admin)", usage: "/add-user " },
        { name: "remove-user", desc: "Remove user from access list (Admin)", usage: "/remove-user " },
        { name: "sessions", desc: "List active presence sessions (Admin)", usage: "/sessions" },
        { name: "logout", desc: "Sign out of terminal session", usage: "/logout" },
        { name: "help", desc: "Show command reference", usage: "/help" }
      ];

      this.filteredResults = commands
        .filter(c => c.name.startsWith(query))
        .map(c => ({ type: "cmd", name: c.name, desc: c.desc, usage: c.usage }));

      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    // 3. File & Folder Indexing on '@'
    if (trimmed.startsWith("@")) {
      const query = trimmed.slice(1).toLowerCase();
      this.currentQuery = query;
      this.filteredResults = this.items.filter(item => item.path.toLowerCase().includes(query));
      this.selectedIndex = 0;
      this.renderSuggestions();
      return;
    }

    this.hideSuggestions();
  }

  /**
   * Inline RED warning box when '$' is typed for direct cloning into .\tmp\txt-idx
   */
  showGrepWarning() {
    this.grepActive = true;
    if (!this.grepWarningBox) return;

    this.grepWarningBox.innerHTML = `
      <div><strong>[!] In-file content search requires local indexing.</strong></div>
      <div style="margin: 4px 0;">Cloning into <code class="clone-cmd">.\\tmp\\txt-idx</code> for deep offline text indexing.</div>
      <div class="grep-actions">
        Press [<span class="key-badge">ENTER</span>] to clone directly &nbsp;|&nbsp; [<span class="key-badge">ESC</span>] to dismiss
      </div>
    `;
    this.grepWarningBox.style.display = "block";
    this.scrollBottom();
  }

  hideGrepWarning() {
    this.grepActive = false;
    if (this.grepWarningBox) {
      this.grepWarningBox.style.display = "none";
      this.grepWarningBox.innerHTML = "";
    }
  }

  /**
   * Automatically generates, triggers, and executes clone-index.bat on [ENTER]
   */
  executeDirectClone() {
    const bat = `@echo off
title Cloning for Local Text Indexing
cd /d "%~dp0"
echo [*] Creating local directory tmp\\txt-idx...
if not exist "tmp\\txt-idx" mkdir "tmp\\txt-idx"
echo [*] Cloning repository into tmp\\txt-idx...
git clone --depth 1 https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}.git "tmp\\txt-idx"
if %ERRORLEVEL% equ 0 (
    echo [OK] Clone complete. Local files ready in tmp\\txt-idx.
) else (
    echo [!] Clone failed. Ensure Git is installed and available in PATH.
)
pause
`;
    this.triggerScriptDownload("clone-index.bat", bat, "application/x-bat;charset=utf-8");

    this.appendRaw(
      `${this.getPromptPrefix()}${this.input.value}\n` +
      "[*] Initiating clone to .\\tmp\\txt-idx...\n" +
      "[OK] clone-index.bat downloaded/triggered. Run it to index text locally.\n\n"
    );
    this.hideGrepWarning();
    this.input.value = "";
    this.updateCaret();
    this.scrollBottom();
  }

  formatSize(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes > 1048576) {
      return (bytes / 1048576).toFixed(1) + " MB";
    }
    return (bytes / 1024).toFixed(1) + " KB";
  }

  /**
   * Renders compact 4-line scrollable suggestions frame without any Unicode emojis
   */
  renderSuggestions() {
    if (this.filteredResults.length === 0) {
      this.hideSuggestions();
      return;
    }

    this.suggestions.innerHTML = "";

    this.filteredResults.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "suggestion-item" + (idx === this.selectedIndex ? " active" : "");

      if (item.type === "cmd") {
        div.innerHTML = `
          <span class="cmd-text"><strong style="color: #4ec9b0;"><span class="slash-prefix">/</span><span class="cmd-name">${item.name}</span></strong></span>
          <span class="cmd-desc" style="color: #767676; font-size: 12px;">${item.desc}</span>
        `;
        div.onclick = () => {
          this.input.value = item.usage ? item.usage : `/${item.name} `;
          this.hideSuggestions();
          this.input.focus();
        };
      } else if (item.type === "dir_complete") {
        div.innerHTML = `
          <span class="item-name" style="color: #4ec9b0;"><span class="badge-dir">[DIR]</span> ${item.name}</span>
          <span class="item-meta" style="color: #569cd6; font-size: 11px;">Directory</span>
        `;
        div.onclick = () => {
          const q = item.quoteChar || '"';
          const needsQuotes = /[\s-]/.test(item.name) || !!item.quoteChar;
          const formatted = needsQuotes ? `${q}${item.name}${q}` : item.name;
          const cmd = item.cmdPrefix || "cd";
          this.input.value = `${cmd} ${formatted}`;
          this.hideSuggestions();
          this.input.focus();
          this.updateCaret();
        };
      } else if (item.type === "file_complete") {
        div.innerHTML = `
          <span class="item-name" style="color: #cccccc;"><span class="badge-file">[FILE]</span> ${item.name}</span>
          <span class="item-meta" style="color: #888888; font-size: 11px;">${item.length ? item.length + ' bytes' : 'File'}</span>
        `;
        div.onclick = () => {
          const q = item.quoteChar || '"';
          const needsQuotes = /[\s-]/.test(item.name) || !!item.quoteChar;
          const formatted = needsQuotes ? `${q}${item.name}${q}` : item.name;
          const cmd = item.cmdPrefix || "cat";
          this.input.value = `${cmd} ${formatted}`;
          this.hideSuggestions();
          this.input.focus();
          this.updateCaret();
        };
      } else if (item.type === "tree" || item.type === "dir") {
        div.innerHTML = `
          <span class="item-name" style="color: #4ec9b0;"><span class="badge-dir">[DIR]</span> ${item.path.split("/").pop()}</span>
          <span class="item-meta" style="color: #569cd6; font-size: 11px;">${item.path}</span>
        `;
        div.onclick = () => this.promptItemAction(item);
      } else {
        const sizeStr = this.formatSize(item.size);
        div.innerHTML = `
          <span class="item-name" style="color: #e5c07b;"><span class="badge-file">[FILE]</span> ${item.path.split("/").pop()}</span>
          <span class="item-meta" style="color: #767676; font-size: 11px;">${sizeStr}</span>
        `;
        div.onclick = () => this.promptItemAction(item);
      }

      this.suggestions.appendChild(div);
    });

    this.suggestions.style.display = "block";
    this.ensureSelectedVisible();
  }

  ensureSelectedVisible() {
    const activeElem = this.suggestions.children[this.selectedIndex];
    if (activeElem) {
      activeElem.scrollIntoView({ block: "nearest" });
    }
  }

  updateActiveSuggestion() {
    const children = this.suggestions.children;
    for (let i = 0; i < children.length; i++) {
      if (i === this.selectedIndex) {
        children[i].classList.add("active");
      } else {
        children[i].classList.remove("active");
      }
    }
    this.ensureSelectedVisible();
  }

  applySelectedSuggestion() {
    if (!this.filteredResults || this.filteredResults.length === 0) return;
    const selected = this.filteredResults[this.selectedIndex];
    if (!selected) return;

    if (selected.type === "cmd") {
      this.input.value = selected.usage ? selected.usage : `/${selected.name} `;
    } else if (selected.type === "dir_complete") {
      const q = selected.quoteChar || '"';
      const needsQuotes = /[\s-]/.test(selected.name) || !!selected.quoteChar;
      const formatted = needsQuotes ? `${q}${selected.name}${q}` : selected.name;
      const cmd = selected.cmdPrefix || "cd";
      this.input.value = `${cmd} ${formatted}`;
    } else if (selected.type === "file_complete") {
      const q = selected.quoteChar || '"';
      const needsQuotes = /[\s-]/.test(selected.name) || !!selected.quoteChar;
      const formatted = needsQuotes ? `${q}${selected.name}${q}` : selected.name;
      const cmd = selected.cmdPrefix || "cat";
      this.input.value = `${cmd} ${formatted}`;
    }
    this.updateCaret();
  }

  hideSuggestions() {
    this.suggestions.style.display = "none";
    this.suggestions.innerHTML = "";
    this.filteredResults = [];
  }

  async handleAuthSubmit(val) {
    if (this.authState === "AUTH_USERNAME") {
      const username = (val || "").trim();
      if (!username) return;
      this.appendRaw(`Enter Username: ${username}\n`);

      const check = checkUserWhitelist(username);
      if (!check.authorized) {
        this.appendRaw(
          `[!] Access denied: '${username}' is not on the authorized access list.\n` +
          `    Please contact the administrator.\n\n`
        );
        this.promptTextElement.textContent = "Enter Username: ";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
        return;
      }

      this.pendingAuthUser = check.canonicalName;
      this.pendingAuthRole = check.role;

      const existingHash = await getUserPasswordHash(this.pendingAuthUser);
      if (!existingHash) {
        this.authMode = "INIT_PASSWORD";
        this.authState = "AUTH_INIT_PWD";
        this.promptTextElement.textContent = "Initialize Password (min 8 characters): ";
        this.isMaskedInput = true;
        this.rawPasswordBuffer = "";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
      } else {
        this.authMode = "PASSWORD";
        this.authState = "AUTH_PASSWORD";
        this.promptTextElement.textContent = "Password: ";
        this.isMaskedInput = true;
        this.rawPasswordBuffer = "";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
      }
    } else if (this.authState === "AUTH_INIT_PWD") {
      const pwd = val || "";
      const mask = "*".repeat(pwd.length);
      this.appendRaw(`Initialize Password (min 8 characters): ${mask}\n`);
      if (pwd.length < 8) {
        this.appendRaw(`[!] Password must be at least 8 characters.\n\n`);
        this.authMode = "INIT_PASSWORD";
        this.promptTextElement.textContent = "Initialize Password (min 8 characters): ";
        this.isMaskedInput = true;
        this.rawPasswordBuffer = "";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
        return;
      }
      this.tempInitPassword = pwd;
      this.authMode = "CONFIRM_PASSWORD";
      this.authState = "AUTH_CONFIRM_PWD";
      this.promptTextElement.textContent = "Confirm Password: ";
      this.isMaskedInput = true;
      this.rawPasswordBuffer = "";
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
    } else if (this.authState === "AUTH_CONFIRM_PWD") {
      const confirmPwd = val || "";
      const mask = "*".repeat(confirmPwd.length);
      this.appendRaw(`Confirm Password: ${mask}\n`);
      if (confirmPwd !== this.tempInitPassword) {
        this.appendRaw(`[!] Passwords do not match. Please try again.\n\n`);
        this.tempInitPassword = null;
        this.authMode = "INIT_PASSWORD";
        this.authState = "AUTH_INIT_PWD";
        this.promptTextElement.textContent = "Initialize Password (min 8 characters): ";
        this.isMaskedInput = true;
        this.rawPasswordBuffer = "";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
        return;
      }

      await this.handlePasswordInit(confirmPwd);
    } else if (this.authState === "AUTH_PASSWORD") {
      const pwd = val || "";
      const mask = "*".repeat(pwd.length);
      this.appendRaw(`Password: ${mask}\n`);

      const hash = await hashPassword(pwd);
      const storedHash = await getUserPasswordHash(this.pendingAuthUser);

      if (storedHash && storedHash.toLowerCase() === hash.toLowerCase()) {
        this.currentUser = this.pendingAuthUser;
        this.currentRole = this.pendingAuthRole;
        await saveSession(this.currentUser, this.currentRole);
        updatePresenceUser(this.currentUser);
        setupTerminationListener();
        if (typeof window.__startPresenceSubscription === "function") {
          window.__startPresenceSubscription();
        }
        this.scheduleSessionExpiration(SESSION_TTL_MS);
        this.startSessionCountdown();

        this.mode = "INPUT";
        this.authMode = null;
        this.authState = null;
        this.isMaskedInput = false;
        this.rawPasswordBuffer = "";
        this.pendingAuthUser = null;
        this.pendingUsername = "";
        this.pendingAuthRole = null;

        this.initPromptConfig();
        this.clearScreen();
      } else {
        this.appendRaw(`[ERR] Authentication failed: Invalid credentials.\n\n`);
        this.authMode = "PASSWORD";
        this.promptTextElement.textContent = "Password: ";
        this.isMaskedInput = true;
        this.rawPasswordBuffer = "";
        this.input.value = "";
        this.updateCaret();
        this.scrollBottom();
      }
    }
  }

  async handlePasswordInit(password) {
    const user = this.pendingAuthUser;
    this.tempInitPassword = null;
    await handlePasswordInit(user, password, this);
  }

  handleKeyDown(e) {
    return this.handleKeydown(e);
  }

  handleKeydown(e) {
    markActive();

    // Global Ctrl+C prompt cancellation (Native PowerShell behavior)
    if (e.ctrlKey && (e.key === "c" || e.key === "C")) {
      const selection = window.getSelection ? window.getSelection().toString() : "";
      if (selection.length > 0) {
        return; // Allow native copy
      }
      e.preventDefault();
      this.handleCtrlC();
      return;
    }

    if (this.isInputDisabled || (this.input && this.input.disabled)) {
      e.preventDefault();
      return;
    }
    // Mode: AUTH (CLI Authentication Subsystem)
    if (this.mode === "AUTH") {
      if (this.isMaskedInput) {
        if (e.key === "Enter") {
          e.preventDefault();
          const pwd = this.rawPasswordBuffer;
          this.rawPasswordBuffer = "";
          this.input.value = "";
          this.handleAuthSubmit(pwd);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          this.rawPasswordBuffer = this.rawPasswordBuffer.slice(0, -1);
          this.input.value = "*".repeat(this.rawPasswordBuffer.length);
          this.updateCaret();
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          this.rawPasswordBuffer += e.key;
          this.input.value = "*".repeat(this.rawPasswordBuffer.length);
          this.updateCaret();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this.rawPasswordBuffer = "";
          this.input.value = "";
          this.updateCaret();
          return;
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const val = this.input.value.trim();
        this.input.value = "";
        this.handleAuthSubmit(val);
        return;
      }
      return;
    }

    // Mode: ACTION (1, 2, 3, 4, Escape)
    if (this.mode === "ACTION") {
      this.handleActionKeys(e);
      return;
    }

    // In-File Grep Guard on '$'
    if (this.grepActive) {
      if (e.key === "Enter") {
        e.preventDefault();
        this.executeDirectClone();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.hideGrepWarning();
        this.input.value = "";
        this.updateCaret();
        return;
      }
    }

    // Suggestions navigation (@ or / or Tab completion)
    if (this.suggestions.style.display === "block" && this.filteredResults.length > 0) {
      if (e.key === "Tab") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredResults.length;
        this.updateActiveSuggestion();
        this.applySelectedSuggestion();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredResults.length;
        this.updateActiveSuggestion();
        this.applySelectedSuggestion();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredResults.length) % this.filteredResults.length;
        this.updateActiveSuggestion();
        this.applySelectedSuggestion();
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const selected = this.filteredResults[this.selectedIndex];
        if (selected) {
          if (selected.type === "cmd") {
            this.input.value = selected.usage ? selected.usage : `/${selected.name} `;
            this.hideSuggestions();
            this.input.focus();
            this.updateCaret();
          } else if (selected.type === "dir_complete" || selected.type === "file_complete") {
            this.applySelectedSuggestion();
            this.hideSuggestions();
            this.input.focus();
            this.updateCaret();
          } else {
            this.promptItemAction(selected);
          }
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        this.hideSuggestions();
        this.updateCaret();
        return;
      }
    }

    // Normal Command Line Navigation (History)
    if (e.key === "ArrowUp") {
      if (this.history.length > 0) {
        e.preventDefault();
        if (this.historyIndex === -1 || this.historyIndex >= this.history.length) {
          this.historyIndex = this.history.length - 1;
        } else if (this.historyIndex > 0) {
          this.historyIndex--;
        }
        this.input.value = this.history[this.historyIndex] || "";
        this.updateCaret();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      if (this.history.length > 0 && this.historyIndex !== -1) {
        e.preventDefault();
        if (this.historyIndex < this.history.length - 1) {
          this.historyIndex++;
          this.input.value = this.history[this.historyIndex];
        } else {
          this.historyIndex = this.history.length;
          this.input.value = "";
        }
        this.updateCaret();
      }
      return;
    }

    // Tab autocomplete
    if (e.key === "Tab") {
      e.preventDefault();
      const currentVal = this.input.value;
      const trimmed = currentVal.trim();

      // 1. Context-aware directory autocomplete for cd / chdir / set-location
      const cdMatch = currentVal.match(/^(\s*(?:cd|chdir|set-location))(?:\s+(.*))?$/i);
      if (cdMatch) {
        const cmdPrefix = cdMatch[1].trim();
        const argPart = cdMatch[2] !== undefined ? cdMatch[2] : "";
        const cleanQuery = argPart.trim().replace(/^['"]+|['"]+$/g, "").toLowerCase();
        const quoteChar = argPart.startsWith("'") ? "'" : (argPart.startsWith('"') ? '"' : null);

        const dirs = this.getImmediateChildren(this.cwd).filter(c => c.isDir);
        const matches = dirs.filter(d => d.name.toLowerCase().startsWith(cleanQuery));

        if (matches.length === 1) {
          const targetName = matches[0].name;
          const q = quoteChar || '"';
          const needsQuotes = /[\s-]/.test(targetName) || !!quoteChar;
          const formatted = needsQuotes ? `${q}${targetName}${q}` : targetName;
          this.input.value = `${cmdPrefix} ${formatted}`;
          this.hideSuggestions();
          this.updateCaret();
          return;
        } else if (matches.length > 1) {
          this.filteredResults = matches.map(m => ({
            type: "dir_complete",
            name: m.name,
            cmdPrefix: cmdPrefix,
            quoteChar: quoteChar
          }));
          this.selectedIndex = 0;
          this.renderSuggestions();
          this.applySelectedSuggestion();
          return;
        }
        return;
      }

      // 2. Context-aware file autocomplete for cat / type / get-content
      const catMatch = currentVal.match(/^(\s*(?:cat|type|get-content))(?:\s+(.*))?$/i);
      if (catMatch) {
        const cmdPrefix = catMatch[1].trim();
        const argPart = catMatch[2] !== undefined ? catMatch[2] : "";
        const cleanQuery = argPart.trim().replace(/^['"]+|['"]+$/g, "").toLowerCase();
        const quoteChar = argPart.startsWith("'") ? "'" : (argPart.startsWith('"') ? '"' : null);

        const files = this.getImmediateChildren(this.cwd).filter(c => !c.isDir);
        const matches = files.filter(f => f.name.toLowerCase().startsWith(cleanQuery));

        if (matches.length === 1) {
          const targetName = matches[0].name;
          const q = quoteChar || '"';
          const needsQuotes = /[\s-]/.test(targetName) || !!quoteChar;
          const formatted = needsQuotes ? `${q}${targetName}${q}` : targetName;
          this.input.value = `${cmdPrefix} ${formatted}`;
          this.hideSuggestions();
          this.updateCaret();
          return;
        } else if (matches.length > 1) {
          this.filteredResults = matches.map(m => ({
            type: "file_complete",
            name: m.name,
            length: m.length,
            cmdPrefix: cmdPrefix,
            quoteChar: quoteChar
          }));
          this.selectedIndex = 0;
          this.renderSuggestions();
          this.applySelectedSuggestion();
          return;
        }
        return;
      }

      // 3. Global search on '@'
      if (trimmed.startsWith("@")) {
        const query = trimmed.slice(1).toLowerCase();
        this.currentQuery = query;
        this.filteredResults = this.items.filter(item => item.path.toLowerCase().includes(query));
        if (this.filteredResults.length > 0) {
          this.selectedIndex = 0;
          this.renderSuggestions();
        }
        return;
      }

      // 4. Fallback to known command autocomplete
      const knownCmds = [
        "ls", "dir", "clear", "cls", "help", "pwd", "cd", "cat", "type",
        "/clear", "/cls", "/re-fetch", "/cache", "/serve", 
        "/install-cisco-pkt-compatible", "/install-cisco-pkt", 
        "/install-winget", "/install-wt", "/install-pwsh", 
        "/set-user", "/set-drive", "/reset-prompt", "/help",
        "/users", "/sessions", "/logout"
      ];
      const match = knownCmds.find(c => c.startsWith(trimmed.toLowerCase()) && c !== trimmed.toLowerCase());
      if (match) {
        this.input.value = match;
        this.updateCaret();
      }
      return;
    }

    // Submit command on Enter
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = this.input.value;
      if (cmd.trim().length > 0) {
        if (this.history.length === 0 || this.history[this.history.length - 1] !== cmd) {
          this.history.push(cmd);
        }
        this.historyIndex = this.history.length;
      }
      this.handleCommand(cmd.trim());
    }
  }

  /**
   * Updated 5-Option Action Prompt with zero emojis
   */
  promptItemAction(item) {
    this.activeItem = item;
    this.selectedItem = item;
    this.mode = "ACTION";
    this.actionMode = "ITEM";
    this.hideSuggestions();
    this.hideGrepWarning();

    if (item.type === "tree" || item.type === "dir") {
      this.actions.innerHTML = `
        <div class="action-header">
          Selected Directory: <strong style="color: #4ec9b0;">[DIR] ${item.path}</strong>
        </div>
        <div class="action-buttons-group">
          <span style="color: #aaaaaa; margin-right: 4px;">Choose action:</span>
          <button class="action-btn" data-action="1">[<span class="key-badge">1</span>] View on GitHub</button>
          <button class="action-btn" data-action="2">[<span class="key-badge">2</span>] Browse in Terminal (ls)</button>
          <button class="action-btn" data-action="3">[<span class="key-badge">3</span>] Copy Path</button>
          <button class="action-btn" data-action="Escape">[<span class="key-badge">ESC</span>] Cancel</button>
        </div>
      `;
    } else {
      const sizeStr = this.formatSize(item.size);
      this.actions.innerHTML = `
        <div class="action-header">
          Selected File: <strong style="color: #e5c07b;">[FILE] ${item.path}</strong> (${sizeStr})
        </div>
        <div class="action-buttons-group">
          <span style="color: #aaaaaa; margin-right: 4px;">Choose action:</span>
          <button class="action-btn" data-action="1">[<span class="key-badge">1</span>] View on GitHub</button>
          <button class="action-btn" data-action="2">[<span class="key-badge">2</span>] View Raw</button>
          <button class="action-btn" data-action="3">[<span class="key-badge">3</span>] Copy to Clipboard</button>
          <button class="action-btn" data-action="4">[<span class="key-badge">4</span>] Download</button>
          <button class="action-btn" data-action="Escape">[<span class="key-badge">ESC</span>] Cancel</button>
        </div>
      `;
    }

    this.actions.style.display = "block";
    this.scrollBottom();

    // Bind clicks on action buttons
    const buttons = this.actions.querySelectorAll(".action-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        await this.executeAction(action);
      });
    });
  }

  async copyToClipboard(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  async executeAction(actionKey) {
    if (!this.activeItem) return;

    // History Tracking for @ Invocations
    const historyName = this.selectedItem ? (this.selectedItem.name || this.selectedItem.path.split("/").pop()) : (this.activeItem.name || this.activeItem.path.split("/").pop() || this.currentQuery);
    const historyCmd = `@${historyName || this.currentQuery || ""}`;
    if (historyCmd.length > 1) {
      if (this.history.length === 0 || this.history[this.history.length - 1] !== historyCmd) {
        this.history.push(historyCmd);
      }
      this.historyIndex = this.history.length;
    }

    const isDir = this.activeItem.type === "tree" || this.activeItem.type === "dir";
    const rawUrl = `https://raw.githubusercontent.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/${REPO_CONFIG.branch}/${this.activeItem.path}`;

    if (isDir) {
      if (actionKey === "1") {
        window.open(`https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/tree/${REPO_CONFIG.branch}/${this.activeItem.path}`, "_blank");
        this.resetPrompt(`Opened GitHub tree: ${this.activeItem.path}`);
      } else if (actionKey === "2") {
        const selectedDirPath = this.activeItem.path;
        this.cwd = selectedDirPath;
        this.updatePromptDisplay();
        this.resetPrompt();
        this.runLs(this.cwd);
      } else if (actionKey === "3") {
        try {
          await this.copyToClipboard(this.activeItem.path);
          this.resetPrompt(`[OK] Path copied to clipboard: ${this.activeItem.path}`);
        } catch (err) {
          this.resetPrompt(`[!] Clipboard write failed: ${err.message}`);
        }
      } else if (actionKey === "Escape" || actionKey === "esc") {
        this.resetPrompt("Action aborted.");
      }
      return;
    }

    // File action keys
    if (actionKey === "1") {
      window.open(`https://github.com/${REPO_CONFIG.owner}/${REPO_CONFIG.repo}/blob/${REPO_CONFIG.branch}/${this.activeItem.path}`, "_blank");
      this.resetPrompt(`Opened GitHub view: ${this.activeItem.path}`);
    } else if (actionKey === "2") {
      window.open(rawUrl, "_blank");
      this.resetPrompt(`Opened Raw stream: ${this.activeItem.path}`);
    } else if (actionKey === "3") {
      try {
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        await this.copyToClipboard(text);
        this.resetPrompt(`[OK] Copied file content to clipboard: ${this.activeItem.path.split("/").pop()}`);
      } catch (err) {
        this.resetPrompt(`[!] Clipboard write failed: ${err.message}`);
      }
    } else if (actionKey === "4") {
      const filename = this.activeItem.path.split("/").pop();
      await this.downloadFile(this.activeItem.path, filename);
    } else if (actionKey === "Escape" || actionKey === "esc") {
      this.resetPrompt("Action aborted.");
    }
  }

  async handleActionKeys(e) {
    if (this.actionMode === "SERVE_OS") {
      if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "Escape") {
        e.preventDefault();
        await this.executeServeOSAction(e.key);
      }
      return;
    }

    if (this.actionMode === "ITEM" && this.activeItem) {
      const isDir = this.activeItem.type === "tree" || this.activeItem.type === "dir";

      if (isDir) {
        if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "Escape") {
          e.preventDefault();
          await this.executeAction(e.key);
        }
      } else {
        if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "4" || e.key === "Escape") {
          e.preventDefault();
          await this.executeAction(e.key);
        }
      }
    }
  }

  /**
   * Interactive Multi-OS Standalone Launcher Modal
   */
  promptServeOSAction() {
    this.mode = "ACTION";
    this.actionMode = "SERVE_OS";
    this.activeItem = null;
    this.hideSuggestions();
    this.hideGrepWarning();

    this.actions.innerHTML = `
      <div class="action-header">
        <span class="ps-header" style="color: #4ec9b0; font-weight: bold;">Select Target OS for Local Standalone Launcher:</span>
      </div>
      <div class="action-buttons-group">
        <button class="action-btn" data-action="1">[<span class="key-badge">1</span>] Windows 10 / 11 (CMD &amp; PowerShell Polyglot .bat with runtime &amp; WT baselining)</button>
        <button class="action-btn" data-action="2">[<span class="key-badge">2</span>] Linux - Ubuntu / Debian (.sh script with apt &amp; Python/Java detection)</button>
        <button class="action-btn" data-action="3">[<span class="key-badge">3</span>] Linux - Fedora / RHEL / Generic (.sh script with dnf/pacman detection)</button>
        <button class="action-btn" data-action="Escape">[<span class="key-badge">ESC</span>] Cancel</button>
      </div>
    `;

    this.actions.style.display = "block";
    this.scrollBottom();

    // Bind clicks on action buttons
    const buttons = this.actions.querySelectorAll(".action-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        await this.executeServeOSAction(action);
      });
    });
  }

  async executeServeOSAction(actionKey) {
    if (actionKey === "1") {
      this.triggerWindowsLauncherDownload();
      this.resetPrompt(
        "[OK] Generated and initiated download for 'launch-terminal.bat'.\n" +
        "Target: Windows 10 / 11 (CMD & PowerShell Polyglot launcher with runtime & WT baselining).\n" +
        "Place 'launch-terminal.bat' in the project directory and double-click to run."
      );
    } else if (actionKey === "2") {
      this.triggerUbuntuLauncherDownload();
      this.resetPrompt(
        "[OK] Generated and initiated download for 'launch-terminal-ubuntu.sh'.\n" +
        "Target: Linux - Ubuntu / Debian (.sh script with apt & Python/Java detection).\n" +
        "Run via: bash launch-terminal-ubuntu.sh"
      );
    } else if (actionKey === "3") {
      this.triggerLinuxLauncherDownload();
      this.resetPrompt(
        "[OK] Generated and initiated download for 'launch-terminal-linux.sh'.\n" +
        "Target: Linux - Fedora / RHEL / Arch / Generic (.sh script with dnf/pacman detection).\n" +
        "Run via: bash launch-terminal-linux.sh"
      );
    } else if (actionKey === "Escape" || actionKey === "esc") {
      this.resetPrompt("Launcher selection cancelled.");
    }
  }

  /**
   * Unified asynchronous script download helper with persistent custom caret focus restoration
   */
  triggerScriptDownload(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);

    requestAnimationFrame(() => {
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // Immediately restore input focus and custom block caret
      setTimeout(() => {
        this.input.focus();
        this.updateCaret();
        this.scrollBottom();
      }, 50);
    });
  }

  /**
   * Standalone Multi-Platform Script Generators
   */
  generateWindowsLauncherScript() {
    return `@echo off
setlocal enabledelayedexpansion
title Windows 11 Terminal - Standalone Launcher
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Windows 11 Terminal (PowerShell 7.6.9) Local Launcher
echo   Repository: ${REPO_CONFIG.owner}/${REPO_CONFIG.repo}
echo ====================================================================
echo.

set PORT=8000
set URL=http://localhost:%PORT%

:: Windows Version Detection
set WIN_VER=Windows 10
for /f "tokens=3" %%i in ('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" /v CurrentBuildNumber 2^>nul') do (
    if %%i geq 22000 (
        set WIN_VER=Windows 11
    )
)
echo [INFO] Detected OS: %WIN_VER%

:: Windows Terminal (wt.exe) Verification & Auto-Baselining
where wt.exe >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Windows Terminal not found. Checking winget...
    where winget.exe >nul 2>nul
    if %errorlevel% equ 0 (
        echo [*] Installing Windows Terminal via winget...
        winget install --id Microsoft.WindowsTerminal -e --silent --accept-source-agreements --accept-package-agreements
    ) else (
        echo [INFO] Winget not found. Use '/install-winget' or '/install-wt' in terminal for installer scripts.
    )
) else (
    echo [OK] Windows Terminal (wt.exe) verified.
)

:: PowerShell 7 vs 5.1 Verification
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Modern PowerShell 7 (pwsh.exe) verified.
    set PS_BIN=pwsh.exe
) else (
    echo [INFO] Modern PowerShell 7 not found. Using Windows PowerShell 5.1 fallback.
    set PS_BIN=powershell.exe
)

echo.
echo [*] Initializing local HTTP server on port %PORT%...

:: Cleanup any existing process on port 8000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)

set SERVER_STARTED=0

:: Check Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected Python runtime. Starting server...
    start "PWSH_SRV_8000" /min python -m http.server %PORT%
    set SERVER_STARTED=1
    goto :server_ready
)

:: Check Node.js / npx
where npx >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected Node.js / npx runtime. Starting server...
    start "PWSH_SRV_8000" /min npx --yes serve -l %PORT% .
    set SERVER_STARTED=1
    goto :server_ready
)

:: Check PHP
where php >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected PHP CLI runtime. Starting server...
    start "PWSH_SRV_8000" /min php -S localhost:%PORT%
    set SERVER_STARTED=1
    goto :server_ready
)

:: Fallback: Built-in PowerShell HttpListener
echo [OK] Starting built-in Windows PowerShell HttpListener fallback server...
start "PWSH_SRV_8000" /min powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = %PORT%; $listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:' + $port + '/'); $listener.Start(); while ($listener.IsListening) { try { $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response; $rel = $req.Url.LocalPath.TrimStart('/'); if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }; $filePath = Join-Path (Get-Location) $rel.Replace('/', '\\'); if (Test-Path $filePath -PathType Leaf) { $ext = [System.IO.Path]::GetExtension($filePath).ToLower(); $mime = switch ($ext) { '.html' { 'text/html; charset=utf-8' } '.css' { 'text/css; charset=utf-8' } '.js' { 'application/javascript; charset=utf-8' } '.json' { 'application/json; charset=utf-8' } '.png' { 'image/png' } '.jpg' { 'image/jpeg' } '.svg' { 'image/svg+xml' } default { 'application/octet-stream' } }; $res.ContentType = $mime; $bytes = [System.IO.File]::ReadAllBytes($filePath); $res.ContentLength64 = $bytes.Length; $res.OutputStream.Write($bytes, 0, $bytes.Length); } else { $res.StatusCode = 404; $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found'); $res.OutputStream.Write($msg, 0, $msg.Length); }; $res.OutputStream.Close(); } catch {} }"
set SERVER_STARTED=1

:server_ready
timeout /t 2 /nobreak >nul

:: Desktop App Launch Hierarchy
echo [*] Launching desktop application...

:: Tier 1: Python pywebview
python -c "import webview" >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching via pywebview desktop shell...
    python -c "import webview; webview.create_window('PowerShell 7.6.9', '%URL%', width=1100, height=680); webview.start()"
    goto :cleanup
)

:: Tier 2: Edge App Mode (Standalone window)
where msedge.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait msedge.exe --app=%URL% --window-size=1100,680
    goto :cleanup
)

if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app=%URL% --window-size=1100,680
    goto :cleanup
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    echo [OK] Launching standalone Edge App Mode (1100x680)...
    start /wait "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app=%URL% --window-size=1100,680
    goto :cleanup
)

:: Tier 3: Chrome App Mode fallback
where chrome.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Launching Chrome App Mode (1100x680)...
    start /wait chrome.exe --app=%URL% --window-size=1100,680
    goto :cleanup
)

:: Tier 4: Default Browser Fallback
echo [OK] Launching in default web browser...
start "" "%URL%"
echo.
echo ====================================================================
echo   Server is running at %URL%
echo   Press any key in this window to stop server and exit.
echo ====================================================================
pause >nul

:cleanup
echo.
echo [*] Shutting down local server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :%PORT% ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>nul
)
taskkill /FI "WINDOWTITLE eq PWSH_SRV_8000*" /F >nul 2>nul
echo [OK] Server terminated cleanly.
exit /b 0
`;
  }

  generateUbuntuLauncherScript() {
    return `#!/usr/bin/env bash
# ====================================================================
#   [LINUX] Ubuntu / Debian Local Standalone Launcher
#   Repository: ${REPO_CONFIG.owner}/${REPO_CONFIG.repo}
# ====================================================================

set -e

PORT=8000
URL="http://localhost:\$PORT"
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\$SCRIPT_DIR"

echo "===================================================================="
echo "  [LINUX] Windows 11 Terminal (PowerShell 7.6.9) Local Launcher"
echo "  Target: Ubuntu / Debian / Linux Mint"
echo "===================================================================="
echo ""

# Process cleanup trap
cleanup() {
    echo ""
    echo "[*] Shutting down background server (PID: \$SERVER_PID)..."
    if [ -n "\$SERVER_PID" ]; then
        kill "\$SERVER_PID" 2>/dev/null || true
    fi
    if command -v fuser >/dev/null 2>&1; then
        fuser -k "\$PORT/tcp" 2>/dev/null || true
    fi
    echo "[OK] Server terminated cleanly."
}
trap cleanup EXIT INT TERM

# Check for existing process on port
if command -v fuser >/dev/null 2>&1; then
    fuser -k "\$PORT/tcp" 2>/dev/null || true
fi

# Detect Runtime & Start Server
SERVER_PID=""
if command -v python3 >/dev/null 2>&1; then
    echo "[OK] Detected Python 3 runtime."
    python3 -m http.server "\$PORT" >/dev/null 2>&1 &
    SERVER_PID=\$!
elif command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
    echo "[OK] Detected Node.js / npx runtime."
    npx --yes serve -l "\$PORT" . >/dev/null 2>&1 &
    SERVER_PID=\$!
elif command -v php >/dev/null 2>&1; then
    echo "[OK] Detected PHP CLI runtime."
    php -S "localhost:\$PORT" >/dev/null 2>&1 &
    SERVER_PID=\$!
else
    echo "[ERR] No Python 3, Node.js, or PHP found."
    echo "[INFO] Install Python 3 using: sudo apt-get update && sudo apt-get install -y python3"
    exit 1
fi

sleep 1.5

# Desktop App Launch Hierarchy
echo "[*] Launching application..."

if command -v python3 >/dev/null 2>&1 && python3 -c "import webview" 2>/dev/null; then
    echo "[OK] Launching via pywebview desktop window (1100x680)..."
    python3 -c "import webview; webview.create_window('PowerShell 7.6.9', '\$URL', width=1100, height=680); webview.start()"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "[OK] Launching Google Chrome App Mode..."
    google-chrome --app="\$URL" --window-size=1100,680
elif command -v chromium-browser >/dev/null 2>&1; then
    echo "[OK] Launching Chromium App Mode..."
    chromium-browser --app="\$URL" --window-size=1100,680
elif command -v chromium >/dev/null 2>&1; then
    echo "[OK] Launching Chromium App Mode..."
    chromium --app="\$URL" --window-size=1100,680
elif command -v xdg-open >/dev/null 2>&1; then
    echo "[OK] Launching default system browser via xdg-open..."
    xdg-open "\$URL"
    echo ""
    echo "===================================================================="
    echo "  Server running at \$URL"
    echo "  Press [ENTER] to stop server and exit."
    echo "===================================================================="
    read -r
else
    echo "[OK] Server listening at \$URL"
    echo "Press [ENTER] to stop server and exit."
    read -r
fi
`;
  }

  generateLinuxLauncherScript() {
    return `#!/usr/bin/env bash
# ====================================================================
#   [LINUX] Fedora / RHEL / Arch / Generic Local Standalone Launcher
#   Repository: ${REPO_CONFIG.owner}/${REPO_CONFIG.repo}
# ====================================================================

set -e

PORT=8000
URL="http://localhost:\$PORT"
SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
cd "\$SCRIPT_DIR"

echo "===================================================================="
echo "  [LINUX] Windows 11 Terminal (PowerShell 7.6.9) Local Launcher"
echo "  Target: Fedora / RHEL / Arch / Generic Linux"
echo "===================================================================="
echo ""

# Package Manager Detection
if command -v dnf >/dev/null 2>&1; then
    PKG_MGR="dnf"
elif command -v pacman >/dev/null 2>&1; then
    PKG_MGR="pacman"
elif command -v zypper >/dev/null 2>&1; then
    PKG_MGR="zypper"
else
    PKG_MGR="generic"
fi
echo "[INFO] Detected package manager: \$PKG_MGR"

# Process cleanup trap
cleanup() {
    echo ""
    echo "[*] Shutting down background server (PID: \$SERVER_PID)..."
    if [ -n "\$SERVER_PID" ]; then
        kill "\$SERVER_PID" 2>/dev/null || true
    fi
    if command -v fuser >/dev/null 2>&1; then
        fuser -k "\$PORT/tcp" 2>/dev/null || true
    fi
    echo "[OK] Server terminated cleanly."
}
trap cleanup EXIT INT TERM

# Clear existing process on port
if command -v fuser >/dev/null 2>&1; then
    fuser -k "\$PORT/tcp" 2>/dev/null || true
fi

# Detect Runtime & Start Server
SERVER_PID=""
if command -v python3 >/dev/null 2>&1; then
    echo "[OK] Detected Python 3 runtime."
    python3 -m http.server "\$PORT" >/dev/null 2>&1 &
    SERVER_PID=\$!
elif command -v node >/dev/null 2>&1 && command -v npx >/dev/null 2>&1; then
    echo "[OK] Detected Node.js / npx runtime."
    npx --yes serve -l "\$PORT" . >/dev/null 2>&1 &
    SERVER_PID=\$!
elif command -v php >/dev/null 2>&1; then
    echo "[OK] Detected PHP CLI runtime."
    php -S "localhost:\$PORT" >/dev/null 2>&1 &
    SERVER_PID=\$!
else
    echo "[ERR] No Python 3, Node.js, or PHP found."
    if [ "\$PKG_MGR" = "dnf" ]; then
        echo "[INFO] Install Python 3 using: sudo dnf install python3"
    elif [ "\$PKG_MGR" = "pacman" ]; then
        echo "[INFO] Install Python 3 using: sudo pacman -S python"
    fi
    exit 1
fi

sleep 1.5

# Desktop App Launch Hierarchy
echo "[*] Launching application..."

if command -v python3 >/dev/null 2>&1 && python3 -c "import webview" 2>/dev/null; then
    echo "[OK] Launching via pywebview desktop window (1100x680)..."
    python3 -c "import webview; webview.create_window('PowerShell 7.6.9', '\$URL', width=1100, height=680); webview.start()"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "[OK] Launching Google Chrome App Mode..."
    google-chrome --app="\$URL" --window-size=1100,680
elif command -v chromium-browser >/dev/null 2>&1; then
    echo "[OK] Launching Chromium App Mode..."
    chromium-browser --app="\$URL" --window-size=1100,680
elif command -v chromium >/dev/null 2>&1; then
    echo "[OK] Launching Chromium App Mode..."
    chromium --app="\$URL" --window-size=1100,680
elif command -v xdg-open >/dev/null 2>&1; then
    echo "[OK] Launching default system browser via xdg-open..."
    xdg-open "\$URL"
    echo ""
    echo "===================================================================="
    echo "  Server running at \$URL"
    echo "  Press [ENTER] to stop server and exit."
    echo "===================================================================="
    read -r
else
    echo "[OK] Server listening at \$URL"
    echo "Press [ENTER] to stop server and exit."
    read -r
fi
`;
  }

  generateInstallCiscoPktCompatibleScript() {
    const targetVer = COMPATIBLE_PKT_VERSION;
    const targetPrefix = COMPATIBLE_PKT_VERSION_PREFIX;

    return `@echo off
setlocal enabledelayedexpansion
title Cisco Packet Tracer (Compatible Lab Build ${targetVer})
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Cisco Packet Tracer Compatible Lab Alignment (v${targetVer})
echo ====================================================================
echo.

:: 1. Self-Elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\"' -Verb RunAs"
    exit /b
)

set TARGET_VER=${targetVer}
set TARGET_PREFIX=${targetPrefix}

echo [*] Scanning Windows Registry for installed Cisco Packet Tracer versions...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$target = '%TARGET_VER%'; $prefix = '%TARGET_PREFIX%'; " ^
  "$keys = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); " ^
  "$installed = Get-ItemProperty -Path $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Packet Tracer*' }; " ^
  "if ($installed) { " ^
  "  foreach ($app in $installed) { " ^
  "    $ver = $app.DisplayVersion; $name = $app.DisplayName; $uninst = $app.UninstallString; " ^
  "    Write-Host ('[INFO] Detected: ' + $name + ' (Version: ' + $ver + ')'); " ^
  "    if ($ver -eq $target -or ($ver -and $ver.StartsWith($prefix))) { " ^
  "      Write-Host ('[OK] Cisco Packet Tracer matches target lab version (' + $target + '). No changes needed.'); " ^
  "      exit 100; " ^
  "    } else { " ^
  "      Write-Host ('[WARN] Detected version (' + $ver + ') does not match lab target (' + $target + ').'); " ^
  "      Write-Host '[*] Removing mismatched version to prevent file parsing errors...'; " ^
  "      if ($uninst) { " ^
  "        $cleanUninst = $uninst.Trim('\"'); " ^
  "        Write-Host ('[*] Executing silent uninstaller: ' + $cleanUninst); " ^
  "        $p = Start-Process -FilePath $cleanUninst -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART' -Wait -PassThru; " ^
  "        Write-Host ('[OK] Uninstaller exited with code ' + $p.ExitCode); " ^
  "      } " ^
  "    } " ^
  "  } " ^
  "}"

if %errorlevel% equ 100 (
    echo [OK] Lab-compatible Packet Tracer already present. Ready for lab files.
    echo.
    pause
    exit /b 0
)

:: Pinned Installation Pipeline
set TMP_CISCO=%TEMP%\\cisco_pkt_install_%RANDOM%
mkdir "%TMP_CISCO%" 2>nul

echo.
echo [*] Tier 1: Attempting installation via Windows Package Manager (winget)...
where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    winget install --id Cisco.PacketTracer --version "%TARGET_VER%" -e --silent --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 goto :VERIFY_INSTALL
    echo [INFO] Pinned winget install for %TARGET_VER% not in repo. Trying prefix %TARGET_PREFIX%...
    winget install --id Cisco.PacketTracer --version "%TARGET_PREFIX%" -e --silent --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 goto :VERIFY_INSTALL
    echo [WARN] Winget pinned installation failed. Trying Tier 2 (Chocolatey)...
) else (
    echo [INFO] winget not detected on system PATH.
)

echo.
echo [*] Tier 2: Attempting installation via Chocolatey (choco)...
where choco.exe >nul 2>nul
if %errorlevel% equ 0 (
    choco install packettracer --version "%TARGET_PREFIX%" -y --allow-downgrade
    if !errorlevel! equ 0 goto :VERIFY_INSTALL
    echo [WARN] Chocolatey installation failed. Trying Tier 3 (Direct installer)...
) else (
    echo [INFO] Chocolatey not detected on system PATH.
)

echo.
echo [*] Tier 3: Downloading verified installer binary matching %TARGET_VER%...
set DIRECT_URL=https://archive.org/download/cisco-packet-tracer-builds/CiscoPacketTracer_901_Win64.exe
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "try { " ^
  "  Write-Host ('[*] Downloading installer from: ' + '%DIRECT_URL%'); " ^
  "  Invoke-WebRequest -Uri '%DIRECT_URL%' -OutFile '%TMP_CISCO%\\PacketTracerSetup.exe' -UseBasicParsing; " ^
  "} catch { " ^
  "  Write-Host ('[WARN] Direct mirror download returned: ' + $_.Exception.Message); " ^
  "}"

if exist "%TMP_CISCO%\\PacketTracerSetup.exe" (
    echo [*] Executing silent installer...
    "%TMP_CISCO%\\PacketTracerSetup.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
)

:VERIFY_INSTALL
rd /s /q "%TMP_CISCO%" 2>nul

echo.
echo [*] Verifying Cisco Packet Tracer installation...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pf = [Environment]::GetFolderPath('ProgramFiles'); $pfx86 = [Environment]::GetFolderPath('ProgramFilesX86'); " ^
  "$paths = @($pf, $pfx86) | Where-Object { $_ } | ForEach-Object { Get-ChildItem -Path $_ -Filter 'Cisco Packet Tracer*' -Directory -ErrorAction SilentlyContinue }; " ^
  "$pt = $paths | ForEach-Object { Get-ChildItem -Path $_.FullName -Filter 'PacketTracer.exe' -Recurse -ErrorAction SilentlyContinue } | Select-Object -First 1; " ^
  "if ($pt) { " ^
  "  $fvi = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($pt.FullName); " ^
  "  Write-Host ('[OK] Cisco Packet Tracer verified at: ' + $pt.FullName); " ^
  "  Write-Host ('[OK] Binary Product Version: ' + $fvi.ProductVersion); " ^
  "} else { " ^
  "  Write-Host '[WARN] PacketTracer.exe not found in standard installation directories. Please verify manually or reboot.'; " ^
  "}"

echo.
pause
`;
  }

  generateInstallCiscoPktScript() {
    return `@echo off
setlocal enabledelayedexpansion
title Cisco Packet Tracer (Latest Release) Installer
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Cisco Packet Tracer Latest Release Automated Installer
echo ====================================================================
echo.

:: 1. Self-Elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Silent Removal of Legacy/Older Versions
echo [*] Scanning Windows Registry for legacy Cisco Packet Tracer installations...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$keys = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'); " ^
  "$installed = Get-ItemProperty -Path $keys -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*Packet Tracer*' }; " ^
  "if ($installed) { " ^
  "  foreach ($app in $installed) { " ^
  "    $uninst = $app.UninstallString; " ^
  "    if ($uninst) { " ^
  "      $cleanUninst = $uninst.Trim('\"'); " ^
  "      Write-Host ('[*] Silently removing legacy release: ' + $app.DisplayName); " ^
  "      $p = Start-Process -FilePath $cleanUninst -ArgumentList '/VERYSILENT /SUPPRESSMSGBOXES /NORESTART' -Wait -PassThru; " ^
  "      Write-Host ('[OK] Legacy uninstaller exited with code ' + $p.ExitCode); " ^
  "    } " ^
  "  } " ^
  "}"

set TMP_CISCO=%TEMP%\\cisco_latest_%RANDOM%
mkdir "%TMP_CISCO%" 2>nul

echo.
echo [*] Tier 1: Deploying latest release via Windows Package Manager (winget)...
where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    winget install --id Cisco.PacketTracer -e --silent --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 goto :VERIFY_LATEST
    echo [WARN] Winget latest install returned non-zero code. Trying Tier 2 (Chocolatey)...
) else (
    echo [INFO] winget not detected on system PATH.
)

echo.
echo [*] Tier 2: Deploying latest release via Chocolatey (choco)...
where choco.exe >nul 2>nul
if %errorlevel% equ 0 (
    choco install packettracer -y
    if !errorlevel! equ 0 goto :VERIFY_LATEST
    echo [WARN] Chocolatey installation returned non-zero code. Trying Tier 3 (Direct setup)...
) else (
    echo [INFO] Chocolatey not detected on system PATH.
)

echo.
echo [*] Tier 3: Direct official setup installer execution...
set LATEST_URL=https://archive.org/download/cisco-packet-tracer-builds/CiscoPacketTracer_Latest_Win64.exe
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "try { " ^
  "  Write-Host ('[*] Downloading installer from: ' + '%LATEST_URL%'); " ^
  "  Invoke-WebRequest -Uri '%LATEST_URL%' -OutFile '%TMP_CISCO%\\PacketTracerSetup.exe' -UseBasicParsing; " ^
  "} catch { " ^
  "  Write-Host ('[WARN] Direct download failed: ' + $_.Exception.Message); " ^
  "}"

if exist "%TMP_CISCO%\\PacketTracerSetup.exe" (
    echo [*] Executing silent installer...
    "%TMP_CISCO%\\PacketTracerSetup.exe" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART
)

:VERIFY_LATEST
rd /s /q "%TMP_CISCO%" 2>nul

echo.
echo [*] Verifying latest Cisco Packet Tracer installation...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "$pf = [Environment]::GetFolderPath('ProgramFiles'); $pfx86 = [Environment]::GetFolderPath('ProgramFilesX86'); " ^
  "$paths = @($pf, $pfx86) | Where-Object { $_ } | ForEach-Object { Get-ChildItem -Path $_ -Filter 'Cisco Packet Tracer*' -Directory -ErrorAction SilentlyContinue }; " ^
  "$pt = $paths | ForEach-Object { Get-ChildItem -Path $_.FullName -Filter 'PacketTracer.exe' -Recurse -ErrorAction SilentlyContinue } | Select-Object -First 1; " ^
  "if ($pt) { " ^
  "  $fvi = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($pt.FullName); " ^
  "  Write-Host ('[OK] Cisco Packet Tracer verified at: ' + $pt.FullName); " ^
  "  Write-Host ('[OK] Binary Product Version: ' + $fvi.ProductVersion); " ^
  "} else { " ^
  "  Write-Host '[WARN] PacketTracer.exe not found in standard installation directories. Please verify manually or reboot.'; " ^
  "}"

echo.
pause
`;
  }

  generateInstallWingetScript() {
    return `@echo off
setlocal enabledelayedexpansion
title Windows Package Manager (winget) Installer & Upgrader
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Windows Package Manager (winget) Automated Engine
echo ====================================================================
echo.

:: 1. Self-Elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\"' -Verb RunAs"
    exit /b
)

:: 2. Upgrade vs Clean Install Check
where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected functional winget.exe on system PATH.
    echo [*] Checking for Windows Package Manager updates...
    winget upgrade --id Microsoft.DesktopAppInstaller -e --silent --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 (
        echo [OK] Windows Package Manager is up to date!
    ) else (
        echo [INFO] winget upgrade completed or already on latest release.
    )
    echo.
    pause
    exit /b 0
)

echo [WARN] winget.exe not found or requires installation/repair.
echo [*] Starting AppX Deployment Service (AppXSvc)...
net start AppXSvc >nul 2>&1

set TMP_DIR=%TEMP%\\winget_install_%RANDOM%
mkdir "%TMP_DIR%" 2>nul

echo [*] Downloading Microsoft VCLibs prerequisite...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "Invoke-WebRequest -Uri 'https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx' -OutFile '%TMP_DIR%\\VCLibs.appx' -UseBasicParsing"

echo [*] Downloading Microsoft UI.Xaml prerequisite...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "Invoke-WebRequest -Uri 'https://github.com/microsoft/microsoft-ui-xaml/releases/download/v2.8.6/Microsoft.UI.Xaml.2.8.x64.appx' -OutFile '%TMP_DIR%\\UIXaml.appx' -UseBasicParsing"

echo [*] Downloading DesktopAppInstaller (winget) MSIX bundle...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "Invoke-WebRequest -Uri 'https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle' -OutFile '%TMP_DIR%\\winget.msixbundle' -UseBasicParsing"

echo [*] Engine 1: Installing via Add-AppxPackage...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { " ^
  "  Add-AppxPackage -Path '%TMP_DIR%\\VCLibs.appx' -ErrorAction Stop; " ^
  "  Add-AppxPackage -Path '%TMP_DIR%\\UIXaml.appx' -ErrorAction Stop; " ^
  "  Add-AppxPackage -Path '%TMP_DIR%\\winget.msixbundle' -ErrorAction Stop; " ^
  "  Write-Host '[OK] Engine 1 installation completed successfully.'; " ^
  "  exit 0; " ^
  "} catch { " ^
  "  Write-Host ('[WARN] Engine 1 failed: ' + $_.Exception.Message); " ^
  "  exit 1; " ^
  "}"

if %errorlevel% neq 0 (
    echo [*] Engine 2: Invoking DISM Provisioning Fallback...
    dism /Online /Add-ProvisionedAppxPackage /PackagePath:"%TMP_DIR%\\winget.msixbundle" /DependencyPackagePath:"%TMP_DIR%\\VCLibs.appx" /DependencyPackagePath:"%TMP_DIR%\\UIXaml.appx" /SkipLicense
    if !errorlevel! equ 0 (
        echo [OK] Engine 2 (DISM) provisioning succeeded!
    ) else (
        echo [ERR] DISM provisioning exited with code !errorlevel!.
    )
)

where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Windows Package Manager (winget) is now available!
) else (
    echo [INFO] Installation completed. Restart your terminal window to refresh PATH.
)

rd /s /q "%TMP_DIR%" 2>nul
echo.
pause
`;
  }

  generateInstallWTScript() {
    return `@echo off
setlocal enabledelayedexpansion
title Windows Terminal Installer
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Windows Terminal (wt.exe) Automated Installer
echo ====================================================================
echo.

where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected winget. Installing Windows Terminal...
    winget install --id Microsoft.WindowsTerminal -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% equ 0 (
        echo [OK] Windows Terminal installed successfully via winget!
        pause
        exit /b 0
    )
    echo [INFO] Winget installation encountered an issue. Falling back to MSIX bundle...
)

echo [*] Downloading Windows Terminal MSIX bundle from Microsoft GitHub...
set TMP_WT=%TEMP%\\wt_install_%RANDOM%
mkdir "%TMP_WT%" 2>nul
set WT_URL=https://github.com/microsoft/terminal/releases/latest/download/Microsoft.WindowsTerminal_Win10_Win11.msixbundle

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "Invoke-WebRequest -Uri '%WT_URL%' -OutFile '%TMP_WT%\\WindowsTerminal.msixbundle' -UseBasicParsing"

if exist "%TMP_WT%\\WindowsTerminal.msixbundle" (
    echo [*] Installing Windows Terminal package...
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "Add-AppxPackage -Path '%TMP_WT%\\WindowsTerminal.msixbundle'"
    if %errorlevel% equ 0 (
        echo [OK] Windows Terminal installed successfully!
    ) else (
        echo [ERR] Failed to install package. You may need to run as Administrator.
    )
) else (
    echo [ERR] Failed to download Windows Terminal bundle.
)

rd /s /q "%TMP_WT%" 2>nul
echo.
pause
`;
  }

  generateInstallPwshScript() {
    return `@echo off
setlocal enabledelayedexpansion
title Modern PowerShell 7 (pwsh.exe) Installer & Upgrader
cd /d "%~dp0"

echo ====================================================================
echo   [WIN] Modern PowerShell 7 (pwsh.exe) Automated Engine
echo ====================================================================
echo.

:: 1. Self-Elevation
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Requesting Administrator elevation...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~s0\"\"' -Verb RunAs"
    exit /b
)

:: Architecture Detection
set ARCH=x64
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set ARCH=arm64
echo [INFO] Detected Architecture: %ARCH%

:: 2. Version Inspection & Update
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Detected existing PowerShell 7 on system PATH.
    echo [*] Checking for updates via winget...
    where winget.exe >nul 2>nul
    if !errorlevel! equ 0 (
        winget upgrade --id Microsoft.PowerShell -e --silent --accept-source-agreements --accept-package-agreements
        if !errorlevel! equ 0 (
            echo [OK] PowerShell 7 updated or already at latest version.
        ) else (
            echo [INFO] Winget update check finished.
        )
        echo.
        pause
        exit /b 0
    )
)

:: 3. Multi-Tier Installation
set TMP_PWSH=%TEMP%\\pwsh_install_%RANDOM%
mkdir "%TMP_PWSH%" 2>nul

echo [*] Tier 1: Attempting installation via winget...
where winget.exe >nul 2>nul
if %errorlevel% equ 0 (
    winget install --id Microsoft.PowerShell -e --silent --accept-source-agreements --accept-package-agreements
    if !errorlevel! equ 0 goto :INSTALL_SUCCESS
    echo [WARN] Winget installation returned non-zero code. Trying Tier 2 (MSI)...
) else (
    echo [INFO] winget not detected. Proceeding to Tier 2 (MSI)...
)

echo [*] Tier 2: Downloading official PowerShell 7 MSI installer...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "try { " ^
  "  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/PowerShell/PowerShell/releases/latest'; " ^
  "  $asset = $release.assets | Where-Object { $_.name -like '*win-%ARCH%.msi' } | Select-Object -First 1; " ^
  "  $url = if ($asset) { $asset.browser_download_url } else { 'https://github.com/PowerShell/PowerShell/releases/latest/download/PowerShell-7.4.6-win-%ARCH%.msi' }; " ^
  "  Write-Host ('[*] Downloading MSI from ' + $url); " ^
  "  Invoke-WebRequest -Uri $url -OutFile '%TMP_PWSH%\\pwsh.msi' -UseBasicParsing; " ^
  "} catch { " ^
  "  Write-Host ('[WARN] MSI download failed: ' + $_.Exception.Message); " ^
  "}"

if exist "%TMP_PWSH%\\pwsh.msi" (
    echo [*] Installing PowerShell 7 silently with Explorer context menus...
    msiexec.exe /i "%TMP_PWSH%\\pwsh.msi" /qn /norestart ADD_EXPLORER_CONTEXT_MENU_OPENPOWERSHELL=1 ENABLE_PSREMOTING=1 REGISTER_MANIFEST=1
    if !errorlevel! equ 0 goto :INSTALL_SUCCESS
    echo [WARN] MSI installer returned code !errorlevel!. Proceeding to Tier 3 (Portable ZIP)...
)

echo [*] Tier 3: Portable ZIP fallback extraction...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "try { " ^
  "  $targetDir = Join-Path $env:ProgramFiles 'PowerShell\\7'; " ^
  "  if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }; " ^
  "  $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/PowerShell/PowerShell/releases/latest'; " ^
  "  $asset = $release.assets | Where-Object { $_.name -like '*win-%ARCH%.zip' } | Select-Object -First 1; " ^
  "  $url = if ($asset) { $asset.browser_download_url } else { 'https://github.com/PowerShell/PowerShell/releases/latest/download/PowerShell-7.4.6-win-%ARCH%.zip' }; " ^
  "  Write-Host ('[*] Downloading Portable ZIP: ' + $url); " ^
  "  $zipPath = '%TMP_PWSH%\\pwsh.zip'; " ^
  "  Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing; " ^
  "  Write-Host ('[*] Expanding archive to ' + $targetDir); " ^
  "  Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force; " ^
  "  $machinePath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::Machine); " ^
  "  if ($machinePath -notlike ('*' + $targetDir + '*')) { " ^
  "    Write-Host '[*] Registering PowerShell 7 directory in Machine System PATH...'; " ^
  "    [Environment]::SetEnvironmentVariable('Path', $machinePath + ';' + $targetDir, [EnvironmentVariableTarget]::Machine); " ^
  "  }; " ^
  "  Write-Host '[OK] Portable PowerShell 7 configured successfully.'; " ^
  "  exit 0; " ^
  "} catch { " ^
  "  Write-Host ('[ERR] Portable ZIP installation failed: ' + $_.Exception.Message); " ^
  "  exit 1; " ^
  "}"

:INSTALL_SUCCESS
where pwsh.exe >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] PowerShell 7 (pwsh.exe) installed successfully!
) else (
    echo [INFO] PowerShell 7 installed. Restart your terminal window to refresh PATH.
)

rd /s /q "%TMP_PWSH%" 2>nul
echo.
pause
`;
  }

  triggerWindowsLauncherDownload() {
    const bat = this.generateWindowsLauncherScript();
    this.triggerScriptDownload("launch-terminal.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerUbuntuLauncherDownload() {
    const sh = this.generateUbuntuLauncherScript();
    this.triggerScriptDownload("launch-terminal-ubuntu.sh", sh, "application/x-sh;charset=utf-8");
  }

  triggerLinuxLauncherDownload() {
    const sh = this.generateLinuxLauncherScript();
    this.triggerScriptDownload("launch-terminal-linux.sh", sh, "application/x-sh;charset=utf-8");
  }

  triggerInstallCiscoPktCompatibleDownload() {
    const bat = this.generateInstallCiscoPktCompatibleScript();
    this.triggerScriptDownload("install-cisco-pkt-compatible.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerInstallCiscoPktDownload() {
    const bat = this.generateInstallCiscoPktScript();
    this.triggerScriptDownload("install-cisco-pkt.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerInstallWingetDownload() {
    const bat = this.generateInstallWingetScript();
    this.triggerScriptDownload("install-winget.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerInstallWTDownload() {
    const bat = this.generateInstallWTScript();
    this.triggerScriptDownload("install-wt.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerInstallPwshDownload() {
    const bat = this.generateInstallPwshScript();
    this.triggerScriptDownload("install-pwsh.bat", bat, "application/x-bat;charset=utf-8");
  }

  triggerLocalLauncherDownload() {
    this.triggerWindowsLauncherDownload();
  }

  downloadBatchLauncher() {
    this.triggerWindowsLauncherDownload();
  }

  /**
   * Main command dispatcher
   */
  async handleCommand(cmd) {
    const raw = cmd.toLowerCase();
    
    // Print executed prompt line to history
    this.appendRaw(`${this.getPromptPrefix()}${cmd}\n`);

    // Verify 3-hour session validity before executing any command
    const activeSession = getCurrentSession();
    if (!activeSession) {
      this.logout("Session expired after 3 hours. Please sign in again.");
      return;
    }

    // Sign out command
    if (raw === "/logout") {
      this.logout("You have successfully signed out.");
      return;
    }

    // 1. Clear / Cls (Complete viewport scroll bug resolution)
    if (raw === "/clear" || raw === "/cls" || raw === "clear" || raw === "cls") {
      this.clearScreen();
      return;
    } 
    
    // 2. Built-in Administrative & Security Commands
    if (raw === "/users") {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        await this.renderUsersTable();
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw.startsWith("/reset-user-pwd")) {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        const parts = cmd.split(/\s+/);
        if (parts.length < 2 || !parts[1].trim()) {
          this.appendRaw("Usage: /reset-user-pwd <username>\nExample: /reset-user-pwd karthik10-dev\n\n");
        } else {
          const target = parts[1].trim();
          await deleteUserPasswordHash(target);
          this.appendRaw(`[OK] Password for '${target}' has been reset. They will be prompted to initialize on next login.\n\n`);
        }
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw.startsWith("/add-user")) {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        const parts = cmd.split(/\s+/);
        if (parts.length < 2 || !parts[1].trim()) {
          this.appendRaw("Usage: /add-user <username>\nExample: /add-user testuser-dev\n\n");
        } else {
          const target = parts[1].trim();
          addAuthorizedUser(target, "USER");
          this.appendRaw(`[OK] User '${target}' added to the authorized access list.\n\n`);
        }
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw.startsWith("/remove-user")) {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        const parts = cmd.split(/\s+/);
        if (parts.length < 2 || !parts[1].trim()) {
          this.appendRaw("Usage: /remove-user <username>\nExample: /remove-user starcloud-retro\n\n");
        } else {
          const target = parts[1].trim();
          await removeAuthorizedUser(target);
          this.appendRaw(`[OK] User '${target}' removed from the authorized access list and credentials purged.\n\n`);
        }
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw === "/sessions") {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        this.renderSessionsTable();
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw.startsWith("/terminate-user")) {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        const parts = cmd.split(/\s+/);
        if (parts.length < 2 || !parts[1].trim()) {
          this.appendRaw("Usage: /terminate-user <username>\nExample: /terminate-user saikrishna-dev-oss\n\n");
        } else {
          const target = parts[1].trim();
          await terminateAllSessionsForUser(target);
          this.appendRaw(`[OK] All active sessions for user '${target}' terminated remotely.\n\n`);
        }
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    } else if (raw.startsWith("/terminate")) {
      if (this.currentRole !== "ADMIN") {
        this.appendRaw("[!] Access denied: Administrative privileges required.\n\n");
      } else {
        const parts = cmd.split(/\s+/);
        if (parts.length < 2 || !parts[1].trim()) {
          this.appendRaw("Usage: /terminate <sessionId>\n\n");
        } else {
          const target = parts[1].trim();
          await terminateSession(target);
          this.appendRaw(`[OK] Session '${target}' terminated remotely.\n\n`);
        }
      }
      this.input.value = "";
      this.updateCaret();
      this.scrollBottom();
      return;
    }

    // 3. Built-in Slash Commands
    if (raw === "/re-fetch") {
      await this.executeRefetch();
    } else if (raw === "/cache") {
      this.renderCacheStatus();
    } else if (raw === "/help" || raw === "help") {
      this.renderHelp();
    } else if (raw.startsWith("/set-user")) {
      const parts = cmd.split(/\s+/);
      if (parts.length < 2 || !parts[1].trim()) {
        this.appendRaw("Usage: /set-user <username>\nExample: /set-user RAJ\n\n");
      } else {
        const newUser = parts.slice(1).join(" ").trim();
        localStorage.setItem("pwsh_terminal_username", newUser);
        this.userOrDevice = newUser;
        this.updatePromptDisplay();
        this.appendRaw(`[OK] Prompt username updated to: ${newUser}\nActive prompt path: ${this.getPromptPath()}\n\n`);
      }
    } else if (raw.startsWith("/set-drive")) {
      const parts = cmd.split(/\s+/);
      if (parts.length < 2 || !parts[1].trim()) {
        this.appendRaw("Usage: /set-drive <letter>\nExample: /set-drive C\n\n");
      } else {
        const driveLetter = parts[1].trim().replace(/[:\/\\]/g, "").toUpperCase();
        if (/^[A-Z]$/.test(driveLetter)) {
          localStorage.setItem("pwsh_terminal_drive", driveLetter);
          this.drive = driveLetter;
          this.updatePromptDisplay();
          this.appendRaw(`[OK] Prompt drive updated to: ${driveLetter}:\nActive prompt path: ${this.getPromptPath()}\n\n`);
        } else {
          this.appendRaw("[!] Invalid drive letter. Specify a single letter (e.g. C, D, E).\n\n");
        }
      }
    } else if (raw === "/reset-prompt") {
      const newDeviceId = generateDesktopId();
      localStorage.setItem("pwsh_terminal_device_id", newDeviceId);
      localStorage.removeItem("pwsh_terminal_username");
      localStorage.setItem("pwsh_terminal_drive", "D");
      this.drive = "D";
      this.userOrDevice = newDeviceId;
      this.updatePromptDisplay();
      this.appendRaw(
        `[OK] Prompt reset to newly generated device identifier: ${newDeviceId} (Drive D:)\n` +
        `Active prompt path: ${this.getPromptPath()}\n\n`
      );
    } else if (raw === "/serve") {
      this.promptServeOSAction();
      return;
    } else if (raw === "/install-cisco-pkt-compatible") {
      this.triggerInstallCiscoPktCompatibleDownload();
      this.appendRaw(
        `[OK] Generated and initiated download for 'install-cisco-pkt-compatible.bat'.\n` +
        `This script aligns Cisco Packet Tracer to the repository lab version (${COMPATIBLE_PKT_VERSION}).\n` +
        `It scans registry keys, silently uninstalls mismatched versions (older or newer),\n` +
        `and deploys the pinned build via winget, choco, or direct verified fallback.\n\n`
      );
    } else if (raw === "/install-cisco-pkt") {
      this.triggerInstallCiscoPktDownload();
      this.appendRaw(
        `[OK] Generated and initiated download for 'install-cisco-pkt.bat'.\n` +
        `This script deploys the latest available Cisco Packet Tracer release,\n` +
        `removing legacy versions silently before updating via winget or chocolatey.\n\n`
      );
    } else if (raw === "/install-winget") {
      this.triggerInstallWingetDownload();
      this.appendRaw(
        `[OK] Generated and initiated download for 'install-winget.bat'.\n` +
        `This script elevates to Administrator and installs or updates Windows Package Manager (winget)\n` +
        `with automated AppXSvc activation, VCLibs/UI.Xaml prerequisites, and DISM provisioning fallback.\n\n`
      );
    } else if (raw === "/install-wt") {
      this.triggerInstallWTDownload();
      this.appendRaw(
        `[OK] Generated and initiated download for 'install-wt.bat'.\n` +
        `This script installs the modern Windows Terminal (wt.exe) using winget\n` +
        `or downloads the official MSIX bundle from Microsoft's terminal repository.\n\n`
      );
    } else if (raw === "/install-pwsh") {
      this.triggerInstallPwshDownload();
      this.appendRaw(
        `[OK] Generated and initiated download for 'install-pwsh.bat'.\n` +
        `This script auto-detects architecture and executes a 3-tier installation/update of PowerShell 7\n` +
        `(winget -> silent MSI with Explorer context menus -> Portable ZIP with Machine PATH registration).\n\n`
      );
    } 
    // 3. Standard PowerShell native cmdlets & utilities
    else if (/^(cd|chdir|set-location)(?:\s+|$)/i.test(cmd.trim())) {
      const match = cmd.trim().match(/^(cd|chdir|set-location)(?:\s+(.*))?$/i);
      const target = match && match[2] ? match[2].trim() : "";
      this.executeCd(target);
    } else if (/^(ls|dir|get-childitem)(?:\s+|$)/i.test(cmd.trim())) {
      const match = cmd.trim().match(/^(ls|dir|get-childitem)(?:\s+(.*))?$/i);
      const targetFolder = match && match[2] ? match[2].trim() : "";
      this.renderDirectoryListing(targetFolder);
    } else if (/^(pwd|get-location)$/i.test(cmd.trim())) {
      this.executePwd();
    } else if (/^(cat|type|get-content)(?:\s+|$)/i.test(cmd.trim())) {
      const match = cmd.trim().match(/^(cat|type|get-content)(?:\s+(.*))?$/i);
      const target = match && match[2] ? match[2].trim() : "";
      await this.executeCat(target);
    } else if (raw === "repo" || raw === "info" || raw === "status") {
      this.renderRepoInfo();
    } else if (cmd.startsWith("@")) {
      const q = cmd.slice(1).trim().toLowerCase();
      this.currentQuery = q;
      const match = this.items.find(f => f.path.toLowerCase().includes(q));
      if (match) {
        this.selectedItem = match;
        this.promptItemAction(match);
      } else {
        this.appendRaw(`No repository files found matching '@${q}'.\n\n`);
      }
    } else if (cmd.startsWith("$")) {
      this.showGrepWarning();
    } else if (cmd.length > 0) {
      this.appendRaw(
        `${cmd} : The term '${cmd}' is not recognized as the name of a cmdlet, function, script file, or operable program.\n` +
        `Type @<keyword> to search repository files, or /help for guidance.\n\n`
      );
    }

    this.input.value = "";
    this.updateCaret();
    this.scrollBottom();
  }

  /**
   * Refetch action respecting 6x quota
   */
  async executeRefetch() {
    this.appendRaw("[*] Contacting GitHub API to refetch repository tree...\n");
    try {
      const res = await refetchRepositoryIndex();
      this.items = res.items;
      this.indexer.files = this.items;
      this.fileMap = new Map();
      this.items.forEach(i => this.fileMap.set(i.path, i));

      this.updateStatus();
      this.appendRaw(
        `[OK] Refetch successful! Indexed ${res.items.length.toLocaleString()} items from GitHub.\n` +
        `[i] Session refetches used: ${res.refetchesUsed}/6 (Remaining in this session: ${res.remainingQuota})\n` +
        `[i] Cache updated in localStorage (24-hour TTL active).\n\n`
      );
    } catch (err) {
      this.appendRaw(`${err.message}\n\n`);
    }
  }

  async renderUsersTable() {
    const whitelist = getAuthorizedWhitelist();
    const presenceMap = getCachedPresenceMap();
    let html = `
      <div style="margin: 6px 0 12px 0; font-family: var(--font-mono); line-height: 1.6;">
        <span class="ps-header">Authorized Access List &amp; Security Roles</span><br><br>
        <table style="border-collapse: collapse; width: 100%; max-width: 720px; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #333333; text-align: left; color: #16c60c;">
              <th style="padding: 4px 12px 4px 0;">USERNAME</th>
              <th style="padding: 4px 12px;">ROLE</th>
              <th style="padding: 4px 12px;">PASSWORD STATUS</th>
              <th style="padding: 4px 12px;">LAST ACTIVE</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const [userHandle, userMeta] of Object.entries(whitelist)) {
      const role = userMeta.role || "USER";
      const displayUser = userHandle;
      const hash = await getUserPasswordHash(userHandle);
      const pwdStatus = hash ? `<span style="color:#16c60c;">CONFIGURED</span>` : `<span style="color:#e5c07b;">PENDING</span>`;

      let activeStatus = `<span style="color:#777777;">Offline</span>`;
      for (const s of Object.values(presenceMap || {})) {
        if (s.user && s.user.toLowerCase() === userHandle.toLowerCase()) {
          activeStatus = s.status === "active" ? `<span style="color:#16c60c;">Active (Live)</span>` : `<span style="color:#e5c07b;">Idle</span>`;
          break;
        }
      }

      html += `
        <tr style="border-bottom: 1px solid #1c1c1c;">
          <td style="padding: 4px 12px 4px 0; color: #cccccc;">${displayUser}</td>
          <td style="padding: 4px 12px; color: ${role === 'ADMIN' ? '#4ec9b0' : '#888888'}; font-weight: ${role === 'ADMIN' ? 'bold' : 'normal'};">${role}</td>
          <td style="padding: 4px 12px;">${pwdStatus}</td>
          <td style="padding: 4px 12px;">${activeStatus}</td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
    this.appendHTML(html);
  }

  renderSessionsTable() {
    const presenceMap = getCachedPresenceMap();
    const entries = Object.entries(presenceMap || {});
    let html = `
      <div style="margin: 6px 0 12px 0; font-family: var(--font-mono); line-height: 1.6;">
        <span class="ps-header">Active Real-Time Presence Sessions (${entries.length})</span><br><br>
        <table style="border-collapse: collapse; width: 100%; max-width: 720px; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #333333; text-align: left; color: #16c60c;">
              <th style="padding: 4px 12px 4px 0;">SESSION ID</th>
              <th style="padding: 4px 12px;">IDENTITY</th>
              <th style="padding: 4px 12px;">DEVICE</th>
              <th style="padding: 4px 12px;">STATE</th>
              <th style="padding: 4px 12px;">TYPE</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const [sid, sess] of entries) {
      const rawUser = sess.user || "anonymous";
      const isAdmin = rawUser.toLowerCase() === "rajghosh06-dev";
      const displayUser = rawUser;
      const device = sess.device || (sid ? sid.slice(-8) : "Session");
      const isAnonymous = rawUser.startsWith("anonymous-");
      const userType = isAdmin ? `<span style="color:#4ec9b0; font-weight:bold;">Admin</span>` : (isAnonymous ? `<span style="color:#888888;">Visitor</span>` : `<span style="color:#cccccc;">User</span>`);
      const statusDot = sess.status === "active" ? `<span style="color:#16c60c;">[●] Active</span>` : `<span style="color:#e5c07b;">[●] Idle</span>`;

      html += `
        <tr style="border-bottom: 1px solid #1c1c1c;">
          <td style="padding: 4px 12px 4px 0; color: #888888; font-size: 11px;">${sid.slice(-10)}</td>
          <td style="padding: 4px 12px; color: #ffffff;">${displayUser}</td>
          <td style="padding: 4px 12px; color: #aaaaaa; font-size: 11px;">${device}</td>
          <td style="padding: 4px 12px;">${statusDot}</td>
          <td style="padding: 4px 12px;">${userType}</td>
        </tr>
      `;
    }

    html += `</tbody></table></div>`;
    this.appendHTML(html);
  }

  /**
   * Renders the /cache status report
   */
  renderCacheStatus() {
    const s = getCacheStatus();
    const quotaColor = s.refetchesUsed >= s.maxRefetches ? "#e81123" : "#4ec9b0";

    this.appendHTML(`
      <div style="margin: 6px 0 12px 0; font-family: var(--font-mono); line-height: 1.6;">
        <span class="ps-header">GitHub Repository Indexer - Cache Report</span><br>
        ------------------------------------------------------------------------<br>
        &nbsp;&nbsp;Repository Scope  : <span style="color:#ffffff;">${REPO_CONFIG.repo} (${REPO_CONFIG.branch})</span><br>
        &nbsp;&nbsp;Storage Engine    : <span style="color:#3b8eea;">localStorage (Persistent 24-Hour TTL)</span><br>
        &nbsp;&nbsp;Cached Item Count : <span style="color:#ffe082;">${s.itemCount.toLocaleString()} files & directories</span><br>
        &nbsp;&nbsp;Cache Timestamp   : <span style="color:#cccccc;">${s.formattedDate}</span><br>
        &nbsp;&nbsp;Cache Age         : <span style="color:#cccccc;">${s.ageFormatted}</span><br>
        &nbsp;&nbsp;TTL Remaining     : <span style="color:${s.isExpired ? '#e81123' : '#16c60c'};">${s.ttlRemainingFormatted}</span><br>
        &nbsp;&nbsp;Session Refetches : <span style="color:${quotaColor}; font-weight:bold;">${s.refetchesUsed}/${s.maxRefetches} used</span> (${s.refetchQuotaRemaining} remaining in this session)<br>
        ------------------------------------------------------------------------<br>
      </div>
    `);
  }

  /**
   * Renders comprehensive help guide with pure ASCII tags
   */
  renderHelp() {
    this.appendHTML(`
      <div style="margin-bottom: 12px; line-height: 1.55;">
        <span style="color: #ffffff; font-weight: bold;">PowerShell 7.6.9 - Repository Explorer</span><br>
        <span style="color: #888888;">Repository: ${REPO_CONFIG.repo}</span><br><br>
        
        <span class="ps-header">1. File & Folder Indexing ('@'):</span><br>
        &nbsp;&nbsp;<span style="color: #ffe082;">@&lt;query&gt;</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Search files & folders in real-time (e.g. <span style="color:#569cd6;">@cypher</span>, <span style="color:#569cd6;">@queue</span>)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;4-line compact menu. Navigable with up/down arrows, Enter to select, Esc to close.<br><br>

        <span class="ps-header">2. In-File Grep Guard ('$'):</span><br>
        &nbsp;&nbsp;<span style="color: #ff8585;">$&lt;pattern&gt;</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Trigger direct clone into .\\tmp\\txt-idx for deep offline text indexing.<br><br>

        <span class="ps-header">3. Built-in Slash Commands ('/'):</span><br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/clear</span>, <span style="color: #4ec9b0;">/cls</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Clears terminal history screen and resets viewport scroll<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/re-fetch</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Invalidates cache &amp; refetches tree (6x session quota)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/cache</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Prints cache status, TTL countdown, and quota remaining<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/help</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Displays this reference guide<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/set-user &lt;name&gt;</span>&nbsp;&nbsp;Changes prompt username directory (saved to localStorage)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/set-drive &lt;ltr&gt;</span>&nbsp;&nbsp;Changes prompt drive letter (e.g. /set-drive C)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/reset-prompt</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Resets prompt back to newly generated DESKTOP-XXXXXXX on D:<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/serve</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Interactive multi-OS standalone launcher menu (Win/Ubuntu/Linux)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/install-cisco-pkt-compatible</span>&nbsp;&nbsp;Aligns Cisco Packet Tracer to repo lab version (${COMPATIBLE_PKT_VERSION})<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/install-cisco-pkt</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Installs/updates Cisco Packet Tracer to latest release<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/install-winget</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hardened installer/upgrader for Windows Package Manager<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/install-wt</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Installs modern Windows Terminal (wt.exe)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/install-pwsh</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Hardened 3-tier installer/upgrader for PowerShell 7<br><br>

        <span class="ps-header">4. Administrative &amp; Security Commands:</span><br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/users</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;List authorized access roster and credentials status (Admin)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/reset-user-pwd &lt;user&gt;</span>&nbsp;&nbsp;Purge user password and force re-initialization (Admin)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/add-user &lt;user&gt;</span>&nbsp;&nbsp;&nbsp;Add new handle to authorized access list (Admin)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/remove-user &lt;user&gt;</span>&nbsp;Remove user from access list and wipe credentials (Admin)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/sessions</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Inspect active multi-device presence sessions (Admin)<br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">/logout</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Sign out of the current terminal session<br><br>

        <span class="ps-header">5. Standard PowerShell Commands:</span><br>
        &nbsp;&nbsp;<span style="color: #ffe082;">cd &lt;dir&gt;</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change directory (e.g. <span style="color:#569cd6;">cd '3rd-Year'</span>, <span style="color:#569cd6;">cd ..</span>, <span style="color:#569cd6;">cd ...</span>, <span style="color:#569cd6;">cd ~</span>)<br>
        &nbsp;&nbsp;<span style="color: #ffe082;">pwd</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Print current virtual directory path<br>
        &nbsp;&nbsp;<span style="color: #ffe082;">ls / dir</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;List current directory contents with authentic styling<br>
        &nbsp;&nbsp;<span style="color: #ffe082;">ls &lt;folder&gt;</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;List contents of folder (e.g. <span style="color:#569cd6;">ls 1st-Year</span>)<br>
        &nbsp;&nbsp;<span style="color: #ffe082;">cat &lt;file&gt;</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Display file contents directly in terminal<br>
        &nbsp;&nbsp;<span style="color: #ffe082;">repo / info</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Display repository metadata and branch information<br><br>

        <span class="ps-header">6. Context-Aware Item Actions:</span><br>
        &nbsp;&nbsp;<span style="color: #4ec9b0;">[DIR]</span>&nbsp;&nbsp;[<span class="key-badge">1</span>] View on GitHub (tree) | [<span class="key-badge">2</span>] Browse in Terminal | [<span class="key-badge">3</span>] Copy Path | [<span class="key-badge">ESC</span>] Cancel<br>
        &nbsp;&nbsp;<span style="color: #e5c07b;">[FILE]</span> [<span class="key-badge">1</span>] View on GitHub (blob) | [<span class="key-badge">2</span>] View Raw | [<span class="key-badge">3</span>] Copy Content | [<span class="key-badge">4</span>] Download | [<span class="key-badge">ESC</span>] Cancel<br><br>

        <span class="ps-header">7. Shortcuts:</span><br>
        &nbsp;&nbsp;<span style="color: #ffffff;">Up / Down</span> : Navigate suggestions / command history &nbsp;•&nbsp; <span style="color: #ffffff;">Enter</span> : Select &nbsp;•&nbsp; <span style="color: #ffffff;">Tab</span> : Autocomplete &nbsp;•&nbsp; <span style="color: #ffffff;">Ctrl+L</span> : Clear<br><br>
      </div>
    `);
  }

  renderRepoInfo() {
    const s = getCacheStatus();
    this.appendHTML(`
      <div style="margin: 6px 0 12px 0; line-height: 1.6;">
        <span class="ps-header">Repository Metadata:</span><br>
        &nbsp;&nbsp;Repository   : <span style="color:#ffffff;">${REPO_CONFIG.repo}</span><br>
        &nbsp;&nbsp;Active Branch: <span style="color:#4ec9b0;">${REPO_CONFIG.branch}</span><br>
        &nbsp;&nbsp;Total Indexed: <span style="color:#ffe082;">${this.items.length.toLocaleString()} items (files & directories)</span><br>
        &nbsp;&nbsp;Cache Engine : <span style="color:#16c60c;">localStorage 24h TTL (${s.ageFormatted})</span><br>
        &nbsp;&nbsp;Refetches    : <span style="color:#4ec9b0;">${s.refetchesUsed}/6 used this session</span><br>
        &nbsp;&nbsp;Status       : <span style="color:#16c60c;">Online</span><br><br>
      </div>
    `);
  }

  escapeHTML(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  resolvePath(targetPath) {
    if (!targetPath && targetPath !== "") return this.cwd;
    let clean = (targetPath || "").trim().replace(/^['"]+|['"]+$/g, "").replace(/\\/g, "/");

    // Root navigations: cd \, cd /, cd ~, cd ..., or empty
    if (clean === "" || clean === "~" || clean === "/" || clean === "\\" || clean === "...") {
      return "";
    }

    // Strip leading drive or repo root if passed e.g. D:/DESKTOP-XXXXXXX/Programming-Related/...
    let isFromRoot = false;
    const repoMatch = clean.match(/Programming-Related\/?(.*)$/i);
    if (repoMatch) {
      clean = repoMatch[1];
      isFromRoot = true;
    }

    // If starts with / or ~ or ..., treat as from root
    if (clean.startsWith("/")) {
      isFromRoot = true;
      clean = clean.replace(/^\/+/, "");
    } else if (clean.startsWith("~/")) {
      isFromRoot = true;
      clean = clean.slice(2);
    } else if (clean.startsWith(".../")) {
      isFromRoot = true;
      clean = clean.slice(4);
    }

    if (clean === "" || clean === "...") {
      return "";
    }

    let parts = (isFromRoot || !this.cwd) ? [] : this.cwd.split("/");
    const segments = clean.split("/").map(s => s.replace(/^['"]+|['"]+$/g, "")).filter(s => s.length > 0 && s !== ".");

    for (const seg of segments) {
      if (seg === "..") {
        if (parts.length > 0) {
          parts.pop();
        }
      } else if (seg === "...") {
        parts = [];
      } else {
        parts.push(seg);
      }
    }

    return parts.join("/");
  }

  isDirectory(targetPath) {
    if (!targetPath || targetPath === "") return true; // root is always a directory
    const norm = targetPath.toLowerCase().replace(/^\/+|\/+$/g, "");
    
    // Check if directly indexed as tree/dir
    const exact = this.items.find(i => i.path.toLowerCase() === norm);
    if (exact && (exact.type === "tree" || exact.type === "dir")) return true;

    // Check if any indexed item starts with norm + "/"
    const hasChildren = this.items.some(i => i.path.toLowerCase().startsWith(norm + "/"));
    return hasChildren;
  }

  isFile(targetPath) {
    if (!targetPath || targetPath === "") return false;
    const norm = targetPath.toLowerCase().replace(/^\/+|\/+$/g, "");
    const exact = this.items.find(i => i.path.toLowerCase() === norm);
    if (exact && exact.type !== "tree" && exact.type !== "dir") return true;
    return false;
  }

  getImmediateChildren(dir = this.cwd) {
    const normDir = (dir || "").replace(/^\/+|\/+$/g, "");
    const prefix = normDir ? normDir.toLowerCase() + "/" : "";
    const childrenMap = new Map();

    for (const item of this.items) {
      const itemPath = item.path;
      const lowerPath = itemPath.toLowerCase();

      if (normDir === "") {
        const slashIdx = itemPath.indexOf("/");
        if (slashIdx === -1) {
          // Direct item at root
          const isDir = item.type === "tree" || item.type === "dir";
          childrenMap.set(lowerPath, {
            name: itemPath,
            isDir: isDir,
            mode: isDir ? "da---" : "-a---",
            date: "31-10-2026  09:00 AM",
            length: isDir ? "" : (item.size ? item.size.toString() : "0"),
            item: item
          });
        } else {
          // Nested item, top level is directory
          const dirName = itemPath.slice(0, slashIdx);
          const lowerDir = dirName.toLowerCase();
          if (!childrenMap.has(lowerDir)) {
            childrenMap.set(lowerDir, {
              name: dirName,
              isDir: true,
              mode: "da---",
              date: "31-10-2026  09:00 AM",
              length: "",
              item: null
            });
          }
        }
      } else {
        if (lowerPath === normDir.toLowerCase() && (item.type === "tree" || item.type === "dir")) {
          continue;
        }
        if (lowerPath.startsWith(prefix)) {
          const rest = itemPath.slice(prefix.length);
          const slashIdx = rest.indexOf("/");
          if (slashIdx === -1) {
            const isDir = item.type === "tree" || item.type === "dir";
            const lowerChild = rest.toLowerCase();
            childrenMap.set(lowerChild, {
              name: rest,
              isDir: isDir,
              mode: isDir ? "da---" : "-a---",
              date: "31-10-2026  09:00 AM",
              length: isDir ? "" : (item.size ? item.size.toString() : "0"),
              item: item
            });
          } else {
            const subDirName = rest.slice(0, slashIdx);
            const lowerSubDir = subDirName.toLowerCase();
            if (!childrenMap.has(lowerSubDir)) {
              childrenMap.set(lowerSubDir, {
                name: subDirName,
                isDir: true,
                mode: "da---",
                date: "31-10-2026  09:00 AM",
                length: "",
                item: null
              });
            }
          }
        }
      }
    }

    return Array.from(childrenMap.values()).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }

  handleCd(target) {
    const rawTarget = (target || "").trim();
    const cleanTarget = rawTarget.replace(/^['"]+|['"]+$/g, "").trim();

    if (!cleanTarget || cleanTarget === "~" || cleanTarget === "/" || cleanTarget === "\\" || cleanTarget === "...") {
      this.cwd = "";
      this.updatePromptDisplay();
      return;
    }

    const resolved = this.resolvePath(cleanTarget);

    if (this.isDirectory(resolved)) {
      this.cwd = resolved;
      this.updatePromptDisplay();
    } else {
      const displayTarget = cleanTarget.replace(/\//g, "\\");
      let fullDisplayPath;
      if (/^[A-Za-z]:\\/.test(displayTarget)) {
        fullDisplayPath = displayTarget;
      } else if (this.cwd) {
        fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${this.cwd.replace(/\//g, '\\')}\\${displayTarget}`;
      } else {
        fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${displayTarget}`;
      }
      this.appendRaw(`Set-Location : Cannot find path '${fullDisplayPath}' because it does not exist.\n\n`);
    }
  }

  executeCd(target) {
    return this.handleCd(target);
  }

  executePwd() {
    const fullPath = this.getPromptPath();
    this.appendHTML(`
      <div style="margin: 4px 0 10px 0; font-family: var(--font-mono); line-height: 1.5;">
        <span class="ps-header">Path</span><br>
        <span class="ps-header">----</span><br>
        <span style="color: #ffffff;">${fullPath}</span>
      </div>
      <br>
    `);
  }

  async executeCat(target) {
    const rawTarget = (target || "").trim();
    if (!rawTarget) {
      this.appendRaw("Usage: cat <filename>\n\n");
      return;
    }

    const cleanTarget = rawTarget.replace(/^['"]+|['"]+$/g, "").trim();
    const resolved = this.resolvePath(cleanTarget);

    // If target is directory
    if (this.isDirectory(resolved)) {
      this.appendRaw(`Get-Content : Cannot read '${cleanTarget}' because it is a directory.\n\n`);
      return;
    }

    // Check if target file exists in repository
    if (!this.isFile(resolved)) {
      const displayTarget = cleanTarget.replace(/\//g, "\\");
      let fullDisplayPath;
      if (/^[A-Za-z]:\\/.test(displayTarget)) {
        fullDisplayPath = displayTarget;
      } else if (this.cwd) {
        fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${this.cwd.replace(/\//g, '\\')}\\${displayTarget}`;
      } else {
        fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${displayTarget}`;
      }
      this.appendRaw(`Get-Content : Cannot find path '${fullDisplayPath}' because it does not exist.\n\n`);
      return;
    }

    // Check binary extensions
    const ext = resolved.split('.').pop().toLowerCase();
    const binaryExts = new Set([
      'pkt', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 
      'gz', '7z', 'exe', 'bin', 'iso', 'dll', 'mp4', 'mp3', 'docx', 'xlsx', 'pptx'
    ]);
    if (binaryExts.has(ext)) {
      this.appendRaw(
        `[WARN] Binary file detected: '${cleanTarget}'. Terminal streaming suppressed.\n` +
        `Use '@${cleanTarget}' to download or inspect in GitHub.\n\n`
      );
      return;
    }

    // Stream text content
    try {
      let content = null;

      // Primary: GitHub Raw stream
      try {
        const rawUrl = `https://raw.githubusercontent.com/rajghosh06-dev/Programming-Related/main/${encodeURI(resolved)}`;
        const res = await fetch(rawUrl);
        if (res.ok) {
          content = await res.text();
        }
      } catch (e) {}

      // Fallback: local file if offline or hosted locally
      if (content === null) {
        try {
          const localRes = await fetch(`./${encodeURI(resolved)}`);
          if (localRes.ok) {
            content = await localRes.text();
          }
        } catch (e) {}
      }

      if (content !== null) {
        this.appendHTML(`
          <div class="cat-output" style="margin: 6px 0 12px 0; font-family: var(--font-mono); font-size: 13px; line-height: 1.45; white-space: pre-wrap; word-break: break-all; color: #cccccc;">${this.escapeHTML(content)}</div>
        `);
      } else {
        this.appendRaw(`[ERR] Failed to load content for '${cleanTarget}'. Network or repository resource unavailable.\n\n`);
      }
    } catch (err) {
      this.appendRaw(`[ERR] Could not read file '${cleanTarget}': ${err.message}\n\n`);
    }
  }

  async previewFileContent(filePath) {
    return this.executeCat(filePath);
  }

  runLs(dir = this.cwd) {
    return this.renderDirectoryListing(dir);
  }

  /**
   * Renders PowerShell 'ls' or 'dir' listing with dynamic prompt path
   */
  renderDirectoryListing(subFolder = "") {
    let targetDir = this.cwd;
    if (subFolder && subFolder.trim().length > 0 && subFolder !== this.cwd) {
      const cleanSub = subFolder.replace(/^['"]+|['"]+$/g, "").trim();
      targetDir = this.resolvePath(cleanSub);
      if (!this.isDirectory(targetDir)) {
        const displayTarget = cleanSub.replace(/\//g, "\\");
        let fullDisplayPath;
        if (/^[A-Za-z]:\\/.test(displayTarget)) {
          fullDisplayPath = displayTarget;
        } else if (this.cwd) {
          fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${this.cwd.replace(/\//g, '\\')}\\${displayTarget}`;
        } else {
          fullDisplayPath = `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${displayTarget}`;
        }
        this.appendRaw(`Get-ChildItem : Cannot find path '${fullDisplayPath}' because it does not exist.\n\n`);
        return;
      }
    }

    const dirPath = targetDir
      ? `${this.drive}:\\${this.userOrDevice}\\Programming-Related\\${targetDir.replace(/\//g, '\\')}`
      : `${this.drive}:\\${this.userOrDevice}\\Programming-Related`;

    const entries = this.getImmediateChildren(targetDir);

    // Build authentic HTML directory listing with green headers (#16C60C) and blue directory background (#005FB8)
    let rowsHtml = "";
    entries.forEach(entry => {
      const modeCol = entry.mode.padEnd(7, " ");
      const dateCol = entry.date.padEnd(22, " ");
      const lengthCol = (entry.length || "").padStart(14, " ");
      const nameHtml = entry.isDir
        ? `<span class="ps-dir badge-folder">${entry.name}</span>`
        : `<span class="ps-file">${entry.name}</span>`;

      rowsHtml += `<div class="ps-row">${modeCol}${dateCol}${lengthCol} ${nameHtml}</div>`;
    });

    const listingHtml = `
      <div class="ps-listing">
        <div class="ps-dir-path">&nbsp;&nbsp;&nbsp;&nbsp;Directory: ${dirPath}</div>
        <div class="ps-header">Mode&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;LastWriteTime&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Length Name</div>
        <div class="ps-header">----&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-------------&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;------ ----</div>
        ${rowsHtml}
      </div>
      <br>
    `;

    this.appendHTML(listingHtml);
  }

  resetPrompt(statusMessage = "") {
    if (statusMessage) {
      this.appendRaw(`${this.getPromptPrefix()}${this.input.value}\n${statusMessage}\n\n`);
    }
    this.input.value = "";
    this.actions.style.display = "none";
    this.actions.innerHTML = "";
    this.hideSuggestions();
    this.hideGrepWarning();
    this.mode = "INPUT";
    this.actionMode = null;
    this.activeItem = null;
    this.updatePromptDisplay();
    this.input.focus();
    this.updateCaret();
    this.scrollBottom();
  }
}
