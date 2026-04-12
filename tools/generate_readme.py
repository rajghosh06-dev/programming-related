#!/usr/bin/env python3
"""Generate repository README with a unique style and automated data tables."""

from __future__ import annotations

import html
import json
import subprocess
import unicodedata
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import analyze_repo

ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = ROOT / "tools"
DATA_DIR = TOOLS_DIR / "data"
README_PATH = ROOT / "README.md"

OWNER = "rajghosh06-dev"
REPO = "programming-related"
REPO_URL = f"https://github.com/{OWNER}/{REPO}"

LANGUAGE_ICON_MAP = {
    "Assembly": "https://img.shields.io/badge/ASM-111827?style=for-the-badge&logo=gnuassembler&logoColor=white",
    "C": "https://raw.githubusercontent.com/devicons/devicon/master/icons/c/c-original.svg",
    "C++": "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg",
    "CSS": "https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg",
    "HTML": "https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg",
    "Java": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "JavaScript": "https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg",
    "Jupyter Notebook": "https://raw.githubusercontent.com/devicons/devicon/master/icons/jupyter/jupyter-original.svg",
    "MySQL": "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg",
    "PHP": "https://raw.githubusercontent.com/devicons/devicon/master/icons/php/php-original.svg",
    "Python": "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
    "SQL": "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg",
    "TypeScript": "https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg",
}

FRAMEWORK_ICON_MAP = {
    "JDBC": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "Maven": "https://raw.githubusercontent.com/devicons/devicon/master/icons/maven/maven-original.svg",
    "NumPy": "https://raw.githubusercontent.com/devicons/devicon/master/icons/numpy/numpy-original.svg",
    "Pandas": "https://raw.githubusercontent.com/devicons/devicon/master/icons/pandas/pandas-original.svg",
    "XAMPP": "https://img.shields.io/badge/XAMPP-FB7A24?style=for-the-badge&logo=xampp&logoColor=white",
}

TOOL_CARDS = [
    ("VS Code", "https://raw.githubusercontent.com/devicons/devicon/master/icons/vscode/vscode-original.svg"),
    ("Git", "https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg"),
    ("IntelliJ", "https://raw.githubusercontent.com/devicons/devicon/master/icons/intellij/intellij-original.svg"),
    ("Jupyter", "https://raw.githubusercontent.com/devicons/devicon/master/icons/jupyter/jupyter-original.svg"),
    ("Dev C++", "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg"),
    ("Code::Blocks", "https://img.shields.io/badge/Code::Blocks-3C5A99?style=for-the-badge"),
    ("XAMPP", "https://img.shields.io/badge/XAMPP-FB7A24?style=for-the-badge&logo=xampp&logoColor=white"),
]


def run_git(args: list[str]) -> str:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def badge(label: str, message: str, color: str, style: str = "for-the-badge", logo: str | None = None) -> str:
    safe_label = label.replace(" ", "%20")
    safe_message = message.replace(" ", "%20")
    base = f"https://img.shields.io/badge/{safe_label}-{safe_message}-{color}?style={style}"
    if logo:
        base += f"&logo={logo}&logoColor=white"
    return base


def ascii_clean(value: str) -> str:
    replacements = {
        "â€“": "-",
        "â€”": "-",
        "â€˜": "'",
        "â€™": "'",
        "â€œ": '"',
        "â€�": '"',
    }
    for source, target in replacements.items():
        value = value.replace(source, target)
    normalized = unicodedata.normalize("NFKD", value)
    return normalized.encode("ascii", "ignore").decode("ascii")


def load_projects() -> list[dict[str, str]]:
    path = DATA_DIR / "project_directory.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def refresh_language_report() -> dict[str, Any]:
    report = analyze_repo.collect_stats()
    analyze_repo.write_reports(report)
    return report


def top_languages_for_cards(report: dict[str, Any]) -> list[str]:
    ignored = {"Markdown", "JSON", "XML", "YAML", "PowerShell", "Batch", "C/C++ Header"}
    cards: list[str] = []
    for item in report.get("languages", []):
        name = str(item.get("language", "")).strip()
        if not name or name in ignored:
            continue
        cards.append(name)
        if len(cards) >= 8:
            break
    return cards


