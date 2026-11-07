# Command Reference & Syntax Guide

This document provides a comprehensive reference manual for all syntax operators, built-in PowerShell commands, and slash administrative automations supported by the **Windows 11 Terminal — Web Explorer**.

---

## 1. Quick Syntax Overview

| Prefix / Operator | Purpose | Example | Description |
|:---|:---|:---|:---|
| `@` | Real-Time Path Indexer | `@2nd-Year` | Opens real-time autocomplete suggestions with `[DIR]` and `[FILE]` badges. |
| `$` | In-File Grep Guard | `$malloc` | Safeguards GitHub API limits; generates `clone-index.bat` for local deep grep. |
| `/` | System & Admin Tooling | `/serve` | Executes terminal administrative tasks and automated multi-tier installer dispatchers. |
| *Standard* | PowerShell Shell Built-ins | `ls CN` | Standard shell emulation commands for navigation, inspection, and buffer control. |

---

## 2. Dynamic Repository Indexing (`@`)

Typing `@` followed by any search term triggers instantaneous client-side fuzzy path search across all 4,400+ repository assets.

```
PS D:\RAJ\GCET\GCET-PROGRAMMING\PROGRAMMING-RELATED> @Queue
```

### Autocomplete Interface
- **4-Line Scrollable Frame**: Suggestions are bound to a compact 4-line viewport (`max-height: 140px`) to prevent prompt displacement.
- **Keyboard Navigation**:
  - `Arrow Up` / `Arrow Down`: Navigate through matched entries.
  - `Enter`: Select active item and launch contextual action menu.
  - `Tab`: Auto-complete the input prompt with the selected item path.
  - `Escape`: Dismiss the suggestion box.

### Contextual Action Menus
Selecting an entry opens an interactive action selector:

#### For Files (`[FILE]`):
1. `[1] GitHub Blob`: Opens the official GitHub file view in a new browser tab.
2. `[2] Raw Stream`: Opens the raw plain-text payload from `raw.githubusercontent.com`.
3. `[3] Copy Path`: Copies the repository-relative path to the system clipboard.
4. `[4] Direct Download`: Triggers immediate browser file download.

#### For Directories (`[DIR]`):
1. `[1] GitHub Tree`: Opens the directory tree on GitHub.
2. `[2] In-Terminal Browse (ls)`: Executes `ls <folder>` inside the terminal session.
3. `[3] Copy Path`: Copies folder path to clipboard.

---

## 3. In-File Grep Guard (`$`)

Searching inside 4,400+ files via web APIs would rapidly exhaust GitHub API quotas (60 requests/hr unauthenticated).

```
PS D:\RAJ\GCET\GCET-PROGRAMMING\PROGRAMMING-RELATED> $pthread_create
```

### Grep Guard Behavior
1. Displays an explanatory security banner explaining rate-limit safeguards.
2. Automatically generates and downloads `clone-index.bat`.
3. `clone-index.bat` performs a shallow depth-1 clone of `rajghosh06-dev/Programming-Related` into a local directory (`tmp\txt-idx`) and prepares it for fast local recursive search using tools like `ripgrep`, `grep`, or Windows `findstr`.

---

## 4. Administrative & Maintenance Commands (`/`)

Administrative commands manage client caching, terminal persona, standalone server runtimes, and enterprise environment tooling.

### `/serve`
- **Description**: Opens the interactive multi-OS standalone desktop launcher menu.
- **Options**:
  - `[1] Windows (.bat)`: Generates `launch-terminal.bat` with 4-tier server/shell hierarchy.
  - `[2] Ubuntu / Debian (.sh)`: Generates standalone shell launcher with APT dependency resolution.
  - `[3] Fedora / Arch Linux (.sh)`: Generates standalone shell launcher with DNF/Pacman detection.
- **Syntax**: `/serve`

### `/install-cisco-pkt-compatible`
- **Description**: Downloads `install-cisco-pkt-compatible.bat`. Aligns the host machine's Cisco Packet Tracer installation to the exact build used by repository coursework (`9.0.1.0858`).
- **Pipeline**:
  1. Requests UAC Administrator elevation.
  2. Scans Windows Registry uninstall keys (`HKLM:\SOFTWARE\...`).
  3. Silently uninstalls mismatched versions via Inno Setup flags `/VERYSILENT /SUPPRESSMSGBOXES /NORESTART`.
  4. Deploys pinned version `9.0.1.0858` via `winget`, `choco`, or direct verified binary fallback.
- **Syntax**: `/install-cisco-pkt-compatible`

### `/install-cisco-pkt`
- **Description**: Downloads `install-cisco-pkt.bat`. Automatically uninstalls outdated builds and deploys the latest general release of Cisco Packet Tracer.
- **Syntax**: `/install-cisco-pkt`

