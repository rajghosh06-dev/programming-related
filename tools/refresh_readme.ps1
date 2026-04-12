Param(
    [switch]$VerboseOutput
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$command = Join-Path $repoRoot ".github\readme-automation\refresh_readme.ps1"
if ($VerboseOutput) {
    & powershell -ExecutionPolicy Bypass -File $command -VerboseOutput
} else {
    & powershell -ExecutionPolicy Bypass -File $command
}
