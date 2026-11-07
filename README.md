<div align="center">

# Windows 11 Terminal — Web Explorer
### Authentic PowerShell 7.6.9 Client & Dynamic Repository Indexer

[![Windows Terminal Explorer](https://img.shields.io/badge/Web%20Explorer-Windows%20Terminal-0C0C0C?style=flat&logo=powershell&logoColor=3884FF)](https://rajghosh06-dev.github.io/Programming-Related/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-0C0C0C?style=for-the-badge&logo=google-chrome&logoColor=white)](https://rajghosh06-dev.github.io/Programming-Related/)
[![PowerShell](https://img.shields.io/badge/PowerShell-7.6.9-5391FE?style=for-the-badge&logo=powershell&logoColor=white)](https://github.com/PowerShell/PowerShell)
[![Windows 11](https://img.shields.io/badge/Windows%2011-Terminal%20UI-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](https://github.com/microsoft/terminal)
[![Vanilla JS](https://img.shields.io/badge/Vanilla-ES6%2B-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  A high-performance, client-side Windows 11 Terminal emulator designed to explore, search, and manage 4,400+ coursework assets in <code>rajghosh06-dev/Programming-Related</code> with sub-millisecond autocomplete, rate-limit protected caching, and multi-tier polyglot standalone runners.
</p>

</div>

---

## Key Highlights

- **Authentic Windows 11 Terminal Aesthetics**: Pixel-perfect dark canvas (`#0C0C0C`), Cascadia Code monospace stack, persistent custom block caret (`#customCaret`) with blur outline persistence, and authentic directory table colorization (`#16C60C` headers, `#0037DA` folders).
- **Fast Client-Side Indexing (`@`)**: Indexes the entire repository tree dynamically via GitHub Git Trees API. Real-time autocomplete suggestions locked to a 4-line scrollable frame with zero emojis and clean ASCII badges (`[DIR]`, `[FILE]`).
- **Context-Aware Actions**:
  - **Files**: `[1] GitHub Blob` | `[2] Raw Stream` | `[3] Copy to Clipboard` | `[4] Direct Download`.
  - **Directories**: `[1] GitHub Tree` | `[2] In-Terminal Browse (ls)` | `[3] Copy Path`.
- **In-File Content Grep Guard (`$`)**: Guard banner that generates `clone-index.bat` for offline search without hitting API rate limits.
- **Persistent Caching Engine**: 24-hour TTL in `localStorage` eliminates API calls on page reloads, accompanied by a 6-call session quota guard on `/re-fetch`.
- **Multi-OS Standalone Launchers (`/serve`)**: Launches the terminal as a borderless native app on Windows (`.bat`), Ubuntu/Debian (`.sh`), and Fedora/Arch (`.sh`).
- **Administrative Tooling**: Built-in automated installers with multi-tier fallbacks:
  - `/install-winget`: Windows Package Manager with DISM provisioning fallback.
  - `/install-pwsh`: Modern PowerShell 7 with MSI context-menu integration and portable ZIP fallback.
  - `/install-cisco-pkt-compatible`: Pinned bi-directional installer for lab topology build `9.0.1.0858`.
  - `/install-cisco-pkt`: Automatic updater for the latest release.

---

## System Architecture

```mermaid
flowchart TD
    User([Browser Client]) --> Indexer[api.js: RepositoryIndexer]
    Indexer -->|Check Cache| LocalStorage[(localStorage 24h TTL)]
    LocalStorage -->|Cache Hit| Init[terminal.js: Boot Terminal]
    LocalStorage -->|Cache Miss| GitTreesAPI[GitHub Git Trees API: recursive=1]
    GitTreesAPI -->|Store & Stamp| LocalStorage
    
    Init --> CLI[Interactive PowerShell Prompt]
    CLI -->|'@' Prefix| Search[File/Folder Autocomplete: 4-Line Frame]
    CLI -->|'/' Prefix| Commands[Built-in Admin & Slash Commands]
    CLI -->|'$' Prefix| GrepGuard[Grep Warning & clone-index.bat Dispatch]
    CLI -->|'ls' / 'dir'| TreeView[Formatted Directory Listing]
```

For deeper architectural details, cache lifecycle analysis, desktop shell detection hierarchies, and Cisco Packet Tracer registry mechanics, refer to [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Command Reference Matrix

| Command | Syntax | Scope & Description |
|:---|:---|:---|
| **Search Files/Dirs** | `@<query>` | Real-time path autocomplete with `[DIR]` and `[FILE]` tagging |
| **Grep Offline** | `$<query>` | Generates `clone-index.bat` for local deep grep in `tmp\txt-idx` |
| **Local Launcher** | `/serve` | Interactive multi-OS launcher modal (Windows, Ubuntu, Fedora) |
| **Align Lab Packet Tracer** | `/install-cisco-pkt-compatible` | Pins & aligns system to repository lab version (`9.0.1.0858`) |
| **Update Packet Tracer** | `/install-cisco-pkt` | Upgrades Cisco Packet Tracer to latest release (uninstalls old) |
| **Install Winget** | `/install-winget` | Automated winget repair & DISM provisioning fallback |
| **Install PowerShell 7** | `/install-pwsh` | Silent MSI installer with context menus & portable ZIP fallback |
| **Inspect Cache** | `/cache` | Displays cached count, storage engine, TTL, and refetch quota |
| **Force Refetch** | `/re-fetch` | Refreshes repository tree from GitHub (max 6/session) |
| **Set Custom User** | `/set-user <name>` | Customizes simulated prompt username (saved to localStorage) |
| **Set Custom Drive** | `/set-drive <ltr>` | Customizes simulated prompt drive letter (saved to localStorage) |
| **Reset Prompt** | `/reset-prompt` | Generates a new default `DESKTOP-XXXXXXX` host identifier |
| **Clear Buffer** | `/clear` or `cls` | Clears output buffer and resets viewport scroll to top |
| **Help Reference** | `/help` or `help` | Outputs comprehensive terminal documentation |

For a full reference of keyboard interactions and advanced switches, consult [COMMANDS.md](docs/COMMANDS.md).

---

## Quickstart

### 1. Web Access
Navigate directly to the live GitHub Pages portal:
```plaintext
https://rajghosh06-dev.github.io/Programming-Related/
```

### 2. Standalone Desktop App
Type `/serve` in the web prompt, select `[1] Windows`, and run `launch-terminal.bat`:
```cmd
launch-terminal.bat
```
The script baselines the host environment, starts a background server, and launches an isolated desktop window using pywebview or Microsoft Edge App Mode (`1100x680`).

---

## Repository Structure (`gh-pages`)

```plaintext
├── index.html                  # Terminal canvas & semantic DOM shell
├── css/
│   └── style.css               # Windows 11 Terminal styling & animations
├── js/
│   ├── api.js                  # GitHub API tree fetcher & localStorage cache
│   ├── terminal.js             # State machine, commands & script generators
│   └── app.js                  # Application bootstrap & focus listeners
├── docs/
│   ├── ARCHITECTURE.md         # Detailed architectural documentation
│   └── COMMANDS.md             # In-depth command & shortcut reference
├── launch-terminal.bat         # Standalone polyglot local server launcher
├── clone-index.bat             # Offline deep grep repository cloner
├── .gitattributes              # Line-ending normalizations (CRLF/LF)
├── .gitignore                  # Development exclusions
├── LICENSE                     # MIT License
└── README.md                   # Project documentation & reference
```

---

## Documentation Suite

| Document | Focus Area |
|:---|:---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Zero-backend client indexing, 24-hr TTL cache engine, standalone desktop runner hierarchy, and Cisco Packet Tracer registry mechanics. |
| [docs/COMMANDS.md](docs/COMMANDS.md) | Comprehensive command matrix, `@` search syntax, `$` grep guards, PowerShell built-ins, and installer dispatches. |

---

<div align="center">
  <sub>Maintained by <a href="https://github.com/rajghosh06-dev">Rishit Ghosh</a> • Built with Vanilla Web Standards • Licensed under MIT</sub>
</div>