### `/install-winget`
- **Description**: Downloads `install-winget.bat`. Automated installer and repair tool for the Windows Package Manager CLI (`winget.exe`), with DISM package provisioning fallback for enterprise or LTSC Windows systems.
- **Syntax**: `/install-winget`

### `/install-wt`
- **Description**: Downloads `install-wt.bat`. Automates installation of Microsoft Windows Terminal (`wt.exe`) via `winget` or direct MSIX package bundle.
- **Syntax**: `/install-wt`

### `/install-pwsh`
- **Description**: Downloads `install-pwsh.bat`. 3-tier hardened installer for modern PowerShell 7. Configures native context menu Explorer integration and includes portable ZIP fallback.
- **Syntax**: `/install-pwsh`

### `/cache`
- **Description**: Displays current cache telemetry, including total items indexed, storage engine, cache creation timestamp, elapsed age, TTL status, and remaining session refetch quota.
- **Syntax**: `/cache`

### `/re-fetch`
- **Description**: Forces immediate cache invalidation and pulls a fresh tree from the GitHub Git Trees API. Enforces a maximum of 6 refetches per session to protect IP rate limits.
- **Syntax**: `/re-fetch`

### `/set-user <username>`
- **Description**: Customizes the user identity displayed in the simulated PowerShell prompt path (e.g., `PS C:\Users\<username>`). Stored persistently in `localStorage`.
- **Syntax**: `/set-user <name>`
- **Example**: `/set-user rishit`

### `/set-drive <letter>`
- **Description**: Changes the simulated root drive letter for the prompt path. Stored persistently in `localStorage`.
- **Syntax**: `/set-drive <letter>`
- **Example**: `/set-drive C`

### `/reset-prompt`
- **Description**: Generates a new random Windows setup device identifier (`DESKTOP-XXXXXXX`) and resets simulated drive path back to `D:`.
- **Syntax**: `/reset-prompt`

### `/logout`
- **Description**: Safely ends the active terminal session, clears `sessionStorage`, resets cloud presence to anonymous, and returns to the authentication gate.
- **Syntax**: `/logout`

### `/help` or `help`
- **Description**: Outputs the comprehensive terminal command index and quickstart guide to the buffer.
- **Syntax**: `/help`

---

## 5. Security & Administrative Commands (Admin Only)

These commands are reserved strictly for authorized administrators (`ADMIN` role). Standard users attempting execution receive an access denied error.

### `/users`
- **Description**: Displays a formatted table of all whitelisted users, security roles (`ADMIN` vs `USER`), password status (`CONFIGURED` vs `PENDING`), and live presence status (`Active (Live)`, `Idle`, `Offline`).
- **Syntax**: `/users`

### `/reset-user-pwd <username>`
- **Description**: Purges the stored salted SHA-256 password hash for `<username>` from Firebase Realtime Database and the local vault. The user will be required to initialize a new password on their next sign-in.
- **Syntax**: `/reset-user-pwd <username>`
- **Example**: `/reset-user-pwd karthik10-dev`

### `/add-user <username>`
- **Description**: Adds a new handle to the authorized whitelist with the standard `USER` role.
- **Syntax**: `/add-user <username>`
- **Example**: `/add-user newpeer-dev`

### `/remove-user <username>`
- **Description**: Removes `<username>` from the authorized whitelist and deletes all associated credential records.
- **Syntax**: `/remove-user <username>`
- **Example**: `/remove-user oldpeer-dev`

### `/sessions`
- **Description**: Lists all active multi-device presence sessions, detailing session IDs, masked user identities, activity state (`Active` vs `Idle`), and session type (`Admin`, `User`, `Visitor`).
- **Syntax**: `/sessions`

---

## 6. Standard PowerShell Built-in Commands

The terminal emulates classic PowerShell 7 console commands for direct folder traversal and buffer inspection.

### `ls` / `dir`
- **Description**: Renders an authentic formatted directory table with headers (`Mode`, `LastWriteTime`, `Length`, `Name`). Folders are rendered with authentic terminal blue (`#0037DA`) and files with white (`#CCCCCC`).
- **Syntax**: `ls [folder]` or `dir [folder]`
- **Examples**:
  - `ls`: Lists files in current root.
  - `ls 2nd-Year`: Lists files inside `2nd-Year`.
  - `dir CN/SocketProgramming`: Lists files inside socket programming directory.

### `cat` / `type`
- **Description**: Reads and displays preview contents of a specified file.
- **Syntax**: `cat <filepath>` or `type <filepath>`
- **Example**: `cat LICENSE`

### `cls` / `clear`
- **Description**: Clears the entire output buffer, resets screen history, and restores the viewport to the top.
- **Syntax**: `cls` or `clear`

### `repo` / `info` / `status`
- **Description**: Displays repository health, owner details, tracking branch, and current cache status.
- **Syntax**: `repo`
