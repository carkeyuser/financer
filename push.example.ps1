# Nach push.ps1 kopieren und Werte anpassen (push.ps1 wird nicht committed).
#   Copy-Item push.example.ps1 push.ps1

param(
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"

$Source = $PSScriptRoot
$Server = "root@YOUR_SERVER"
$Dest   = "/path/to/financer"   # Deployment-Verzeichnis auf dem Server anpassen
$Temp   = "$env:TEMP\financer_push"

# Eine SSH-Session fuer alle Aufrufe (Passwort nur beim ersten Mal)
$sshDir = Join-Path $env:USERPROFILE ".ssh"
$ControlPath = Join-Path $sshDir "financer-push-control"
if (-not (Test-Path $sshDir)) { New-Item -ItemType Directory -Path $sshDir -Force | Out-Null }

$SshOpts = @(
    "-o", "ControlMaster=auto",
    "-o", "ControlPath=$ControlPath",
    "-o", "ControlPersist=10m"
)

function Invoke-RemoteSsh([string]$RemoteCmd) {
    & ssh @SshOpts $Server $RemoteCmd
    if ($LASTEXITCODE -ne 0) { throw "ssh fehlgeschlagen (Exit $LASTEXITCODE)" }
}

function Invoke-RemoteScp([string]$LocalPath, [string]$RemotePath) {
    & scp @SshOpts -r $LocalPath $RemotePath
    if ($LASTEXITCODE -ne 0) { throw "scp fehlgeschlagen (Exit $LASTEXITCODE)" }
}

function Close-SshMaster {
    & ssh @SshOpts -O exit $Server 2>$null | Out-Null
}

try {
    Write-Host "-> Dateien vorbereiten..."
    if (Test-Path $Temp) { Remove-Item $Temp -Recurse -Force }

    robocopy $Source $Temp /E `
      /XD "node_modules" ".next" "src\generated" ".claude" "dist" ".codegraph" `
      /XF "*.tar.gz" "*.tar" ".env" ".env.local" "*.tsbuildinfo" `
      /NP /NFL /NDL | Out-Null

    Write-Host "-> Zielverzeichnis auf Server bereinigen..."
    Invoke-RemoteSsh "mkdir -p $Dest && find $Dest -mindepth 1 -maxdepth 1 ! -name '.env' ! -name '.env.local' -exec rm -rf {} +"

    Write-Host "-> Dateien kopieren (kann etwas dauern)..."
    Invoke-RemoteScp "$Temp\." "${Server}:${Dest}/"

    Remove-Item $Temp -Recurse -Force

    if ($Deploy) {
        Write-Host ""
        Write-Host "-> Docker Build & Start auf dem Server..."
        Invoke-RemoteSsh "cd $Dest && docker compose up -d --build"
        Write-Host ""
        Write-Host "Fertig! App: http://YOUR_SERVER:3000"
        return
    }

    Write-Host ""
    Write-Host "Fertig! Naechste Schritte auf dem Server:"
    Write-Host ""
    Write-Host "  # Push + Build in einem Schritt:"
    Write-Host "  .\push -Deploy"
    Write-Host ""
    Write-Host "  # Oder manuell:"
    Write-Host "  ssh $Server `"cd $Dest && docker compose up -d --build`""
    Write-Host ""
    Write-Host "  # App laeuft dann auf: http://YOUR_SERVER:3000"
}
finally {
    Close-SshMaster
}
