$ErrorActionPreference = 'Stop'
Push-Location (Resolve-Path (Join-Path $PSScriptRoot '../..'))
try {
    node scripts/maintenance/verify-source.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Source verification failed' }
    npm --prefix frontend run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
    npm --prefix backend test
    if ($LASTEXITCODE -ne 0) { throw 'HTTP tests failed' }
    npm --prefix backend run test:functional
    if ($LASTEXITCODE -ne 0) { throw 'Functional API tests failed' }
    git -c core.safecrlf=false diff --check
    if ($LASTEXITCODE -ne 0) { throw 'Working tree whitespace check failed' }
    git -c core.safecrlf=false diff --cached --check
    if ($LASTEXITCODE -ne 0) { throw 'Staged whitespace check failed' }
    Write-Host 'Local release checks passed. No commit or push was performed.'
} finally {
    Pop-Location
}
