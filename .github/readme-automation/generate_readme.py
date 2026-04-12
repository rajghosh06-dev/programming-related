#!/usr/bin/env python3
"""
Generate professional, comprehensive README for PROGRAMMING-RELATED.
Integrated analytics, narrative structure, and professional tech specs.
"""

from __future__ import annotations

import html
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import analyze_repo

ROOT = Path(__file__).resolve().parents[2]
AUTOMATION_DIR = ROOT / ".github" / "readme-automation"
DATA_DIR = AUTOMATION_DIR / "data"
README_PATH = ROOT / "README.md"

OWNER = "rajghosh06-dev"
REPO = "programming-related"
REPO_URL = f"https://github.com/{OWNER}/{REPO}"

# Neon Color Palette
NEON_COLORS = {
    "cyan": ("00DDFF", "00FF88"),
    "magenta": ("FF00FF", "FF1493"),
    "lime": ("39FF14", "00FF00"),
    "purple": ("B310F0", "9D4EDD"),
    "blue": ("0099FF", "00D4FF"),
    "pink": ("FF006E", "FF1493"),
}

LANGUAGE_ICON_MAP = {
    "Assembly": "https://img.shields.io/badge/ASM-FF006E?style=flat-square&logo=gnuassembler&logoColor=white",
    "C": "https://raw.githubusercontent.com/devicons/devicon/master/icons/c/c-original.svg",
    "C++": "https://raw.githubusercontent.com/devicons/devicon/master/icons/cplusplus/cplusplus-original.svg",
    "CSS": "https://raw.githubusercontent.com/devicons/devicon/master/icons/css3/css3-original.svg",
    "HTML": "https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original.svg",
    "Java": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "JavaScript": "https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg",
    "PHP": "https://raw.githubusercontent.com/devicons/devicon/master/icons/php/php-original.svg",
    "Python": "https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg",
    "SQL": "https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original.svg",
}

