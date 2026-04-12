#!/usr/bin/env python3
"""Analyze repository source files and generate language/folder statistics."""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable

REPO_ROOT = Path(__file__).resolve().parents[2]
AUTOMATION_DIR = REPO_ROOT / ".github" / "readme-automation"
REPORT_DIR = AUTOMATION_DIR / "reports"
JSON_REPORT = REPORT_DIR / "language_report.json"
MARKDOWN_REPORT = REPORT_DIR / "language_report.md"

EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".c": "C",
    ".h": "C/C++ Header",
    ".cpp": "C++",
    ".cc": "C++",
    ".cxx": "C++",
    ".hpp": "C++ Header",
    ".hh": "C++ Header",
    ".java": "Java",
    ".py": "Python",
    ".php": "PHP",
    ".html": "HTML",
    ".htm": "HTML",
    ".css": "CSS",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".sql": "SQL",
    ".asm": "Assembly",
    ".s": "Assembly",
    ".sh": "Shell",
    ".ps1": "PowerShell",
    ".bat": "Batch",
    ".xml": "XML",
    ".md": "Markdown",
    ".ipynb": "Jupyter Notebook",
    ".json": "JSON",
    ".yml": "YAML",
    ".yaml": "YAML",
}

NAME_LANGUAGE_MAP: Dict[str, str] = {
    "Dockerfile": "Dockerfile",
    "Makefile": "Makefile",
}

IGNORED_DIR_NAMES = {
    ".git",
    ".idea",
    ".vscode",
    "node_modules",
    "__pycache__",
    "out",
    "target",
    "build",
    "dist",
    "bin",
    "obj",
    ".venv",
    "venv",
}

IGNORED_EXTENSIONS = {
    ".class",
    ".jar",
    ".war",
    ".ear",
    ".exe",
    ".dll",
    ".so",
    ".o",
    ".obj",
    ".pdb",
    ".ilk",
    ".hyb",
    ".backup0",
    ".backup1",
    ".backup2",
    ".backup3",
    ".zip",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".pdf",
    ".pptx",
    ".docx",
    ".mp4",
    ".mov",
    ".avi",
    ".wav",
    ".mp3",
}


@dataclass
class LanguageStats:
    files: int = 0
    lines: int = 0


def count_lines(file_path: Path) -> int:
    try:
        with file_path.open("r", encoding="utf-8", errors="ignore") as handle:
            return sum(1 for _ in handle)
    except OSError:
        return 0


def detect_language(file_path: Path) -> str | None:
    if file_path.name in NAME_LANGUAGE_MAP:
        return NAME_LANGUAGE_MAP[file_path.name]
    return EXTENSION_LANGUAGE_MAP.get(file_path.suffix.lower())


def iter_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*"):
        if not path.is_file():
            continue

        relative = path.relative_to(root)
        if any(part in IGNORED_DIR_NAMES for part in relative.parts):
            continue

        if path.suffix.lower() in IGNORED_EXTENSIONS:
            continue

        yield path


def collect_stats() -> dict:
    language_stats: dict[str, LanguageStats] = defaultdict(LanguageStats)
    directory_counter: Counter[str] = Counter()
    scanned_files = 0

    for file_path in iter_files(REPO_ROOT):
        scanned_files += 1
        language = detect_language(file_path)
        if language is None:
            continue

        relative = file_path.relative_to(REPO_ROOT)
        directory_counter[str(relative.parent).replace("\\", "/")] += 1

        stats = language_stats[language]
        stats.files += 1
        stats.lines += count_lines(file_path)

    sorted_languages = sorted(
        language_stats.items(),
        key=lambda item: (item[1].files, item[1].lines),
        reverse=True,
    )

    top_directories = [
        {"path": path, "files": count}
        for path, count in directory_counter.most_common(10)
    ]

    return {
        "generated_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "repository": REPO_ROOT.name,
        "scanned_files": scanned_files,
        "tracked_language_files": sum(stats.files for stats in language_stats.values()),
        "languages": [
            {
                "language": language,
                **asdict(stats),
            }
            for language, stats in sorted_languages
        ],
        "top_directories": top_directories,
    }


def write_reports(report: dict) -> None:
    REPORT_DIR.mkdir(parents=True, exist_ok=True)

    JSON_REPORT.write_text(json.dumps(report, indent=2), encoding="utf-8")

    lines = [
        "# Repository Language Report",
        "",
        f"Generated: {report['generated_at_utc']}",
        f"Repository: {report['repository']}",
        f"Scanned files: {report['scanned_files']}",
        f"Tracked language files: {report['tracked_language_files']}",
        "",
        "## Language Breakdown",
        "",
        "| Language | Files | Lines |",
        "|---|---:|---:|",
    ]

    for item in report["languages"]:
        lines.append(f"| {item['language']} | {item['files']} | {item['lines']} |")

    lines.extend([
        "",
        "## Top Directories by Tracked Files",
        "",
        "| Directory | Files |",
        "|---|---:|",
    ])

    for directory in report["top_directories"]:
        lines.append(f"| {directory['path']} | {directory['files']} |")

    MARKDOWN_REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    output = collect_stats()
    write_reports(output)
    print(f"Report generated: {JSON_REPORT}")
    print(f"Report generated: {MARKDOWN_REPORT}")
