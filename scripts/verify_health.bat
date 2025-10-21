@echo off
setlocal EnableDelayedExpansion

where curl >nul 2>nul
if errorlevel 1 (
  echo [health] curl not found. Please install curl or use Windows 10+.
  exit /b 1
)

set OK=1

curl -fsS http://localhost:3000/api/health >nul 2>nul
if errorlevel 1 (
  echo [health] /api/health FAILED
  set OK=0
) else (
  echo [health] /api/health OK
)

curl -fsS http://localhost:3000/api/analytics >nul 2>nul
if errorlevel 1 (
  echo [health] /api/analytics FAILED
  set OK=0
) else (
  echo [health] /api/analytics OK
)

curl -fsS http://localhost:3000/api/stations >nul 2>nul
if errorlevel 1 (
  echo [health] /api/stations FAILED
  set OK=0
) else (
  echo [health] /api/stations OK
)

if %OK%==1 (
  echo [health] All checks passed.
  exit /b 0
) else (
  echo [health] Some checks failed.
  exit /b 1
)
