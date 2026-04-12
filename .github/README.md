# .github Control Room

This directory is the source of truth for repository automation.

## Automation Map

- `workflows/sync-readme.yml`: scheduled and on-change README synchronization workflow.
- `readme-automation/generate_readme.py`: generates the root `README.md`.
- `readme-automation/analyze_repo.py`: computes repository language and directory analytics.
- `readme-automation/update_project_directory.py`: updates the Project Directory block in the root README.
- `readme-automation/validate_readme_assets.py`: validates external links and badge assets.
- `readme-automation/refresh_readme.ps1`: local one-command automation pipeline.
- `readme-automation/data/project_directory.json`: metadata source for the Project Directory table.
- `readme-automation/reports/`: generated analytics reports.

## Root Layout

The repository root README now focuses on three subject-group layers only:

- `1st-Year/Programming for Problem Solving`
- `2nd-Year/2-1` for Data Structures and Object Oriented Programming
- `2nd-Year/2-2` for Web Technologies, DAA, OS, and Assembly Language Programming

## Local Usage

Run the full refresh from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\.github\readme-automation\refresh_readme.ps1 -VerboseOutput
```

## Notes

- Files under `tools/` are compatibility wrappers that forward to this directory.
- Manual edits to the root `README.md` will be overwritten on refresh.
- The generated README is intended to stay aligned with the repo metadata and current project structure.
