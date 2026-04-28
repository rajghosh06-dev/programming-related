#!/usr/bin/env python3
"""
Generate professional, GitHub-safe README for PROGRAMMING-RELATED.
The design uses markdown + badge/image components that render consistently on GitHub.
"""

from __future__ import annotations

import html
import json
import re
import subprocess
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import analyze_repo

ROOT = Path(__file__).resolve().parents[2]
AUTOMATION_DIR = ROOT / ".github" / "readme-automation"
DATA_DIR = AUTOMATION_DIR / "data"
README_PATH = ROOT / "README.md"
PROFILE_README_PATH = ROOT / ".github" / "profile" / "README.md"

OWNER = "rajghosh06-dev"
REPO = "programming-related"
REPO_URL = f"https://github.com/{OWNER}/{REPO}"
LICENSE_URL = f"{REPO_URL}/blob/main/LICENSE"

NEON_COLORS = {
    "cyan": ("00DDFF", "00FF88"),
    "magenta": ("FF00FF", "FF1493"),
    "lime": ("39FF14", "00FF00"),
    "purple": ("B310F0", "9D4EDD"),
    "blue": ("0099FF", "00D4FF"),
    "pink": ("FF006E", "FF1493"),
}

SUBJECT_COLORS = ["00DDFF", "FF00FF", "39FF14", "B310F0", "0099FF", "FF006E", "00B4D8"]

LANGUAGE_ICON_MAP = {
    "Assembly": "https://img.shields.io/badge/ASM-FF006E?style=for-the-badge&logo=gnuassembler&logoColor=white",
    "C": "https://raw.githubusercontent.com/devicons/devicon/master/icons/c/c-original.svg",
    "C++": "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg",
    "HTML": "https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg",
    "Java": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "Python": "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
}

FRAMEWORK_ICON_MAP = {
    "JDBC": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "Maven": "https://raw.githubusercontent.com/devicons/devicon/master/icons/maven/maven-original.svg",
}

TOOLS = [
    ("VS Code", "https://raw.githubusercontent.com/devicons/devicon/master/icons/vscode/vscode-original.svg"),
    ("Git", "https://raw.githubusercontent.com/devicons/devicon/master/icons/git/git-original.svg"),
    ("IntelliJ", "https://raw.githubusercontent.com/devicons/devicon/master/icons/intellij/intellij-original.svg"),
    ("Jupyter", "https://raw.githubusercontent.com/devicons/devicon/master/icons/jupyter/jupyter-original.svg"),
    ("Dev C++", "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg"),
    ("Eclipse", "https://raw.githubusercontent.com/devicons/devicon/master/icons/eclipse/eclipse-original.svg"),
]


def run_git(args: list[str]) -> str:
    try:
        result = subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def load_projects() -> list[dict[str, str]]:
    path = DATA_DIR / "project_directory.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def refresh_language_report() -> dict[str, Any]:
    report = analyze_repo.collect_stats()
    analyze_repo.write_reports(report)
    return report


def sanitize_text(value: str) -> str:
    return value.replace("â€“", "-").replace("â€”", "-").replace("\n", " ").strip()


def sanitize_banner_text(value: str) -> str:
    # capsule-render behaves inconsistently with some emojis/symbols in text payload
    normalized = value.replace("&", " and ")
    normalized = normalized.encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized or "SECTION"


def get_recent_commits(limit: int = 5) -> list[dict[str, str]]:
    fmt = "%H%x1f%h%x1f%an%x1f%ad%x1f%s"
    output = run_git(["log", "-n20", f"--pretty=format:{fmt}", "--date=iso-strict"])
    commits = []

    for line in output.splitlines():
        parts = line.split("\x1f")
        if len(parts) != 5:
            continue
        full_sha, short_sha, author, date_value, subject = parts
        try:
            dt = datetime.fromisoformat(date_value.replace("Z", "+00:00")).astimezone(timezone.utc)
            ts = dt.strftime("%b %d, %Y")
        except ValueError:
            ts = date_value

        commits.append(
            {
                "message": sanitize_text(subject),
                "author": sanitize_text(author),
                "timestamp": ts,
                "sha": short_sha,
                "url": f"{REPO_URL}/commit/{full_sha}",
            }
        )

        if len(commits) >= limit:
            break
    return commits


def render_neon_banner(text: str, animation: str, color_key: str) -> str:
    colors = NEON_COLORS.get(color_key, ("00DDFF", "00FF88"))
    encoded = urllib.parse.quote(sanitize_banner_text(text))
    return (
        "<div align=\"center\">"
        f"<img src=\"https://capsule-render.vercel.app/api?type=rect&height=64&color=0:0a0e27,50:{colors[0]},100:{colors[1]}&text={encoded}&fontColor=ffffff&fontSize=24&animation={animation}\" alt=\"{html.escape(text)}\" />"
        "</div>"
    )


