#!/usr/bin/env python3
"""Update only the Project Directory section in README from JSON metadata."""

from __future__ import annotations

import html
import json
import subprocess
import urllib.parse
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README_PATH = ROOT / "README.md"
PROJECTS_PATH = ROOT / "tools" / "data" / "project_directory.json"
PROJECT_START = "<!-- AUTO:PROJECT_DIRECTORY:START -->"
PROJECT_END = "<!-- AUTO:PROJECT_DIRECTORY:END -->"
REPO_URL = "https://github.com/rajghosh06-dev/programming-related"


def run_git(args: list[str]) -> str:
    try:
        result = subprocess.run(["git", *args], cwd=ROOT, check=True, capture_output=True, text=True)
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ""


def load_projects() -> list[dict[str, str]]:
    return json.loads(PROJECTS_PATH.read_text(encoding="utf-8"))


def get_branches() -> str:
    branches_text = run_git(["branch", "--format", "%(refname:short)"])
    branches = [line.strip() for line in branches_text.splitlines() if line.strip()] or ["main"]
    return "<br />".join(f"`{html.escape(branch)}`" for branch in branches)


def get_last_update_for_path(path: str) -> str:
    output = run_git(["log", "-1", "--date=short", "--pretty=format:%ad", "--", path])
    if not output:
        return "TBD"
    try:
        return datetime.strptime(output, "%Y-%m-%d").strftime("%b %d, %Y")
    except ValueError:
        return output


def render_table(projects: list[dict[str, str]]) -> str:
    branches_html = get_branches()
    rows = [
        "| PROJECT | SUBJECT | STACK | DESCRIPTION | LAST UPDATE | BRANCHES | REPOSITORY |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]

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

    rows.extend([
    ])
    return "\n".join(rows)


def replace_section(content: str, replacement: str) -> str:
    start_index = content.find(PROJECT_START)
    end_index = content.find(PROJECT_END)
    if start_index == -1 or end_index == -1:
        raise ValueError("Project Directory markers not found in README.md")
    end_index += len(PROJECT_END)
    return content[:start_index] + PROJECT_START + "\n" + replacement + "\n" + PROJECT_END + content[end_index:]


def main() -> None:
    projects = load_projects()
    readme_text = README_PATH.read_text(encoding="utf-8")
    updated = replace_section(readme_text, render_table(projects))
    README_PATH.write_text(updated, encoding="utf-8")
    print("Project Directory section updated successfully.")


if __name__ == "__main__":
    main()
