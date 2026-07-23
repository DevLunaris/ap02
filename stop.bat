@echo off
setlocal
title AP2 Lernhub - Server beenden

set "PORT=3000"
set "FOUND="

REM Beendet gezielt den Prozess auf Port 3000 - fuer den Fall, dass ein Server
REM aus einem hart geschlossenen Fenster uebrig geblieben ist.
for /f "tokens=5" %%P in ('netstat -ano -p TCP ^| findstr /r /c:":%PORT% .*LISTENING"') do (
    if not "%%P"=="0" (
        echo Beende Prozess %%P auf Port %PORT% ...
        taskkill /F /PID %%P /T >nul 2>&1
        set "FOUND=1"
    )
)

if defined FOUND (
    echo Erledigt.
) else (
    echo Auf Port %PORT% laeuft nichts - nichts zu tun.
)

REM Absoluter Pfad: Ein "timeout" aus Git-Bash o. ae. im PATH wuerde sonst greifen.
"%SystemRoot%\System32\timeout.exe" /t 2 /nobreak >nul 2>&1
exit /b 0