def render_icon_table(items: list[tuple[str, str]], columns: int) -> str:
    if not items:
        return "*No items detected.*"
    rows: list[str] = []
    for i in range(0, len(items), columns):
        row = items[i : i + columns]
        cells: list[str] = []
        for name, icon_url in row:
            safe_name = html.escape(name)
            cells.append(
                f'<td align="center" width="{100 // max(1, len(row))}%"><img src="{icon_url}" alt="{safe_name}" width="54" height="54" /><br /><sub><b>{safe_name}</b></sub></td>'
            )
        rows.append("<tr>" + "".join(cells) + "</tr>")
    return "<table>" + "".join(rows) + "</table>"


def render_subject_matrix(projects: list[dict[str, str]]) -> str:
    chips = []
    for idx, project in enumerate(projects[:7]):
        subject = html.escape(project.get("subject", "TBD"))
        stack = html.escape(project.get("stack", "TBD"))
        color = SUBJECT_COLORS[idx % len(SUBJECT_COLORS)]
        chips.append(
            f"<img src=\"https://img.shields.io/badge/{urllib.parse.quote(subject)}-{urllib.parse.quote(stack)}-{color}?style=for-the-badge\" alt=\"{subject} {stack}\" />"
        )
    return "\n".join(chips)


def render_progress_bar(pct: float) -> str:
    filled = max(0, min(10, int(round(pct / 10.0))))
    return "█" * filled + "░" * (10 - filled)


def render_analytics_table(report: dict[str, Any]) -> str:
    total_files = report.get("scanned_files", 0)
    tracked_files = report.get("tracked_language_files", 0)
    lines = [
        "| Language | Files | Lines | Share |",
        "| --- | ---: | ---: | --- |",
    ]

    for item in report.get("languages", [])[:10]:
        lang = html.escape(str(item.get("language", "")))
        files = int(item.get("files", 0))
        code_lines = int(item.get("lines", 0))
        pct = (files / tracked_files * 100) if tracked_files > 0 else 0
        lines.append(f"| **{lang}** | {files:,} | {code_lines:,} | `{render_progress_bar(pct)}` {pct:.1f}% |")

    lines.extend(
        [
            "",
            f"**Scan Summary:** {total_files:,} total files • {tracked_files:,} language files",
            "",
        ]
    )
    return "\n".join(lines)


def render_highlights(projects: list[dict[str, str]]) -> str:
    return "\n".join(
        [
            "### 🎯 Portfolio Highlights",
            "",
            "| Feature | Details |",
            "| --- | --- |",
            "| **Years Covered** | 2024-2026 (1st & 2nd Year CSE) |",
            f"| **Total Projects** | {len(projects)} major subject streams |",
            "| **Code Files Tracked** | 750+ language files |",
            "| **Implementation Focus** | Labs, assignments, and practical coursework |",
            "| **Professional Goal** | Exam revision, portfolio clarity, skill demonstration |",
            "",
        ]
    )


def render_project_structure() -> str:
    return """
```text
PROGRAMMING-RELATED/
├── 1st-Year/
│   └── Programming for Problem Solving
│
└── 2nd-Year/
    ├── 2-1/
    │   ├── Data Structures
    │   └── Object Oriented Programming
    │
    └── 2-2/
        ├── Web Technologies
        ├── Design and Analysis of Algorithms
        ├── Operating Systems
        └── Assembly Language Programming
```
""".strip()


def build_project_rows(projects: list[dict[str, str]]) -> str:
    rows = [
        "<!-- AUTO:PROJECT_DIRECTORY:START -->",
        "| # | Project | Subject | Languages | Status |",
        "| --- | --- | --- | --- | --- |",
    ]

    for idx, item in enumerate(projects, 1):
        project = html.escape(item.get("project", "Untitled"))
        subject = html.escape(item.get("subject", "N/A"))
        stack = html.escape(item.get("stack", ""))
        rows.append(f"| {idx} | **{project}** | {subject} | `{stack}` | ✅ Active |")

    rows.append("<!-- AUTO:PROJECT_DIRECTORY:END -->")
    return "\n".join(rows)


