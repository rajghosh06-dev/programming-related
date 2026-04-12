# README Automation Tools (Compatibility Layer)

Primary automation now lives in `.github/readme-automation`.

This `tools` folder keeps wrapper scripts so older commands still work.

## What This Folder Does

The wrapper layer forwards to the current automation pipeline.

- `.github/readme-automation/analyze_repo.py` scans the repository and produces language and directory statistics.
- `.github/readme-automation/generate_readme.py` rebuilds the full root README from local repository data.
- `.github/readme-automation/update_project_directory.py` updates only the Project Directory section from JSON.
- `.github/readme-automation/validate_readme_assets.py` checks README URLs, badges, and external assets.
- `.github/readme-automation/refresh_readme.ps1` runs the full local refresh pipeline in the correct order.

## Files

- `.github/readme-automation/data/project_directory.json`: single source of truth for the Project Directory table.
- `.github/readme-automation/reports/language_report.json`: machine-readable repository statistics.
- `.github/readme-automation/reports/language_report.md`: human-readable report for quick review.
- `README.md` at the repository root: generated documentation output.

## How To Use

Use the primary refresh script from the repository root when you want a full rebuild.

```powershell
powershell -ExecutionPolicy Bypass -File .\.github\readme-automation\refresh_readme.ps1 -VerboseOutput
```

That command performs three steps:

1. Regenerates repository analytics and the full README.
2. Replaces only the Project Directory block from `.github/readme-automation/data/project_directory.json`.
3. Validates all README URLs and external assets.

If you want to run the pieces manually, use these commands from the repository root.

```powershell
python .\.github\readme-automation\generate_readme.py
python .\.github\readme-automation\update_project_directory.py
python .\.github\readme-automation\validate_readme_assets.py
```

## When To Edit What

- Edit `.github/readme-automation/data/project_directory.json` if you only want to change the Project Directory section.
- Edit `.github/readme-automation/generate_readme.py` if you want to change the layout, sections, or styling of the README.
- Edit `.github/readme-automation/analyze_repo.py` if you want to change how repository statistics are calculated.
- Edit `.github/readme-automation/validate_readme_assets.py` if you want to adjust validation rules or soft-fail URLs.

## GitHub Automation

The workflow at `.github/workflows/sync-readme.yml` runs on schedule and on selected file changes. It regenerates the README and reports, then commits the updated files automatically when needed.

## Notes

- The README is generated from repository data, so manual edits to the root README will be overwritten on refresh.
- The Project Directory is intentionally isolated so you can correct that section without touching the rest of the README.
- The validation step may warn on hosts that block automated requests, but those warnings are handled separately from real failures.

## Backward Compatibility

- Existing commands under `tools/*.py` and `tools/refresh_readme.ps1` still work.
- Those files forward execution to `.github/readme-automation`.
