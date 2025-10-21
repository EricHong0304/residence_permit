@echo off
setlocal EnableDelayedExpansion

REM Initialize SQLite database by running Node script (requires server deps)

pushd "%~dp0..\server"
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [init-db] npm is required to initialize database.
    popd & exit /b 1
  )

  REM Ensure dependencies (better-sqlite3) are installed
  call npm ci || call npm install
  if errorlevel 1 (
    echo [init-db] Failed to install server dependencies.
    popd & exit /b 1
  )

  set NODE_ENV=staging
  node scripts\init_db.js
  if errorlevel 1 (
    echo [init-db] Database initialization failed.
    popd & exit /b 1
  )
popd

echo [init-db] Done.
exit /b 0