FRAMEWORK_ICON_MAP = {
    "JDBC": "https://raw.githubusercontent.com/devicons/devicon/master/icons/java/java-original.svg",
    "Maven": "https://raw.githubusercontent.com/devicons/devicon/master/icons/maven/maven-original.svg",
    "NumPy": "https://raw.githubusercontent.com/devicons/devicon/master/icons/numpy/numpy-original.svg",
    "Pandas": "https://raw.githubusercontent.com/devicons/devicon/master/icons/pandas/pandas-original.svg",
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
    """Execute git command."""
    try:
        result = subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def load_projects() -> list[dict[str, str]]:
    """Load projects from JSON."""
    path = DATA_DIR / "project_directory.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def refresh_language_report() -> dict[str, Any]:
    """Generate language report."""
    report = analyze_repo.collect_stats()
    analyze_repo.write_reports(report)
    return report


def get_recent_commits(limit: int = 5) -> list[dict[str, str]]:
    """Get recent commits."""
    fmt = "%H%x1f%h%x1f%an%x1f%ad%x1f%s"
    output = run_git(["log", f"-n{limit}", f"--pretty=format:{fmt}", "--date=iso-strict"])
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
        
        commits.append({
            "message": subject,
            "author": author,
            "timestamp": ts,
            "sha": short_sha,
            "url": f"{REPO_URL}/commit/{full_sha}",
        })
    return commits


def render_neon_banner(text: str, animation: str, color_key: str) -> str:
    """Create a glass-style section banner."""
    color_hex, accent_hex = NEON_COLORS.get(color_key, ("00DDFF", "00FF88"))
    r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
    accent_r, accent_g, accent_b = int(accent_hex[0:2], 16), int(accent_hex[2:4], 16), int(accent_hex[4:6], 16)
    return f'''
<div align="center" style="margin: 18px 0 10px;">
<div style="display: inline-block; padding: 12px 22px; border-radius: 18px; border: 1px solid rgba({r}, {g}, {b}, 0.4); background: linear-gradient(135deg, rgba({r}, {g}, {b}, 0.18), rgba({accent_r}, {accent_g}, {accent_b}, 0.10)); backdrop-filter: blur(14px); box-shadow: 0 12px 32px rgba({r}, {g}, {b}, 0.14), inset 0 1px 1px rgba(255, 255, 255, 0.18);">
<strong style="color: #ffffff; font-size: 1.2rem; letter-spacing: 0.04em; text-shadow: 0 0 10px rgba({r}, {g}, {b}, 0.85);">{html.escape(text)}</strong>
</div>
</div>'''


def render_icon_table(items: list[tuple[str, str]], columns: int) -> str:
    """Render icon table with glass morphism."""
    if not items:
        return "*No items detected.*"
    blocks = []
    for index in range(0, len(items), columns):
        row = items[index:index + columns]
        width = max(1, 100 // max(1, len(row)))
        cells = []
        for name, icon_url in row:
            safe_name = html.escape(name)
            cells.append(
                f'<td align="center" width="{width}%" style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 8px; background: rgba(0, 221, 255, 0.05); backdrop-filter: blur(8px);"><img src="{icon_url}" alt="{safe_name}" width="56" height="56" style="filter: drop-shadow(0 0 4px rgba(0, 221, 255, 0.3));" /><br /><strong style="color: rgba(0, 221, 255, 0.9); margin-top: 8px; display: block;">{safe_name}</strong></td>'
            )
        blocks.append('<table style="width: 100%; border-collapse: collapse; background: rgba(0, 221, 255, 0.03); border-radius: 8px; border: 1px solid rgba(0, 221, 255, 0.15);"><tr>' + "".join(cells) + "</tr></table>")
    return '<div align="center" style="margin: 12px 0;">\n' + "\n".join(blocks) + "\n</div>"


def render_analytics_table(report: dict[str, Any]) -> str:
    """Render analytics dashboard with contribution breakdown in a unified glass theme."""
    total_files = report.get("scanned_files", 0)
    tracked_files = report.get("tracked_language_files", 0)
    
    lang_rows = []
    for item in report.get("languages", [])[:10]:
        lang = html.escape(str(item.get("language", "")))
        files = item.get("files", 0)
        lines = item.get("lines", 0)
        pct = (files / tracked_files * 100) if tracked_files > 0 else 0
        lang_rows.append(f"<tr style='background: rgba(0, 221, 255, 0.05);'><td style='padding: 10px; border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 4px;'><strong>{lang}</strong></td><td style='padding: 10px; border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 4px; text-align: right;'>{files:,}</td><td style='padding: 10px; border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 4px; text-align: right;'>{lines:,}</td><td style='padding: 10px; border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 4px; text-align: right;'>{pct:.1f}%</td></tr>")
    
    return f"""<table style="width: 100%; border-collapse: collapse; background: rgba(24, 10, 42, 0.62); border: 1px solid rgba(255, 0, 255, 0.24); border-radius: 14px; backdrop-filter: blur(14px); overflow: hidden; margin: 12px 0; box-shadow: 0 14px 34px rgba(255, 0, 255, 0.10);">
<tr style="background: rgba(255, 0, 255, 0.14); border-bottom: 2px solid rgba(255, 0, 255, 0.25);">
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: left;"><strong>Language</strong></th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: right;"><strong>Files</strong></th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: right;"><strong>Lines</strong></th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: right;"><strong>Contribution</strong></th>
</tr>
{"".join(row.replace("rgba(0, 221, 255, 0.05)", "rgba(255, 0, 255, 0.05)") for row in lang_rows)}
</table>

**📊 Scan Summary:** {total_files:,} total files • {tracked_files:,} language files

**Languages Detected:** 12+  
**Primary Stacks:** C (37.1%) • Java (23.2%) • Web Tech (15.5%)  
**Coverage:** Foundational to Advanced Computer Science

"""


def render_subject_matrix(projects: list[dict[str, str]]) -> str:
    """Render subject contribution matrix with glass morphism."""
    grid = '<div align="center" style="background: rgba(0, 221, 255, 0.05); border-radius: 16px; padding: 20px; backdrop-filter: blur(10px); border: 1px solid rgba(0, 221, 255, 0.2); margin: 12px auto; max-width: 920px;">\n<table align="center" style="margin: 0 auto; border-collapse: separate; border-spacing: 8px;">\n<tr>\n'
    
    for i, project in enumerate(projects[:7]):
        subject = html.escape(project.get("subject", "TBD"))
        stack = html.escape(project.get("stack", "TBD"))
        
        neon_colors = ["cyan", "magenta", "lime", "purple", "blue", "pink", "cyan"]
        color = neon_colors[i % len(neon_colors)]
        color_code = NEON_COLORS[color][0]
        r, g, b = int(color_code[0:2], 16), int(color_code[2:4], 16), int(color_code[4:6], 16)
        
        grid += f'<td align="center" valign="middle" style="padding: 14px; text-align: center; vertical-align: middle; border: 2px solid #{color_code}; border-radius: 12px; background: rgba({r}, {g}, {b}, 0.12); backdrop-filter: blur(8px); box-shadow: 0 4px 16px rgba({r}, {g}, {b}, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2); min-width: 140px;"><strong style="color: #{color_code}; text-shadow: 0 0 8px #{color_code};">{subject}</strong><br /><small style="color: rgba({r}, {g}, {b}, 0.9);">{stack}</small></td>\n'
        if (i + 1) % 4 == 0 or i == len(projects) - 1:
            grid += '</tr>\n' + ('<tr>\n' if i < len(projects) - 1 else '')
    
    grid += '\n</table>\n</div>'
    return grid


def render_project_structure() -> str:
    """Render a compact repository structure with only top-level subject groups."""
    return """
<div style="background: rgba(24, 10, 42, 0.6); border: 1px solid rgba(255, 0, 255, 0.22); border-radius: 14px; padding: 18px; backdrop-filter: blur(14px); box-shadow: 0 14px 34px rgba(255, 0, 255, 0.10); margin: 12px 0;">

```
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

</div>
""".strip()


def build_project_rows(projects: list[dict[str, str]]) -> str:
    """Build project directory table with glass morphism."""
    rows = [
        "<!-- AUTO:PROJECT_DIRECTORY:START -->",
        '<table style="width: 100%; border-collapse: collapse; background: rgba(24, 10, 42, 0.62); border: 1px solid rgba(255, 0, 255, 0.24); border-radius: 14px; backdrop-filter: blur(14px); overflow: hidden; box-shadow: 0 14px 34px rgba(255, 0, 255, 0.10);">',
        '<tr style="background: rgba(255, 0, 255, 0.14); border-bottom: 2px solid rgba(255, 0, 255, 0.25);"><th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: center;"><strong>#</strong></th><th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: left;"><strong>Project</strong></th><th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: left;"><strong>Subject</strong></th><th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: left;"><strong>Languages</strong></th><th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: center;"><strong>Status</strong></th></tr>',
    ]
    for idx, item in enumerate(projects, 1):
        project = html.escape(item.get("project", ""))
        subject = html.escape(item.get("subject", ""))
        stack = html.escape(item.get("stack", ""))
        bg_style = 'background: rgba(255, 0, 255, 0.08);' if idx % 2 == 0 else 'background: rgba(255, 0, 255, 0.04);'
        rows.append(f'<tr style="{bg_style}"><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: center;"><strong>{idx}</strong></td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px;"><strong>{project}</strong></td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px;">{subject}</td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px;"><code>{stack}</code></td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.16); border-radius: 4px; text-align: center;">✅ Active</td></tr>')
    
    rows.append("</table>")
    rows.append("<!-- AUTO:PROJECT_DIRECTORY:END -->")
    return "\n".join(rows)


def render_highlights(projects: list[dict[str, str]]) -> str:
    """Render key highlights and features with glass morphism."""
    highlights = f"""
### 🎯 Portfolio Highlights

<table style="width: 100%; border-collapse: collapse; background: rgba(57, 255, 20, 0.05); border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 8px; backdrop-filter: blur(10px); overflow: hidden;">
<tr style="background: rgba(57, 255, 20, 0.1); border-bottom: 2px solid rgba(57, 255, 20, 0.3);">
<th style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px; text-align: left;"><strong>Feature</strong></th>
<th style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px; text-align: left;"><strong>Details</strong></th>
</tr>
<tr style="background: rgba(57, 255, 20, 0.03);">
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;"><strong>Years Covered</strong></td>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;">2024-2026 (1st & 2nd Year CSE)</td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;"><strong>Total Projects</strong></td>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;">{len(projects)} major subject streams</td>
</tr>
<tr style="background: rgba(57, 255, 20, 0.03);">
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;"><strong>Code Files Tracked</strong></td>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;">750+ language files</td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;"><strong>Implementation Focus</strong></td>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;">Labs, assignments, and practical coursework</td>
</tr>
<tr style="background: rgba(57, 255, 20, 0.03);">
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;"><strong>Professional Goal</strong></td>
<td style="padding: 12px; border: 1px solid rgba(57, 255, 20, 0.2); border-radius: 4px;">Exam revision, portfolio clarity, skill demonstration</td>
</tr>
</table>

"""
    return highlights


def build_readme(report: dict[str, Any], projects: list[dict[str, str]], commits: list[dict[str, str]]) -> str:
    """Build complete README with glass morphism effects."""
    timestamp = report.get("generated_at_utc", datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"))
    
    languages = [(lang, LANGUAGE_ICON_MAP[lang]) for lang in ["C", "Java", "HTML", "C++", "Python", "Assembly"] if lang in LANGUAGE_ICON_MAP]
    frameworks = [(fw, FRAMEWORK_ICON_MAP[fw]) for fw in ["Maven", "JDBC"] if fw in FRAMEWORK_ICON_MAP]
    
    commit_rows = []
    for index, commit in enumerate(commits[:4]):
        row_style = 'background: rgba(255, 0, 255, 0.08);' if index % 2 == 0 else 'background: rgba(255, 0, 255, 0.04);'
        commit_rows.append(
            f'<tr style="{row_style}"><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;"><a href="{commit["url"]}" style="color: #FF00FF; text-decoration: none; font-weight: 600;">{html.escape(commit["sha"])}</a></td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">{html.escape(commit["message"][:60])}</td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">{html.escape(commit["author"])}</td><td style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">{html.escape(commit["timestamp"])}</td></tr>'
        )
    commit_feed = "\n".join(commit_rows) if commit_rows else '<tr><td colspan="4" style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">No recent commits.</td></tr>'
    
    # Glass morphism badge styling
    badge_style = 'style="background: rgba(0, 221, 255, 0.1); border: 1px solid rgba(0, 221, 255, 0.3); border-radius: 12px; padding: 8px 16px; backdrop-filter: blur(10px); display: inline-block; margin: 4px;"'
    
    return f"""<!-- AUTO-GENERATED: Edit .github/readme-automation/data/project_directory.json and run generate_readme.py -->

<div align="center" style="backdrop-filter: blur(20px); background: radial-gradient(circle, rgba(0, 221, 255, 0.05), rgba(57, 255, 20, 0.02)); padding: 20px; border-radius: 20px; border: 1px solid rgba(0, 221, 255, 0.2); margin: 10px 0;">

<img src="https://capsule-render.vercel.app/api?type=waving&height=200&color=0:0a0e27,50:00DDFF,100:39FF14&text=PROGRAMMING-RELATED&fontColor=ffffff&fontSize=50&animation=fadeIn&desc=Structured%20Coursework%20%7C%20Labs%20%7C%20Implementation&descAlignY=63" alt="Hero Banner" />

### 📚 Academic Engineering Portfolio

*Comprehensive coursework spanning foundational problem-solving through advanced algorithms and systems programming*

<div {badge_style}>
<img src="https://img.shields.io/badge/Years-2024--2026-00DDFF?style=flat-square" alt="Years" />
<img src="https://img.shields.io/badge/Projects-7-39FF14?style=flat-square" alt="Projects" />
<img src="https://img.shields.io/badge/Languages-12+-FF00FF?style=flat-square" alt="Languages" />
<img src="https://img.shields.io/github/last-commit/{OWNER}/{REPO}/main?label=Updated&style=flat-square&color=00FF88" alt="Last Update" />
</div>

</div>

---

<div style="background: rgba(57, 255, 20, 0.08); border-left: 4px solid #39FF14; border-radius: 8px; padding: 16px; backdrop-filter: blur(10px); margin: 16px 0;">

## 📖 Purpose & Vision

**PROGRAMMING-RELATED** is a structured repository capturing academic progression across computer science fundamentals:

- **Clarity:** Well-organized coursework by year and subject for easy navigation
- **Completeness:** Full lab implementations, assignments, and practical code exercises  
- **Professional:** Portfolio-quality code structure and documentation
- **Growth:** Clear progression from foundational concepts in Year 1 to advanced systems in Year 2

This portfolio demonstrates disciplined coding practices, algorithm implementation mastery, and real-world software engineering principles.

</div>

---

## 🗂️ Subject Portfolio Matrix

{render_subject_matrix(projects)}

{render_highlights(projects)}

---

<div align="center">{render_neon_banner("📊 REPOSITORY ANALYTICS", "fadeIn", "cyan")}</div>

{render_analytics_table(report)}

---

<div align="center">{render_neon_banner("🎓 COURSE BREAKDOWN", "slideIn", "magenta")}</div>

{build_project_rows(projects)}

> **Source:** Auto-synced from `.github/readme-automation/data/project_directory.json` + Git metadata

---

<div align="center">{render_neon_banner("🛠 TECH STACK & TOOLS", "scaleIn", "lime")}</div>

### Languages

Foundational & production-ready languages used across all projects:

{render_icon_table(languages, columns=3)}

### Frameworks & Libraries

Build systems and specialized tools for specific domains:

{render_icon_table(frameworks + [("XAMPP", "https://img.shields.io/badge/XAMPP-FB7A24?style=flat-square&logo=xampp&logoColor=white")], columns=3)}

### Development Tools

Professional-grade IDEs and utilities for coding, debugging, and version control:

{render_icon_table(TOOLS, columns=3)}

### What We Optimize For

<table style="width: 100%; border-collapse: collapse; background: rgba(0, 221, 255, 0.05); border: 1px solid rgba(0, 221, 255, 0.2); border-radius: 8px; backdrop-filter: blur(10px); overflow: hidden;">
<tr style="background: rgba(0, 221, 255, 0.1);">
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;"><strong>Code Quality</strong></td>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;">Clean architecture, readable implementation, modular design</td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;"><strong>Reproducibility</strong></td>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;">Makefile support, dependency clarity, cross-platform testing</td>
</tr>
<tr style="background: rgba(0, 221, 255, 0.08);">
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;"><strong>Documentation</strong></td>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;">Clear comments, structured READMEs, lab reports alongside code</td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;"><strong>Professional Practice</strong></td>
<td style="padding: 12px; border: 1px solid rgba(0, 221, 255, 0.15); border-radius: 4px;">Git hygiene, version control discipline, commit clarity</td>
</tr>
</table>

---

<div align="center">{render_neon_banner("🚀 RECENT ACTIVITY", "blinking", "purple")}</div>

### Latest Commits

<table style="width: 100%; border-collapse: collapse; background: rgba(255, 0, 255, 0.05); border: 1px solid rgba(255, 0, 255, 0.2); border-radius: 8px; backdrop-filter: blur(10px); overflow: hidden;">
<tr style="background: rgba(255, 0, 255, 0.1);">
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">Commit</th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">Message</th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">Author</th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 255, 0.15); border-radius: 4px;">Date</th>
</tr>
{commit_feed}
</table>

> Latest activity reflects ongoing coursework and continuous improvement across all subjects.

---

<div align="center">{render_neon_banner("📁 PROJECT STRUCTURE", "fadeIn", "blue")}</div>

### Repository Organization

{render_project_structure()}

### Typical Project Flow

**Idea → Learning → Implementation → Testing → Documentation → Showcase**

Each subject stream follows disciplined software engineering practices with clear separation of concerns, comprehensive testing where applicable, and documentation standards for peer review and future revision.

---

<div align="center">{render_neon_banner("👤 PORTFOLIO AUTHOR", "fadeIn", "pink")}</div>

### Rishit Ghosh

**Student | Software Engineer | Open Source Enthusiast**

<table style="width: 100%; border-collapse: collapse; background: rgba(255, 0, 110, 0.05); border: 1px solid rgba(255, 0, 110, 0.2); border-radius: 8px; backdrop-filter: blur(10px); overflow: hidden; margin: 12px 0;">
<tr style="background: rgba(255, 0, 110, 0.1);">
<th style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px; text-align: left;">Link</th>
<th style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px; text-align: left;">Details</th>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><strong>Portfolio</strong></td>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><a href="https://github.com/rajghosh06-dev" style="color: #FF006E; text-decoration: none; border-bottom: 2px solid #FF006E;">GitHub Profile</a></td>
</tr>
<tr style="background: rgba(255, 0, 110, 0.05);">
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><strong>GitHub</strong></td>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><a href="https://github.com/rajghosh06-dev" style="color: #FF006E; text-decoration: none; border-bottom: 2px solid #FF006E;">@rajghosh06-dev</a></td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><strong>Organization</strong></td>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><a href="https://github.com/Code-Crew-Nexus" style="color: #FF006E; text-decoration: none; border-bottom: 2px solid #FF006E;">Code-Crew-Nexus</a></td>
</tr>
<tr style="background: rgba(255, 0, 110, 0.05);">
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><strong>Institution</strong></td>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;">B.Tech CSE (AI & ML) @ GCET, Hyderabad</td>
</tr>
<tr>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><strong>Last Updated</strong></td>
<td style="padding: 12px; border: 1px solid rgba(255, 0, 110, 0.15); border-radius: 4px;"><code>{timestamp}</code></td>
</tr>
</table>

---

<div align="center">{render_neon_banner("📜 LICENSE & USAGE", "slideIn", "cyan")}</div>

<div style="background: rgba(0, 221, 255, 0.08); border-left: 4px solid #00DDFF; border-radius: 8px; padding: 16px; backdrop-filter: blur(10px); margin: 12px 0;">

This repository is licensed under the **MIT License**. See [📋 LICENSE](./LICENSE) for complete terms.

**Usage:** These materials are provided for educational reference, portfolio demonstration, and peer learning. Feel free to fork, study, and adapt for your own learning journey.

</div>

---

<p align="center" style="background: rgba(0, 221, 255, 0.1); padding: 16px; border-radius: 12px; border: 1px solid rgba(0, 221, 255, 0.2); backdrop-filter: blur(10px); margin: 16px auto;"><em>🎓 Building disciplined code, professional standards, and durable learning outcomes</em></p>
"""


def main():
    """Main function."""
    report = refresh_language_report()
    projects = load_projects()
    commits = get_recent_commits(limit=5)
    
    readme_content = build_readme(report, projects, commits)
    README_PATH.write_text(readme_content, encoding="utf-8")
    print(r"OK: Comprehensive README generated successfully!")


if __name__ == "__main__":
    main()
