# Nach pack.ps1 kopieren und Werte anpassen (pack.ps1 wird nicht committed).
#   Copy-Item pack.example.ps1 pack.ps1

$ErrorActionPreference = "Stop"

$Image = "finance-app"
$Tag   = "latest"
$Out   = "finance_deploy.tar.gz"
$Work  = Join-Path $env:TEMP "finance_pack_$(Get-Random)"
New-Item -ItemType Directory -Path $Work -Force | Out-Null

try {
    Write-Host "-> Docker-Image bauen..."
    docker build -t "${Image}:${Tag}" .
    if ($LASTEXITCODE -ne 0) { throw "docker build fehlgeschlagen" }

    Write-Host "-> Image speichern (kann einige Minuten dauern)..."
    docker save "${Image}:${Tag}" -o "$Work\finance_app.tar"
    if ($LASTEXITCODE -ne 0) { throw "docker save fehlgeschlagen" }

    # tar.gz aus dem .tar machen
    tar -czf "$Work\finance_app.tar.gz" -C $Work "finance_app.tar"
    Remove-Item "$Work\finance_app.tar"

    Write-Host "-> Deployment-Dateien kopieren..."
    Copy-Item "docker-compose.yml" "$Work\"
    Copy-Item ".env.example"       "$Work\"
    Copy-Item "deploy.sh"          "$Work\"

    Write-Host "-> Paket schnüren..."
    if (Test-Path $Out) { Remove-Item $Out }
    tar -czf $Out -C $Work .

    $SizeMB = [math]::Round((Get-Item $Out).Length / 1MB, 0)
    Write-Host ""
    Write-Host "OK  $Out  (${SizeMB} MB)"
    Write-Host ""
    Write-Host "Kopieren:"
    Write-Host "  scp $Out root@YOUR_SERVER:/path/to/financer/"
    Write-Host ""
    Write-Host "Erstmalig auf Server:"
    Write-Host "  ssh root@YOUR_SERVER"
    Write-Host "  mkdir -p /path/to/financer && cd /path/to/financer"
    Write-Host "  tar xzf finance_deploy.tar.gz"
    Write-Host "  cp .env.example .env && nano .env"
    Write-Host "  chmod +x deploy.sh && ./deploy.sh"
    Write-Host ""
    Write-Host "Update (ein Befehl):"
    Write-Host "  scp $Out root@YOUR_SERVER:/path/to/financer/ ; ssh root@YOUR_SERVER 'cd /path/to/financer && tar xzf finance_deploy.tar.gz && ./deploy.sh'"
} finally {
    Remove-Item $Work -Recurse -Force -ErrorAction SilentlyContinue
}
