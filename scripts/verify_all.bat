@echo off
setlocal

echo [1/3] Frontend type/lint check...
cmd /c "cd /d c:\dynasty_property_os\frontend && npm run lint"
if errorlevel 1 exit /b 1

echo [2/3] Frontend build...
cmd /c "cd /d c:\dynasty_property_os\frontend && npm run build"
if errorlevel 1 exit /b 1

echo [3/3] Backend investor flow tests...
cmd /c "cd /d c:\dynasty_property_os && c:\dynasty_property_os\.venv\Scripts\python.exe -m unittest -q tests.test_investor_flow"
if errorlevel 1 exit /b 1

echo All checks passed.
exit /b 0