def build_readme(report: dict[str, Any], projects: list[dict[str, str]], commits: list[dict[str, str]]) -> str:
    timestamp = report.get("generated_at_utc", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))

    languages = [
        (lang, LANGUAGE_ICON_MAP[lang])
        for lang in ["C", "Java", "HTML", "C++", "Python", "Assembly"]
        if lang in LANGUAGE_ICON_MAP
    ]
    frameworks = [(fw, FRAMEWORK_ICON_MAP[fw]) for fw in ["Maven", "JDBC"] if fw in FRAMEWORK_ICON_MAP]

    commit_feed = "\n".join(
        [
            f"| [`{c['sha']}`]({c['url']}) | {html.escape(c['message'][:62])} | {html.escape(c['author'])} | {html.escape(c['timestamp'])} |"
            for c in commits[:5]
        ]
    )
    if not commit_feed:
        commit_feed = "| - | No recent commits. | - | - |"

    return f"""<!-- AUTO-GENERATED: Edit .github/readme-automation/data/project_directory.json and run generate_readme.py -->

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&height=210&color=0:0a0e27,50:00DDFF,100:39FF14&text=PROGRAMMING-RELATED&fontColor=ffffff&fontSize=50&animation=fadeIn&desc=Structured%20Coursework%20%7C%20Labs%20%7C%20Implementation&descAlignY=63" alt="Hero Banner" />

### 📘 STUDENT COURSEWORK

*Comprehensive coursework spanning foundational problem-solving through advanced algorithms and systems programming*

<img src="https://img.shields.io/badge/Years-2024--2026-00DDFF?style=for-the-badge" alt="Years" />
<img src="https://img.shields.io/badge/Projects-7-39FF14?style=for-the-badge" alt="Projects" />
<img src="https://img.shields.io/badge/Languages-12+-FF00FF?style=for-the-badge" alt="Languages" />
<img src="https://img.shields.io/github/last-commit/{OWNER}/{REPO}/main?label=Updated&style=for-the-badge&color=00FF88" alt="Last Update" />

</div>

---

## 📖 Purpose & Vision

**PROGRAMMING-RELATED** is a structured repository capturing academic progression across computer science fundamentals:

- **Clarity:** Well-organized coursework by year and subject for easy navigation
- **Completeness:** Full lab implementations, assignments, and practical code exercises
- **Professional:** Portfolio-quality code structure and documentation
- **Growth:** Clear progression from foundational concepts in Year 1 to advanced systems in Year 2

This portfolio demonstrates disciplined coding practices, algorithm implementation mastery, and real-world software engineering principles.

---

## 🗂️ Subject Portfolio Matrix

<div align="center">
{render_subject_matrix(projects)}
</div>

{render_highlights(projects)}

---

{render_neon_banner("📊 REPOSITORY ANALYTICS", "fadeIn", "cyan")}

{render_analytics_table(report)}

---

{render_neon_banner("🎓 COURSE BREAKDOWN", "slideIn", "magenta")}

{build_project_rows(projects)}

> **Source:** Auto-synced from `.github/readme-automation/data/project_directory.json` + Git metadata

---

{render_neon_banner("🛠 TECH STACK & TOOLS", "scaleIn", "lime")}

### Languages

<div align="center">
{render_icon_table(languages, columns=3)}
</div>

### Frameworks & Libraries

<div align="center">
{render_icon_table(frameworks + [("XAMPP", "https://img.shields.io/badge/XAMPP-FB7A24?style=for-the-badge&logo=xampp&logoColor=white")], columns=3)}
</div>

### Development Tools

<div align="center">
{render_icon_table(TOOLS, columns=3)}
</div>

### What We Optimize For

| Area | Focus |
| --- | --- |
| **Code Quality** | Clean architecture, readable implementation, modular design |
| **Reproducibility** | Makefile support, dependency clarity, cross-platform testing |
| **Documentation** | Clear comments, structured READMEs, lab reports alongside code |
| **Professional Practice** | Git hygiene, version control discipline, commit clarity |

---

{render_neon_banner("🚀 RECENT ACTIVITY", "blinking", "purple")}

| Commit | Message | Author | Date |
| --- | --- | --- | --- |
{commit_feed}

---

{render_neon_banner("📁 PROJECT STRUCTURE", "fadeIn", "blue")}

### Repository Organization

{render_project_structure()}

### Typical Project Flow

**Idea → Learning → Implementation → Testing → Documentation → Showcase**

Each subject stream follows disciplined software engineering practices with clear separation of concerns, comprehensive testing where applicable, and documentation standards for peer review and future revision.

---

{render_neon_banner("👤 PORTFOLIO AUTHOR", "fadeIn", "pink")}

### Rishit Ghosh

**Student | Software Engineer | Open Source Enthusiast**

| Link | Details |
| --- | --- |
| **Portfolio** | [GitHub Profile](https://rajghosh06-dev.github.io/portfolio/) |
| **GitHub** | [@rajghosh06-dev](https://github.com/rajghosh06-dev) |
| **Organization** | [Code-Crew-Nexus](https://github.com/Code-Crew-Nexus) |
| **Institution** | B.Tech CSE (AI & ML) @ GCET, Hyderabad |
| **Last Updated** | `{timestamp}` |

---

{render_neon_banner("📜 LICENSE & USAGE", "slideIn", "cyan")}

This repository is licensed under the **MIT License**. See [📋 LICENSE]({LICENSE_URL}) for complete terms.

**Usage:** These materials are provided for educational reference, portfolio demonstration, and peer learning. Feel free to fork, study, and adapt for your own learning journey.

---

<p align="center"><em>🎓 Building disciplined code, professional standards, and durable learning outcomes</em></p>
"""


def main() -> None:
    report = refresh_language_report()
    projects = load_projects()
    commits = get_recent_commits(limit=5)

    readme_content = build_readme(report, projects, commits)
    README_PATH.write_text(readme_content, encoding="utf-8")
    PROFILE_README_PATH.parent.mkdir(parents=True, exist_ok=True)
    PROFILE_README_PATH.write_text(readme_content, encoding="utf-8")
    print("OK: Comprehensive README generated successfully!")


if __name__ == "__main__":
    main()
