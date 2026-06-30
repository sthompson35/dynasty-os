$ErrorActionPreference = 'Stop'

Write-Host '[1/3] Frontend type/lint check...'
Push-Location 'c:\dynasty_property_os\frontend'
try {
    npm run lint
} finally {
    Pop-Location
}

Write-Host '[2/3] Frontend build...'
Push-Location 'c:\dynasty_property_os\frontend'
try {
    npm run build
} finally {
    Pop-Location
}

Write-Host '[3/3] Backend investor flow tests...'
Push-Location 'c:\dynasty_property_os'
try {
    & 'c:\dynasty_property_os\.venv\Scripts\python.exe' -m unittest -q tests.test_investor_flow
} finally {
    Pop-Location
}

Write-Host 'All checks passed.'
