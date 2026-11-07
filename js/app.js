import { 
  getRepositoryIndex, 
  getOfflineFallback, 
  loadCachedIndex, 
  getCacheStatus, 
  REPO_CONFIG 
} from './api.js';
import { Terminal } from './terminal.js';

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
    statusIndicator: document.getElementById("statusIndicator")
  };

  // Keep terminal clicked to focus input
  elements.viewport.addEventListener("click", (e) => {
    if (!e.target.closest(".action-btn") && 
        !e.target.closest("a") && 
        !e.target.closest(".suggestion-item") &&
        !e.target.closest(".clone-cmd")) {
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
        window.__pwshTerminal.clearScreen();
      } else {
        elements.output.innerHTML = "";
        const banner = document.createElement("div");
        banner.className = "terminal-boot-header";
        banner.textContent = "PowerShell 7.6.9\n\n";
        elements.output.appendChild(banner);
        elements.input.value = "";
        elements.viewport.scrollTop = 0;
        elements.input.focus();
      }
    }
  });

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
      elements.statusText.textContent = `Connected: ${REPO_CONFIG.owner}/${REPO_CONFIG.repo} [${cacheStatus.refetchesUsed}/6 refetches]`;
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

    // Authentic PowerShell warning
    terminalInstance.appendRaw(
      `[!] Warning: ${error.message}\n` +
      `Continuing in offline fallback mode with pre-indexed repository files.\n\n`
    );
  }

  // Ensure autofocus
  setTimeout(() => {
    elements.input.focus();
  }, 100);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