def detect_frameworks(report: dict[str, Any]) -> list[str]:
    detected: list[str] = []

    has_java = any(item.get("language") == "Java" for item in report.get("languages", []))
    has_python = any(item.get("language") == "Python" for item in report.get("languages", []))
    has_php = any(item.get("language") == "PHP" for item in report.get("languages", []))
    has_sql = any(item.get("language") in {"SQL", "MySQL"} for item in report.get("languages", []))

    if (ROOT / "pom.xml").exists() or has_java:
        detected.append("Maven")
    if has_java:
        detected.append("JDBC")
    if has_python:
        detected.extend(["NumPy", "Pandas"])
    if has_php or has_sql:
        detected.append("XAMPP")

    ordered: list[str] = []
    for value in detected:
        if value not in ordered:
            ordered.append(value)
    return ordered


def get_branches() -> str:
    branches_text = run_git(["branch", "--format", "%(refname:short)"])
    if not branches_text:
        return "`main`"
    branches = [line.strip() for line in branches_text.splitlines() if line.strip()]
    if not branches:
        return "`main`"
    return "<br />".join(f"`{html.escape(branch)}`" for branch in branches)


def get_last_update_for_path(path: str) -> str:
    output = run_git(["log", "-1", "--date=short", "--pretty=format:%ad", "--", path])
    if not output:
        return "TBD"
    try:
        return datetime.strptime(output, "%Y-%m-%d").strftime("%b %d, %Y")
    except ValueError:
        return output


def build_project_rows(projects: list[dict[str, str]], branches_html: str) -> str:
    header = "| PROJECT | SUBJECT | STACK | DESCRIPTION | LAST UPDATE | BRANCHES | REPOSITORY |"
    divider = "| --- | --- | --- | --- | --- | --- | --- |"
    rows = [header, divider]

    for item in projects:
        project = html.escape(item.get("project", "Untitled"))
        subject = html.escape(item.get("subject", "TBD"))
        stack = html.escape(item.get("stack", "TBD"))
        description = html.escape(item.get("description", "Project details are being added."))
        path = item.get("path", "")
        safe_path = html.escape(path)
        last_update = html.escape(get_last_update_for_path(path)) if path else "TBD"
        encoded_path = urllib.parse.quote(path, safe="/")
        repo_link = f"[`{safe_path}`]({REPO_URL}/tree/main/{encoded_path})" if path else REPO_URL

        rows.append(
            f"| **{project}** | {subject} | {stack} | {description} | {last_update} | {branches_html} | {repo_link} |"
        )

    return "\n".join(rows)


def get_recent_commits(limit: int = 6) -> list[dict[str, str]]:
    format_spec = "%H%x1f%h%x1f%an%x1f%ad%x1f%s"
    output = run_git(["log", f"-n{limit}", f"--pretty=format:{format_spec}", "--date=iso-strict"])
    commits: list[dict[str, str]] = []

    if not output:
        return commits

    branch = run_git(["rev-parse", "--abbrev-ref", "HEAD"]) or "main"

    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) != 5:
            continue
        full_sha, short_sha, author, date_value, subject = parts
        try:
            dt = datetime.fromisoformat(date_value.replace("Z", "+00:00")).astimezone(timezone.utc)
            ts = dt.strftime("%b %d, %Y · %I:%M %p UTC")
        except ValueError:
            ts = date_value

        commits.append(
            {
            "message": ascii_clean(subject),
            "author": ascii_clean(author),
                "timestamp": ts,
                "sha": short_sha,
                "branch": branch,
                "commit_url": f"{REPO_URL}/commit/{full_sha}",
                "repo_url": REPO_URL,
                "repo_name": REPO,
            }
        )

    return commits


def render_recent_commits(commits: list[dict[str, str]]) -> str:
    if not commits:
        return "> Recent commit activity will appear here once commits are available."

    rows: list[str] = []
    for idx in range(0, len(commits), 2):
        pair = commits[idx:idx + 2]
        cells: list[str] = []
        for commit in pair:
            msg = html.escape(commit["message"])
            author = html.escape(commit["author"])
            timestamp = html.escape(commit["timestamp"])
            sha = html.escape(commit["sha"])
            branch = html.escape(commit["branch"])
            commit_url = commit["commit_url"]
            repo_url = commit["repo_url"]
            repo_name = html.escape(commit["repo_name"])

            cells.append(
                f"""<td width=\"50%\" valign=\"top\">\n<strong><a href=\"{commit_url}\">{msg}</a></strong><br />\n<sub>{timestamp}</sub>\n\n<br /><br />\n\n<strong>Repository:</strong> <a href=\"{repo_url}\">{repo_name}</a><br />\n<strong>Committed by:</strong> {author}<br />\n<strong>Branch:</strong> <code>{branch}</code><br />\n<strong>Commit:</strong> <code>{sha}</code>\n</td>"""
            )

        while len(cells) < 2:
            cells.append('<td width="50%" valign="top">&nbsp;</td>')

        rows.append("<tr>\n" + "\n".join(cells) + "\n</tr>")

    return (
        '<div align="center">\n\n<table>\n'
        + "\n".join(rows)
        + '\n</table>\n\n</div>\n\n'
        + "> This section is generated from the latest local repository commits."
    )


