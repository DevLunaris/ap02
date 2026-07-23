# Startet den Next.js-Dev-Server so, dass er zwingend mit diesem Fenster stirbt.
#
# Hintergrund: Schliesst man ein cmd-Fenster, ueberlebt der von npm gestartete
# Node-Prozess haeufig als Waise und blockiert Port 3000 weiter. Ein Batch-Skript
# kann das nicht verhindern - es kommt beim harten Schliessen nie zu seinem
# Aufraeum-Teil.
#
# Loesung: ein Windows-Job-Objekt mit JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE. Alle
# Prozesse im Job werden vom Betriebssystem beendet, sobald das letzte Handle auf
# den Job verschwindet - also wenn dieser PowerShell-Prozess endet, egal wie.

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

Add-Type -Namespace Win32 -Name Job -MemberDefinition @'
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetInformationJobObject(
        IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll")]
    public static extern IntPtr GetCurrentProcess();
'@

function Enable-KillOnClose {
    # JobObjectExtendedLimitInformation = 9, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
    $job = [Win32.Job]::CreateJobObject([IntPtr]::Zero, $null)
    if ($job -eq [IntPtr]::Zero) { return $false }

    # Layout von JOBOBJECT_EXTENDED_LIMIT_INFORMATION. LimitFlags liegt hinter
    # zwei LARGE_INTEGER (2 x 8 Byte).
    $size = if ([IntPtr]::Size -eq 8) { 144 } else { 112 }
    $buffer = [Runtime.InteropServices.Marshal]::AllocHGlobal($size)
    try {
        for ($i = 0; $i -lt $size; $i++) {
            [Runtime.InteropServices.Marshal]::WriteByte($buffer, $i, 0)
        }
        [Runtime.InteropServices.Marshal]::WriteInt32($buffer, 16, 0x2000)

        if (-not [Win32.Job]::SetInformationJobObject($job, 9, $buffer, $size)) { return $false }
    }
    finally {
        [Runtime.InteropServices.Marshal]::FreeHGlobal($buffer)
    }

    # Dieser Prozess kommt in den Job; alles, was er danach startet (npm, node),
    # erbt die Zugehoerigkeit automatisch.
    return [Win32.Job]::AssignProcessToJobObject($job, [Win32.Job]::GetCurrentProcess())
}

$guarded = $false
try { $guarded = Enable-KillOnClose } catch { $guarded = $false }

if ($guarded) {
    Write-Host '  Fenster-Kopplung aktiv: Schliessen beendet den Server zuverlaessig.' -ForegroundColor DarkGray
} else {
    Write-Host '  Hinweis: Fenster-Kopplung nicht moeglich. Falls ein Rest haengen' -ForegroundColor Yellow
    Write-Host '  bleibt, beendet stop.bat ihn.' -ForegroundColor Yellow
}
Write-Host ''

# npm im Vordergrund - Strg+C wird durchgereicht.
& npm.cmd run dev
exit $LASTEXITCODE
