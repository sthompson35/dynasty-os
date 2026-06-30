@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run_verify_phase2b_contractor_rls.ps1"
endlocal
