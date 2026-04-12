# README Automation Tools

This folder contains the scripts that keep the root README current, validate links, and generate repository analytics.

## What This Folder Does

The automation is split into a few focused steps.

- `analyze_repo.py` scans the repository and produces language and folder statistics.
- `generate_readme.py` rebuilds the full root README from local repository data.
- `update_project_directory.py` updates only the Project Directory section from JSON.
- `validate_readme_assets.py` checks README URLs, badges, and external assets.
- `refresh_readme.ps1` runs the full local refresh pipeline in the correct order.

## Files

- `data/project_directory.json`: single source of truth for the Project Directory table.
- `reports/language_report.json`: machine-readable repository statistics.
- `reports/language_report.md`: human-readable report for quick review.
- `README.md` at the repository root: generated documentation output.

## How To Use

Use the refresh script from the repository root when you want a full rebuild.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\refresh_readme.ps1 -VerboseOutput
```

That command performs three steps:

1. Regenerates repository analytics and the full README.
2. Replaces only the Project Directory block from `tools/data/project_directory.json`.
3. Validates all README URLs and external assets.

If you want to run the pieces manually, use these commands from the repository root.

```powershell
python .\tools\generate_readme.py
python .\tools\update_project_directory.py
python .\tools\validate_readme_assets.py
```

## When To Edit What

- Edit `tools/data/project_directory.json` if you only want to change the Project Directory section.
- Edit `tools/generate_readme.py` if you want to change the layout, sections, or styling of the README.
- Edit `tools/analyze_repo.py` if you want to change how repository statistics are calculated.
- Edit `tools/validate_readme_assets.py` if you want to adjust validation rules or soft-fail URLs.

## GitHub Automation

The workflow at `.github/workflows/sync-readme.yml` runs on schedule and on selected file changes. It regenerates the README and reports, then commits the updated files automatically when needed.

## Notes

- The README is generated from repository data, so manual edits to the root README will be overwritten on refresh.
- The Project Directory is intentionally isolated so you can correct that section without touching the rest of the README.
- The validation step may warn on hosts that block automated requests, but those warnings are handled separately from real failures.