def render_icon_table(items: list[tuple[str, str]], columns: int) -> str:
    if not items:
        return "*No items detected yet.*"

    blocks: list[str] = []
    for index in range(0, len(items), columns):
        row = items[index:index + columns]
        width = max(1, 100 // max(1, len(row)))
        cells: list[str] = []
        for name, icon_url in row:
            safe_name = html.escape(name)
            cells.append(
                f"""<td align=\"center\" width=\"{width}%\">\n<img src=\"{icon_url}\" alt=\"{safe_name}\" width=\"64\" height=\"64\" /><br />\n<strong>{safe_name}</strong>\n</td>"""
            )

        blocks.append("<table>\n<tr>\n" + "\n".join(cells) + "\n</tr>\n</table>")

    return '<div align="center">\n\n' + "\n\n".join(blocks) + "\n\n</div>"


def render_tech_specs(report: dict[str, Any]) -> str:
    language_cards = []
    for language in top_languages_for_cards(report):
        icon = LANGUAGE_ICON_MAP.get(language)
        if icon:
            language_cards.append((language, icon))

    framework_cards = []
    for framework in detect_frameworks(report):
        icon = FRAMEWORK_ICON_MAP.get(framework)
        if icon:
            framework_cards.append((framework, icon))

    languages_block = render_icon_table(language_cards, columns=5)
    frameworks_block = render_icon_table(framework_cards, columns=4)
    tools_block = render_icon_table(TOOL_CARDS, columns=5)

    return f"""This matrix is generated from repository analytics and local metadata.

### Languages

{languages_block}

### Frameworks and Runtime Stack

{frameworks_block}

### Tools

{tools_block}

### What We Optimize For

- Fast navigation across years, subjects, and lab modules.
- Honest documentation that is practical for revision sessions.
- Reproducible execution patterns for common language stacks.
- Low-maintenance automation that prevents stale README data.
"""


def build_readme(report: dict[str, Any], projects: list[dict[str, str]], recent_commits: list[dict[str, str]]) -> str:
    branches_html = get_branches()
    project_table = build_project_rows(projects, branches_html)
    recent_commits_block = render_recent_commits(recent_commits)
    tech_specs_section = render_tech_specs(report)

    return f"""<!-- THIS FILE IS AUTO-GENERATED. Edit tools/data/project_directory.json and run python tools/generate_readme.py. -->

<div align="center">

# Programming Related

### A Living Coursework Atlas for Code, Labs, and Semester Projects

<img src="https://capsule-render.vercel.app/api?type=waving&height=160&color=0:0B132B,45:1C2541,100:3A506B&text=PROGRAMMING%20RELATED&fontColor=FFFFFF&fontSize=34&fontAlignY=36" alt="Programming Related Banner" />

<br />

<p><strong>Programming Related</strong> is a high-structure repository designed for semester-wise learning, implementation practice, and long-term revision across multiple technical subjects.</p>

<br />

<img src="https://img.shields.io/badge/Open_on_GitHub-View_Repository-181717?style=for-the-badge&logo=github&logoColor=white" alt="Open on GitHub" />
<img src="{badge('Mode', 'Revision Friendly', '00A8E8', style='flat-square')}" alt="Mode" />
<img src="{badge('Layout', 'Year Wise', '2EC4B6', style='flat-square')}" alt="Layout" />
<img src="{badge('Status', 'Maintained', '52B788', style='flat-square')}" alt="Status" />

<br />

<img src="https://img.shields.io/github/repo-size/{OWNER}/{REPO}?style=flat-square&color=2563EB" alt="Repository Size" />
<img src="https://img.shields.io/github/last-commit/{OWNER}/{REPO}?style=flat-square&color=7C3AED" alt="Last Commit" />
<img src="https://img.shields.io/github/languages/count/{OWNER}/{REPO}?style=flat-square&color=F4A261" alt="Language Count" />
<img src="https://img.shields.io/github/license/{OWNER}/{REPO}?style=flat-square&color=6A4C93" alt="License" />

<br />

<img src="https://img.shields.io/github/stars/{OWNER}/{REPO}?style=social" alt="GitHub Stars" />
<img src="https://img.shields.io/github/forks/{OWNER}/{REPO}?style=social" alt="GitHub Forks" />
<img src="https://img.shields.io/github/watchers/{OWNER}/{REPO}?style=social" alt="GitHub Watchers" />

</div>

<br />

```text
Pulse      : College coding archive with implementation-first discipline
Structure  : Year -> Semester -> Subject -> Exercises / Labs / Projects
Outcome    : Faster revision, cleaner navigation, and showcase-ready documentation
```

---

## Repository Identity

This repository is intentionally designed as an academic engineering notebook, not just a dump of files.

It prioritizes:

- clear year/semester progression,
- implementation-oriented learning records,
- reusable practice references before exams,
- and a professional presentation layer suitable for collaboration.

---

## Academic Atlas

The repository spans first-year fundamentals and second-year specialization tracks including DSA, OOP, OS, DAA, Web Technologies, SQL, and Assembly.

Instead of isolated snapshots, the directory layout captures iterative growth over semesters while keeping code discoverable.

---

## Project Directory

<!-- AUTO:PROJECT_DIRECTORY:START -->
{project_table}
<!-- AUTO:PROJECT_DIRECTORY:END -->

> This table is generated from tools/data/project_directory.json and local git history.

---

## Commit Pulse

{recent_commits_block}

---

## Navigation Blueprint

- Year-wise and semester-wise segregation for fast navigation.
- Subject-specific folders for focused coursework and practice.
- Root-level automation utilities for analysis and README synchronization.

### Typical flow

`Concept -> Practice -> Lab -> Project -> Reflection -> Cleanup`

---

## Evolution Roadmap

- [ ] Add deeper static analysis for folder-level quality checks.
- [ ] Add auto-generated execution matrix for language-specific run commands.
- [ ] Add optional badges for assignment and project completion coverage.
- [ ] Add repository health summary with trend snapshots.

---

## Skill Stack Matrix

{tech_specs_section}

---

## Data Snapshot

- Generated at: **{report.get('generated_at_utc', 'N/A')}**
- Scanned files: **{report.get('scanned_files', 0)}**
- Tracked language files: **{report.get('tracked_language_files', 0)}**

| Language | Files | Lines |
| --- | ---: | ---: |
{''.join(f"| {html.escape(item.get('language', 'N/A'))} | {item.get('files', 0)} | {item.get('lines', 0)} |\n" for item in report.get('languages', [])[:12])}

---

## Automation Control Room

This README is automation-driven and can be regenerated from repository data.

### Files

- `tools/analyze_repo.py`: scans repository files and computes language statistics.
- `tools/generate_readme.py`: generates the full README including tables and sections.
- `tools/validate_readme_assets.py`: validates badge and external asset links used in README.
- `tools/data/project_directory.json`: project metadata source for the Project Directory table.
- `.github/workflows/sync-readme.yml`: scheduled and trigger-based README synchronization workflow.

### Local refresh

```powershell
powershell -ExecutionPolicy Bypass -File .\\tools\\refresh_readme.ps1 -VerboseOutput
```

---

## Why This Repository Feels Different

| Focus Area | What It Looks Like |
| --- | --- |
| **Structured Learning** | Coursework remains easy to navigate across years, semesters, and subjects. |
| **Implementation Depth** | Practice files, labs, and projects are maintained together for continuity. |
| **Documentation Quality** | README now includes generated tables, stats, and automation-backed sections. |
| **Consistency** | Regeneration workflow keeps information current with low manual effort. |

---

## Working Pattern

| Approach | In Practice |
| --- | --- |
| **Plan by subject** | Folder structure follows year, semester, and subject flow. |
| **Implement by concept** | Code is grouped into practical modules and assignments. |
| **Review for clarity** | Readability and reproducibility are treated as first-class outcomes. |
| **Improve continuously** | Automation updates documentation as the repository evolves. |

---

## Author

**Rishit Ghosh**

- Portfolio: https://rajghosh06-dev.github.io/portfolio/
- LinkedIn: https://www.bing.com/search?q=%22https%3A%2F%2Fwww.linkedin.com%2Fin%2Frajghosh06%2F%22
- GitHub: https://github.com/rajghosh06-dev

---

## License

This repository is licensed under the MIT License. See LICENSE for details.
"""


def main() -> None:
    report = refresh_language_report()
    projects = load_projects()
    commits = get_recent_commits()
    README_PATH.write_text(build_readme(report, projects, commits), encoding="utf-8")
    print(f"README generated: {README_PATH}")


if __name__ == "__main__":
    main()
