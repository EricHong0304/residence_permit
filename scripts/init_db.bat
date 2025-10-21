@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

REM Ensure sqlite3 exists
where sqlite3 >nul 2>nul
IF ERRORLEVEL 1 (
  echo [ERROR] sqlite3 not found. Please install SQLite and ensure it's in PATH.
  EXIT /B 1
)

REM Create data directory if not exists
IF NOT EXIST data (
  mkdir data
)

REM Enable WAL and run schema, views, seed
sqlite3 .\data\app.db "PRAGMA journal_mode=WAL;"
sqlite3 .\data\app.db ".read db\schema.sql"
sqlite3 .\data\app.db ".read db\views.sql"
sqlite3 .\data\app.db ".read db\seed.sql"

echo [OK] Database initialized at .\data\app.db (WAL)
ENDLOCAL
