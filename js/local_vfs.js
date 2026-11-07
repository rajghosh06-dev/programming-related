/**
 * Offline File System Access API Engine for Programming-Related
 * Provides local repository mounting, integrity verification via .repo-id,
 * 100% offline text crawling (deep grep), and local file reading.
 */

const DB_NAME = "pr_local_vfs_db";
const DB_VERSION = 1;
const STORE_NAME = "vfs_handles";
const ROOT_KEY = "root_dir_handle";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "tmp",
  ".vscode",
  ".idea",
  "dist",
  "build",
  "target",
  ".system_generated"
]);

export const ALLOWED_EXTENSIONS = [
  '.c', '.cpp', '.h', '.hpp',
  '.java', '.py',
  '.r', '.rmd',
  '.html', '.css', '.js', '.json',
  '.md', '.txt', '.sql', '.xml', '.csv',
  '.bat', '.ps1', '.sh'
];

/**
 * Open IndexedDB store for caching directory handles across reloads
 */
function openVfsDb() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      return resolve(null);
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => resolve(null);
  });
}

/**
 * Save handle reference in IndexedDB
 */
export async function saveStoredHandle(handle) {
  try {
    const db = await openVfsDb();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(handle, ROOT_KEY);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        tx.onerror = (e) => {
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          resolve(false);
        };
      } catch (err) {
        resolve(false);
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Retrieve cached handle reference from IndexedDB
 */
export async function getStoredHandle() {
  try {
    const db = await openVfsDb();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ROOT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Remove cached handle reference from IndexedDB
 */
export async function clearStoredHandle() {
  try {
    const db = await openVfsDb();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(ROOT_KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (e) {}
}

/**
 * Validates repository identity:
 * 1. Checks if .repo-id exists in root and contains signature 'pr-win11-vfs-token'
 * 2. Fallback: verifies at least two of ["1st-Year", "2nd-Year", "3rd-Year"] exist
 */
export async function validateRepositoryHandle(dirHandle) {
  if (!dirHandle) {
    throw new Error("Invalid directory handle.");
  }

  // 1. Primary verification: .repo-id verification marker
  try {
    const repoFileHandle = await dirHandle.getFileHandle(".repo-id");
    const file = await repoFileHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    if (data && data.signature === "pr-win11-vfs-token") {
      return {
        valid: true,
        repository: data.repository || "rajghosh06-dev/Programming-Related"
      };
    }
  } catch (e) {
    // Proceed to fallback
  }

  // 2. Fallback verification: Check academic coursework directories
  let matches = 0;
  for (const year of ["1st-Year", "2nd-Year", "3rd-Year"]) {
    try {
      await dirHandle.getDirectoryHandle(year);
      matches++;
    } catch (e) {}
  }

  if (matches >= 2) {
    return {
      valid: true,
      repository: "rajghosh06-dev/Programming-Related"
    };
  }

  throw new Error("Selected folder does not match 'Programming-Related' repository.");
}

/**
 * Updates status bar badge (#localVfsBadge)
 */
export function updateLocalVfsBadge(isMounted, repoName = "Programming-Related") {
  const badge = document.getElementById("localVfsBadge");
  if (!badge) return;

  if (isMounted) {
    badge.className = "status-item local-vfs-badge mounted";
    badge.title = `Mounted: ${repoName}`;
    badge.innerHTML = `<span class="vfs-status-dot mounted"></span> Local VFS: Mounted`;
  } else {
    badge.className = "status-item local-vfs-badge";
    badge.title = "Local VFS: Disconnected (Click or enter $ to attach local folder)";
    badge.innerHTML = `<span class="vfs-status-dot"></span> Local VFS: Disconnected`;
  }
}

/**
 * Mount local directory using File System Access API
 * @param {FileSystemDirectoryHandle} [customHandle] - Optional handle for testing or pre-selected folders
 */
export async function mountLocalDirectory(customHandle = null) {
  let dirHandle = customHandle;
  if (!dirHandle) {
    if (typeof window.showDirectoryPicker !== "function") {
      throw new Error("File System Access API is not supported in this browser.");
    }
    dirHandle = await window.showDirectoryPicker({ mode: "read" });
  }

  const validation = await validateRepositoryHandle(dirHandle);
  window.__localVfsHandle = dirHandle;
  try {
    await saveStoredHandle(dirHandle);
  } catch (e) {}
  updateLocalVfsBadge(true, validation.repository);

  return {
    handle: dirHandle,
    repository: validation.repository
  };
}

/**
 * Safely detaches the local filesystem directory handle, clears persistent IndexedDB records,
 * and updates the status ribbon badge to disconnected.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unmountLocalDirectory() {
  if (!window.__localVfsHandle) {
    return { success: false, message: "Local VFS is not currently mounted." };
  }

  window.__localVfsHandle = null;

  // Purge handle from IndexedDB
  try {
    await clearStoredHandle();
  } catch (err) {
    console.warn("Failed to clear local VFS from IndexedDB:", err);
  }

  // Reset status bar badge to disconnected
  updateLocalVfsBadge(false);

  return {
    success: true,
    message: "Local VFS directory unmounted successfully."
  };
}

/**
 * Initialize Local VFS on startup (restore from cache if permission granted)
 */
export async function initLocalVfs() {
  try {
    const handle = await getStoredHandle();
    if (handle) {
      let perm = "prompt";
      if (typeof handle.queryPermission === "function") {
        perm = await handle.queryPermission({ mode: "read" });
      }
      if (perm === "granted") {
        const validation = await validateRepositoryHandle(handle);
        window.__localVfsHandle = handle;
        updateLocalVfsBadge(true, validation.repository);
        return handle;
      }
    }
  } catch (e) {
    console.debug("[VFS] Handle auto-restore skipped:", e);
  }

  updateLocalVfsBadge(false);
  return null;
}

/**
 * 100% Offline Deep Grep Crawler
 * Crawls directory handle without any network or GitHub requests.
 * @param {string} pattern - Search string
 * @param {object} [options]
 * @returns {Promise<Array<{path: string, filename: string, lineNum: number, lineText: string, fileHandle: FileSystemFileHandle}>>}
 */
export async function searchContent(pattern, options = {}) {
  const handle = options.handle || window.__localVfsHandle;
  if (!handle) {
    throw new Error("Local VFS is not mounted. Please attach local folder first.");
  }
  if (!pattern || typeof pattern !== "string" || !pattern.trim()) {
    return [];
  }

  const query = pattern.trim().toLowerCase();
  const results = [];
  const maxResults = options.maxResults || 500;

  async function processFile(entry, name, currentPath) {
    const ext = '.' + name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) return;

    try {
      const file = await entry.getFile();
      // Skip files larger than 5MB to prevent memory thrashing
      if (file.size > 5 * 1024 * 1024) return;
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const relPath = `${currentPath}${name}`;

      for (let i = 0; i < lines.length; i++) {
        if (results.length >= maxResults) break;
        const line = lines[i];
        if (line.toLowerCase().includes(query)) {
          results.push({
            path: relPath,
            filename: name,
            lineNum: i + 1,
            lineText: line.trimEnd(),
            fileHandle: entry
          });
        }
      }
    } catch (e) {}
  }

  async function crawlDirectory(dirHandle, currentPath = "") {
    if (results.length >= maxResults) return;

    if (typeof dirHandle.entries === "function") {
      for await (const [name, entry] of dirHandle.entries()) {
        if (results.length >= maxResults) break;
        if (entry.kind === "directory") {
          if (IGNORED_DIRS.has(name) || name.startsWith(".")) continue;
          await crawlDirectory(entry, `${currentPath}${name}/`);
        } else if (entry.kind === "file") {
          await processFile(entry, name, currentPath);
        }
      }
    } else if (typeof dirHandle.values === "function") {
      for await (const entry of dirHandle.values()) {
        if (results.length >= maxResults) break;
        const name = entry.name;
        if (entry.kind === "directory") {
          if (IGNORED_DIRS.has(name) || name.startsWith(".")) continue;
          await crawlDirectory(entry, `${currentPath}${name}/`);
        } else if (entry.kind === "file") {
          await processFile(entry, name, currentPath);
        }
      }
    }
  }

  await crawlDirectory(handle, "");
  return results;
}

/**
 * Reads local file content directly from mounted handle without network calls.
 * @param {string} path - Relative repository path (forward or back slashes)
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function readLocalFile(path, options = {}) {
  const root = options.handle || window.__localVfsHandle;
  if (!root) {
    throw new Error("Local VFS is not mounted.");
  }

  const normalized = path.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    throw new Error("Invalid file path.");
  }

  let current = root;
  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i]);
  }

  const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
  const file = await fileHandle.getFile();
  return await file.text();
}

if (typeof window !== "undefined") {
  window.localVfs = {
    readLocalFile,
    searchContent,
    mountLocalDirectory,
    unmountLocalDirectory,
    initLocalVfs,
    updateLocalVfsBadge,
    clearStoredHandle,
    ALLOWED_EXTENSIONS
  };
}
