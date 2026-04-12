#!/usr/bin/env python3
"""Validate external URLs used in README markdown/image links."""

from __future__ import annotations

import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
README_PATHS = [ROOT / "README.md", ROOT / ".github" / "profile" / "README.md"]
TIMEOUT_SECONDS = 12

URL_PATTERN = re.compile(r"https?://[^\s)\"]+")
MD_LINK_PATTERN = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
SOFT_FAIL_HOSTS = {"linkedin.com", "www.linkedin.com"}


def extract_urls(text: str) -> list[str]:
    urls = URL_PATTERN.findall(text)
    unique: list[str] = []
    for url in urls:
        if url not in unique:
            unique.append(url)
    return unique


def extract_relative_links(text: str) -> list[str]:
    links = MD_LINK_PATTERN.findall(text)
    relative: list[str] = []
    for link in links:
        target = link.strip()
        if not target:
            continue
        if target.startswith(("http://", "https://", "mailto:", "#")):
            continue
        if target.startswith("<") and target.endswith(">"):
            target = target[1:-1].strip()
        if target not in relative:
            relative.append(target)
    return relative


def check_url(url: str) -> tuple[bool, int | None, str | None]:
    headers = {"User-Agent": "programming-related-readme-validator"}

    for method in ("HEAD", "GET"):
        request = urllib.request.Request(url, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                status = getattr(response, "status", 200)
                return 200 <= status < 400, status, None
        except urllib.error.HTTPError as error:
            if method == "HEAD" and error.code in {403, 405}:
                continue
            return False, error.code, str(error)
        except (urllib.error.URLError, TimeoutError) as error:
            if method == "HEAD":
                continue
            return False, None, str(error)

    return False, None, "Unknown error"


def main() -> int:
    all_urls: list[str] = []
    relative_failures: list[tuple[Path, str]] = []

    for readme_path in README_PATHS:
        if not readme_path.exists():
            continue
        text = readme_path.read_text(encoding="utf-8")
        urls = extract_urls(text)
        for url in urls:
            if url not in all_urls:
                all_urls.append(url)

        for rel in extract_relative_links(text):
            normalized = rel.split("#", 1)[0].split("?", 1)[0].strip()
            if not normalized:
                continue
            resolved = (readme_path.parent / normalized).resolve()
            if not resolved.exists():
                relative_failures.append((readme_path, rel))

    failures: list[tuple[str, int | None, str | None]] = []
    warnings: list[tuple[str, int | None, str | None]] = []
    for url in all_urls:
        ok, status, error = check_url(url)
        if not ok:
            host = urllib.parse.urlparse(url).netloc.lower()
            if host in SOFT_FAIL_HOSTS and status in {403, 429, 999}:
                warnings.append((url, status, error))
            else:
                failures.append((url, status, error))

    if warnings:
        print("README asset validation warnings (non-fatal):")
        for url, status, error in warnings:
            print(f"- {url} | status={status} | error={error}")

    if relative_failures:
        print("README relative-link validation failed.")
        for readme_path, rel in relative_failures:
            print(f"- {readme_path.relative_to(ROOT)} | broken target={rel}")
        return 1

    if failures:
        print("README asset validation failed.")
        for url, status, error in failures:
            print(f"- {url} | status={status} | error={error}")
        return 1

    print(f"README asset validation passed ({len(all_urls)} URLs checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
