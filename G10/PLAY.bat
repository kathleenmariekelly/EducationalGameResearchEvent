@echo off
REM Double-click this file to play Type Racer.
REM It starts a local web server and opens your browser.
cd /d "%~dp0"

echo.
echo ==== Type Racer =========================================
echo Starting a local web server so the game can load...
echo Leave this window OPEN while you play.
echo Close this window (or press Ctrl+C) when you're done.
echo =========================================================
echo.

REM Try Python first.
where python >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Using Python. Opening http://localhost:8000 ...
    start "" "http://localhost:8000"
    python -m http.server 8000
    goto :eof
)

REM Try the "py" launcher.
where py >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Using Python (py). Opening http://localhost:8000 ...
    start "" "http://localhost:8000"
    py -m http.server 8000
    goto :eof
)

REM Try Node's npx serve.
where npx >nul 2>nul
if %ERRORLEVEL%==0 (
    echo Using Node (npx serve). A URL will appear below - open it.
    npx --yes serve . -l 8000
    goto :eof
)

echo.
echo Could not find Python or Node.js on your system.
echo Install ONE of these, then run this file again:
echo   - Python:  https://www.python.org/downloads/  (check "Add to PATH")
echo   - Node.js: https://nodejs.org/
echo.
pause
