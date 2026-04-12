Param(
    [switch]$VerboseOutput
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot

function Invoke-Step {
    param(
        [string]$Command
    )

    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Command"
    }
}

Push-Location $repoRoot
try {
    if ($VerboseOutput) {
        Write-Host "[1/2] Generating repository analytics and full README..."
    }
    Invoke-Step "python .\tools\generate_readme.py"

    if ($VerboseOutput) {
        Write-Host "[2/3] Refreshing Project Directory from JSON..."
    }
    Invoke-Step "python .\tools\update_project_directory.py"

    if ($VerboseOutput) {
        Write-Host "[3/3] Validating README badges and external assets..."
    }
    Invoke-Step "python .\tools\validate_readme_assets.py"

    Write-Host "README refresh completed."
}
finally {
    Pop-Location
}
