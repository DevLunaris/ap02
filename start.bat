@echo off
setlocal EnableDelayedExpansion
title AP2 Lernhub - Dev-Server

REM Immer im Projektordner arbeiten, egal von wo die Datei gestartet wurde.
cd /d "%~dp0"

set "PORT=3000"

REM ---------------------------------------------------------------------------
REM Reste eines vorherigen Laufs beenden - Sicherheitsnetz, falls doch einmal
REM ein Prozess ueberlebt hat.
REM ---------------------------------------------------------------------------
call :freeport
if defined KILLED echo Alter Server auf Port %PORT% wurde beendet.

if not exist "node_modules\" (
    echo.
    echo Abhaengigkeiten fehlen - npm install laeuft ...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo FEHLER: npm install ist fehlgeschlagen.
        pause
        exit /b 1
    )
)

echo.
echo ===========================================================
echo   AP2 Lernhub
echo   http://localhost:%PORT%
echo.
echo   Beenden: Strg+C  oder  dieses Fenster schliessen.
echo ===========================================================
echo.

REM Der Server laeuft ueber scripts\dev.ps1. Das Skript haengt sich und alle
REM Kindprozesse in ein Windows-Job-Objekt, das beim Verschwinden dieses Fensters
REM automatisch aufgeraeumt wird. Reines Batch kann das nicht - bei einem harten
REM Fenster-Schliessen wird der Rest dieser Datei nie ausgefuehrt.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\dev.ps1"

REM ---------------------------------------------------------------------------
REM Aufraeumen nach Strg+C.
REM ---------------------------------------------------------------------------
call :freeport

echo.
echo Server beendet.
REM Absoluter Pfad: Ein "timeout" aus Git-Bash o. ae. im PATH wuerde sonst greifen.
"%SystemRoot%\System32\timeout.exe" /t 2 /nobreak >nul 2>&1
exit /b 0


REM ===========================================================================
REM Beendet gezielt den Prozess, der auf %PORT% lauscht. Bewusst nicht
REM "taskkill /IM node.exe" - das wuerde auch fremde Node-Prozesse abschiessen.
REM ===========================================================================
:freeport
set "KILLED="
for /f "tokens=5" %%P in ('netstat -ano -p TCP ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    if not "%%P"=="0" (
        taskkill /F /PID %%P /T >nul 2>&1
        if not errorlevel 1 set "KILLED=1"
    )
)
exit /b 0
