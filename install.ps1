# Financer one-click install — Windows + Docker Desktop (in-repo).
# Usage: .\install.ps1
param(
    [switch]$Help
)

$ErrorActionPreference = "Stop"

$PostgresPasswordPlaceholder = "changeme_sicher"
$NextAuthSecretPlaceholder = "aendern_bitte_generieren"

function Show-Help {
    @"
Financer — One-Click Docker Installation (Windows)

Im geklonten Repo ausführen:
  .\install.ps1

Voraussetzung: Docker Desktop läuft.

Flags:
  -Help    Diese Hilfe
"@
}

if ($Help) {
    Show-Help
    exit 0
}

function Write-Step([string]$Message) { Write-Host "-> $Message" }
function Write-Ok([string]$Message) { Write-Host "OK $Message" -ForegroundColor Green }
function Write-Fail([string]$Message) { Write-Host "X $Message" -ForegroundColor Red; exit 1 }

function Test-DockerCompose {
    try {
        docker compose version 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function New-RandomSecret([int]$Length = 32) {
    $bytes = New-Object byte[] ([Math]::Max($Length, 24))
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $raw = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
    if ($raw.Length -ge $Length) {
        return $raw.Substring(0, $Length)
    }
    return $raw
}

function Read-EnvValue([string]$Key, [string]$Default = "") {
    $envPath = Join-Path $PSScriptRoot ".env"
    if (-not (Test-Path $envPath)) { return $Default }
    $line = Select-String -Path $envPath -Pattern "^\s*$Key\s*=" | Select-Object -Last 1
    if (-not $line) { return $Default }
    $val = ($line.Line -split "=", 2)[1].Trim()
    $val = $val.Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($val)) { return $Default }
    return $val
}

function Set-EnvKey([string]$Key, [string]$Value) {
    $envPath = Join-Path $PSScriptRoot ".env"
    $lines = @()
    $found = $false
    if (Test-Path $envPath) {
        $lines = Get-Content $envPath
        $lines = $lines | ForEach-Object {
            if ($_ -match "^\s*$([regex]::Escape($Key))\s*=") {
                $found = $true
                "$Key=$Value"
            } else {
                $_
            }
        }
    }
    if (-not $found) {
        $lines += "$Key=$Value"
    }
    $lines | Set-Content $envPath -Encoding UTF8
}

function Get-SuggestedNextAuthUrl {
    $local = "http://localhost:3000"
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
            Select-Object -First 1 -ExpandProperty IPAddress
        if ($ip) {
            return "http://${ip}:3000"
        }
    } catch { }
    return $local
}

function Prompt-NextAuthUrl {
    $current = Read-EnvValue "NEXTAUTH_URL" ""
    if ($current -and $current -ne "http://localhost:3000") {
        Write-Ok "NEXTAUTH_URL=$current"
        return
    }

    $suggestion = Get-SuggestedNextAuthUrl
    Write-Host ""
    Write-Host "URL, unter der du Financer im Browser oeffnest (wichtig fuer Login und Session)."
    $input = Read-Host "NEXTAUTH_URL [$suggestion]"
    if ([string]::IsNullOrWhiteSpace($input)) { $input = $suggestion }
    Set-EnvKey "NEXTAUTH_URL" $input
    Write-Ok "NEXTAUTH_URL=$input"
}

function Setup-Env {
    $root = $PSScriptRoot
    $example = Join-Path $root ".env.example"
    $envFile = Join-Path $root ".env"

    if (-not (Test-Path $example)) {
        Write-Fail ".env.example nicht gefunden — bitte im Financer-Repo ausfuehren."
    }

    if (-not (Test-Path $envFile)) {
        Write-Step ".env aus .env.example anlegen …"
        Copy-Item $example $envFile
    }

    Set-Location $root

    $user = Read-EnvValue "POSTGRES_USER" "financeuser"
    $pass = Read-EnvValue "POSTGRES_PASSWORD" ""
    $db = Read-EnvValue "POSTGRES_DB" "finance"
    $secret = Read-EnvValue "NEXTAUTH_SECRET" ""

    if ([string]::IsNullOrWhiteSpace($pass) -or $pass -eq $PostgresPasswordPlaceholder) {
        $pass = New-RandomSecret 24
        Set-EnvKey "POSTGRES_PASSWORD" $pass
        Write-Ok "POSTGRES_PASSWORD generiert"
    }

    if ([string]::IsNullOrWhiteSpace($secret) -or $secret -eq $NextAuthSecretPlaceholder) {
        $secret = New-RandomSecret 32
        Set-EnvKey "NEXTAUTH_SECRET" $secret
        Write-Ok "NEXTAUTH_SECRET generiert"
    }

    Set-EnvKey "POSTGRES_USER" $user
    Set-EnvKey "POSTGRES_DB" $db
    Set-EnvKey "DATABASE_URL" "postgresql://${user}:${pass}@db:5432/${db}"

    if (-not (Select-String -Path $envFile -Pattern '^\s*FINANCER_DEPLOY_MODE\s*=' -Quiet)) {
        Set-EnvKey "FINANCER_DEPLOY_MODE" "build"
    }

    Prompt-NextAuthUrl
}

function Wait-ForApp {
    Write-Step "Warte auf App (Port 3000) …"
    for ($i = 1; $i -le 20; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000/auth/login" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Ok "App erreichbar"
                return
            }
        } catch { }
        Start-Sleep -Seconds 3
    }
    Write-Host "X App-Health-Check fehlgeschlagen" -ForegroundColor Red
    docker compose logs app --tail 30
    exit 1
}

Write-Host ""
Write-Host "Financer — One-Click Installation (Windows)"
Write-Host ""

if (-not (Test-Path (Join-Path $PSScriptRoot "docker-compose.yml"))) {
    Write-Fail "docker-compose.yml nicht gefunden. Bitte Repo klonen und install.ps1 im Root ausfuehren."
}

if (-not (Test-DockerCompose)) {
    Write-Fail "Docker Desktop nicht erreichbar. Bitte Docker Desktop starten."
}

Setup-Env

Write-Step "Docker Compose Build & Start …"
docker compose --env-file .env up -d --build
if ($LASTEXITCODE -ne 0) { Write-Fail "docker compose fehlgeschlagen" }

Wait-ForApp

$url = Read-EnvValue "NEXTAUTH_URL" "http://localhost:3000"
Write-Host ""
Write-Ok "Financer laeuft unter: $url"
Write-Host "  Verzeichnis: $PSScriptRoot"
Write-Host "  Logs:   cd $PSScriptRoot; docker compose logs -f app"
Write-Host ""
