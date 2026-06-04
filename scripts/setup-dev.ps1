# One-shot local dev bootstrap: DB container, migrations, demo users (demo / demo1234).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$DevPort = 3001

function Read-DotEnvValue {
  param([string]$Key, [string]$FilePath)
  if (-not (Test-Path $FilePath)) { return $null }
  foreach ($line in Get-Content $FilePath) {
    if ($line -match "^\s*$Key\s*=\s*(.+)\s*$") {
      $v = $Matches[1].Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) { $v = $v.Substring(1, $v.Length - 2) }
      if ($v.StartsWith("'") -and $v.EndsWith("'")) { $v = $v.Substring(1, $v.Length - 2) }
      return $v
    }
  }
  return $null
}

function Strip-EnvQuotes {
  param([string]$Value)
  $v = $Value.Trim()
  if ($v.StartsWith('"') -and $v.EndsWith('"')) { return $v.Substring(1, $v.Length - 2) }
  if ($v.StartsWith("'") -and $v.EndsWith("'")) { return $v.Substring(1, $v.Length - 2) }
  return $v
}

function Ensure-EnvLocal {
  if (-not (Test-Path ".env.local")) {
    if (-not (Test-Path ".env.example")) {
      throw ".env.example missing - cannot create .env.local"
    }
    Copy-Item ".env.example" ".env.local"
    Write-Host "Created .env.local from .env.example"
  }

  $pgUser = Read-DotEnvValue "POSTGRES_USER" ".env"
  if (-not $pgUser) { $pgUser = "financeuser" }
  $pgPass = Read-DotEnvValue "POSTGRES_PASSWORD" ".env"
  if (-not $pgPass) { $pgPass = Read-DotEnvValue "POSTGRES_PASSWORD" ".env.example" }
  if (-not $pgPass) { $pgPass = "changeme_sicher" }
  $pgDb = Read-DotEnvValue "POSTGRES_DB" ".env"
  if (-not $pgDb) { $pgDb = "finance" }

  $dbUrl = "postgresql://${pgUser}:${pgPass}@localhost:5432/${pgDb}"
  $nextAuthUrl = "http://localhost:${DevPort}"

  $secret = Read-DotEnvValue "NEXTAUTH_SECRET" ".env.local"
  if (-not $secret) {
    $secret = Read-DotEnvValue "NEXTAUTH_SECRET" ".env"
  }
  if (-not $secret -or $secret -eq "aendern_bitte_generieren") {
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes)
    Write-Host "Generated new NEXTAUTH_SECRET"
  }

  $lines = Get-Content ".env.local"
  $out = New-Object System.Collections.Generic.List[string]
  $seen = @{ DATABASE_URL = $false; NEXTAUTH_URL = $false; NEXTAUTH_SECRET = $false; AUTH_TRUST_HOST = $false }

  foreach ($line in $lines) {
    if ($line -match '^\s*DATABASE_URL\s*=') {
      $seen.DATABASE_URL = $true
      $out.Add("DATABASE_URL=$dbUrl")
      continue
    }
    if ($line -match '^\s*NEXTAUTH_URL\s*=') {
      $seen.NEXTAUTH_URL = $true
      $out.Add("NEXTAUTH_URL=$nextAuthUrl")
      continue
    }
    if ($line -match '^\s*NEXTAUTH_SECRET\s*=') {
      $seen.NEXTAUTH_SECRET = $true
      $out.Add("NEXTAUTH_SECRET=$secret")
      continue
    }
    if ($line -match '^\s*AUTH_TRUST_HOST\s*=') {
      $seen.AUTH_TRUST_HOST = $true
      $out.Add("AUTH_TRUST_HOST=true")
      continue
    }
    $out.Add($line)
  }

  if (-not $seen.DATABASE_URL) { $out.Add("DATABASE_URL=$dbUrl") }
  if (-not $seen.NEXTAUTH_URL) { $out.Add("NEXTAUTH_URL=$nextAuthUrl") }
  if (-not $seen.NEXTAUTH_SECRET) { $out.Add("NEXTAUTH_SECRET=$secret") }
  if (-not $seen.AUTH_TRUST_HOST) { $out.Add("AUTH_TRUST_HOST=true") }

  Set-Content -Path ".env.local" -Value $out -Encoding utf8
  Write-Host "Ensured .env.local: localhost DB, NEXTAUTH_URL=$nextAuthUrl (no quotes)"
}

Ensure-EnvLocal

Write-Host "Starting PostgreSQL (dev overlay, port 5432)..."
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T db pg_isready -U financeuser -d finance 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  throw "PostgreSQL did not become ready in time. Is Docker running?"
}

Write-Host "Applying migrations..."
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Seeding demo users..."
npx prisma db seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$loginUrl = "http://localhost:$DevPort/auth/login"
Write-Host ""
Write-Host "Dev ready."
Write-Host "  Login: $loginUrl"
Write-Host "  username: demo"
Write-Host "  password: demo1234"
Write-Host ""
Write-Host "IMPORTANT: Use port $DevPort, not 3000."
Write-Host "  On Windows, localhost:3000 is often WSL (not this app)."
Write-Host "  If you use a LAN IP, set NEXTAUTH_URL in .env.local to that URL."
Write-Host "Then: npm run dev"
