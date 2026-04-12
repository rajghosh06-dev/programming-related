#!/usr/bin/env python3
"""Compatibility wrapper. Use .github/readme-automation/validate_readme_assets.py."""

from __future__ import annotations

import runpy
from pathlib import Path


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    target = repo_root / ".github" / "readme-automation" / "validate_readme_assets.py"
    runpy.run_path(str(target), run_name="__main__")
