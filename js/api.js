/**
 * GitHub API fetcher and persistent localStorage cache manager
 * with 24-hour TTL and 6-refetch session quota guard
 * for rajghosh06-dev/Programming-Related
 */

export const REPO_CONFIG = {
  owner: "rajghosh06-dev",
  repo: "Programming-Related",
  branch: "main",
  apiUrl: "https://api.github.com/repos/rajghosh06-dev/Programming-Related/git/trees/main?recursive=1",
  cacheKey: "pwsh_gh_tree_cache_rajghosh06",
  cacheTimestampKey: "pwsh_gh_tree_cache_time_rajghosh06",
  refetchQuotaKey: "pwsh_gh_refetch_quota_session",
  ttlMs: 24 * 60 * 60 * 1000, // 24 Hours in milliseconds
  maxSessionRefetches: 6
};

/**
 * Curated offline fallback dataset in case of network loss or GitHub API rate limits
 */
const OFFLINE_FALLBACK = [
  { path: ".gitattributes", type: "blob", size: 1132, mode: "100644" },
  { path: ".gitignore", type: "blob", size: 1188, mode: "100644" },
  { path: "LICENSE", type: "blob", size: 1090, mode: "100644" },
  { path: "note.md", type: "blob", size: 1896, mode: "100644" },
  { path: "README.md", type: "blob", size: 13641, mode: "100644" },
  { path: ".github", type: "tree", size: 0, mode: "040000" },
  { path: ".github/profile/README.md", type: "blob", size: 13552, mode: "100644" },
  { path: ".github/readme-automation/generate_readme.py", type: "blob", size: 15351, mode: "100644" },
  { path: ".github/readme-automation/analyze_repo.py", type: "blob", size: 5424, mode: "100644" },
  { path: ".github/workflows/sync-readme.yml", type: "blob", size: 2766, mode: "100644" },
  { path: "1st-Year", type: "tree", size: 0, mode: "040000" },
  { path: "1st-Year/Others/RAPTOR PROGRAMS/Break Statement.c", type: "blob", size: 450, mode: "100644" },
  { path: "1st-Year/Others/RAPTOR PROGRAMS/CONTINUE Statement.c", type: "blob", size: 430, mode: "100644" },
  { path: "1st-Year/Others/RAPTOR PROGRAMS/GOTO Statement.c", type: "blob", size: 520, mode: "100644" },
  { path: "2nd-Year", type: "tree", size: 0, mode: "040000" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/CLASS/CIRCULAR QUEUE/CircularQueue.c", type: "blob", size: 2310, mode: "100644" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/CLASS/DEQUE/DoubleEndedQueue.c", type: "blob", size: 2780, mode: "100644" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/TEMP/MergeSort.c", type: "blob", size: 1845, mode: "100644" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/TEMP/ParenthesisChecker.c", type: "blob", size: 1420, mode: "100644" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/TREE/BTree.c", type: "blob", size: 3890, mode: "100644" },
  { path: "2nd-Year/2-1/DATA STRUCTURES [C Language]/24R11A6685/WEEK1/AdditionPolinomial.c", type: "blob", size: 1980, mode: "100644" },
  { path: "3rd-Year", type: "tree", size: 0, mode: "040000" },
  { path: "CN", type: "tree", size: 0, mode: "040000" },
  { path: "CN/SocketProgramming/client.c", type: "blob", size: 1650, mode: "100644" },
  { path: "CN/SocketProgramming/server.c", type: "blob", size: 1820, mode: "100644" },
  { path: "tools", type: "tree", size: 0, mode: "040000" }
];

/**
 * Reads the cached items from localStorage if within the 24-hour TTL.
 * @returns {{ items: Array, timestamp: number, ageMs: number } | null}
 */
export function loadCachedIndex() {
  try {
    const rawTime = localStorage.getItem(REPO_CONFIG.cacheTimestampKey);
    const rawData = localStorage.getItem(REPO_CONFIG.cacheKey);
    if (!rawData || !rawTime) return null;

    const timestamp = parseInt(rawTime, 10);
    if (isNaN(timestamp)) return null;

    const ageMs = Date.now() - timestamp;
    if (ageMs >= REPO_CONFIG.ttlMs) {
      console.info(`[Indexer] localStorage cache expired (Age: ${formatDuration(ageMs)}, TTL: 24h).`);
      return null;
    }

    const items = JSON.parse(rawData);
    if (Array.isArray(items) && items.length > 0) {
      return { items, timestamp, ageMs };
    }
  } catch (err) {
    console.warn("[Indexer] Failed reading localStorage cache:", err);
  }
  return null;
}

/**
 * Persists indexed items into localStorage with current timestamp.
 * Fallbacks to sessionStorage if localStorage quota is exceeded.
 */
function saveIndexToStorage(items) {
  try {
    localStorage.setItem(REPO_CONFIG.cacheKey, JSON.stringify(items));
    localStorage.setItem(REPO_CONFIG.cacheTimestampKey, Date.now().toString());
    console.info(`[Indexer] Successfully saved ${items.length} items to 24-hour localStorage cache.`);
  } catch (err) {
    console.warn("[Indexer] localStorage write failed (quota exceeded). Falling back to sessionStorage:", err);
    try {
      sessionStorage.setItem(REPO_CONFIG.cacheKey, JSON.stringify(items));
      sessionStorage.setItem(REPO_CONFIG.cacheTimestampKey, Date.now().toString());
    } catch (sErr) {
      console.warn("[Indexer] sessionStorage write also failed:", sErr);
    }
  }
}

/**
 * Fetches the git tree directly from GitHub API.
 * @returns {Promise<Array>}
 */
async function fetchTreeFromGitHub() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(REPO_CONFIG.apiUrl, {
      signal: controller.signal,
      headers: {
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("GitHub API rate limit exceeded (HTTP 403). Using cached/fallback data.");
      }
      throw new Error(`GitHub API HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.tree || !Array.isArray(data.tree)) {
      throw new Error("Invalid GitHub API response: 'tree' array missing.");
    }

    // Normalize items to preserve memory and storage footprint
    return data.tree.map(item => ({
      path: item.path,
      type: item.type, // 'blob' or 'tree'
      size: item.size || 0,
      mode: item.mode || "100644"
    }));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retrieves the full tree index.
 * On normal page loads/refreshes, loads strictly from localStorage if valid (within 24h).
 * Does NOT hit GitHub API if valid cache exists.
 * @returns {Promise<Array>}
 */
export async function getRepositoryIndex() {
  // 1. Check persistent localStorage cache first (24h TTL)
  const cached = loadCachedIndex();
  if (cached) {
    console.info(`[Indexer] Loaded ${cached.items.length} items from localStorage cache (Age: ${formatDuration(cached.ageMs)}).`);
    return cached.items;
  }

  // 2. No valid cache, fetch fresh data from GitHub API
  try {
    const items = await fetchTreeFromGitHub();
    saveIndexToStorage(items);
    return items;
  } catch (networkErr) {
    console.warn("[Indexer] Fetch failed, falling back:", networkErr.message);
    throw networkErr;
  }
}

/**
 * Manually refetches the GitHub tree with a strict session limit of 6 refetches.
 * @returns {Promise<{ items: Array, refetchesUsed: number, remainingQuota: number }>}
 */
export async function refetchRepositoryIndex() {
  const used = getRefetchCount();

  if (used >= REPO_CONFIG.maxSessionRefetches) {
    throw new Error(`[!] Refetch limit reached (${REPO_CONFIG.maxSessionRefetches}/${REPO_CONFIG.maxSessionRefetches} used in this session). Try again in a new session.`);
  }

  // Perform live fetch
  const items = await fetchTreeFromGitHub();

  // Increment refetch quota count in sessionStorage
  const newCount = used + 1;
  sessionStorage.setItem(REPO_CONFIG.refetchQuotaKey, newCount.toString());

  // Save fresh data into localStorage
  saveIndexToStorage(items);

  return {
    items,
    refetchesUsed: newCount,
    remainingQuota: REPO_CONFIG.maxSessionRefetches - newCount
  };
}

/**
 * Returns the current session refetch count
 * @returns {number}
 */
export function getRefetchCount() {
  const val = sessionStorage.getItem(REPO_CONFIG.refetchQuotaKey);
  const count = parseInt(val || "0", 10);
  return isNaN(count) ? 0 : count;
}

/**
 * Returns formatted cache status details for /cache command
 */
export function getCacheStatus() {
  const cachedStr = localStorage.getItem(REPO_CONFIG.cacheKey) || sessionStorage.getItem(REPO_CONFIG.cacheKey);
  const timeStr = localStorage.getItem(REPO_CONFIG.cacheTimestampKey) || sessionStorage.getItem(REPO_CONFIG.cacheTimestampKey);
  const refetchesUsed = getRefetchCount();
  const maxRefetches = REPO_CONFIG.maxSessionRefetches;

  let itemCount = 0;
  if (cachedStr) {
    try {
      const parsed = JSON.parse(cachedStr);
      itemCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch {}
  }

  const timestamp = timeStr ? parseInt(timeStr, 10) : 0;
  const ageMs = timestamp ? (Date.now() - timestamp) : 0;
  const isExpired = timestamp === 0 || ageMs >= REPO_CONFIG.ttlMs;
  const remainingTtlMs = Math.max(0, REPO_CONFIG.ttlMs - ageMs);

  return {
    hasCache: itemCount > 0,
    itemCount,
    timestamp,
    formattedDate: timestamp ? new Date(timestamp).toLocaleString() : "Never",
    ageMs,
    ageFormatted: timestamp ? formatDuration(ageMs) : "N/A",
    ttlRemainingFormatted: timestamp && !isExpired ? formatDuration(remainingTtlMs) : "Expired / Empty",
    isExpired,
    refetchesUsed,
    refetchQuotaRemaining: Math.max(0, maxRefetches - refetchesUsed),
    maxRefetches
  };
}

/**
 * Formats milliseconds into human-readable duration
 */
export function formatDuration(ms) {
  if (ms < 1000) return "Just now";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

/**
 * Returns fallback items if offline
 */
export function getOfflineFallback() {
  return OFFLINE_FALLBACK;
}
