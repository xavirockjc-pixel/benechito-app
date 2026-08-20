# ============================================================
#  BENECHITO — Paso post-reinicio: Docker + Postgres
#  Ejecutar DESPUÉS de reiniciar el PC (WSL2 ya quedó instalado).
#  Clic derecho > "Ejecutar con PowerShell", o desde una terminal:
#     powershell -ExecutionPolicy Bypass -File .\scripts\despues-del-reinicio.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$installer = "$env:TEMP\benechito-setup\DockerDesktopInstaller.exe"

Write-Host "== 1/4 Verificando WSL2 ==" -ForegroundColor Cyan
wsl --status

# --- Instalar Docker Desktop si no está ---
$dockerExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
if (-not (Test-Path $dockerExe)) {
  Write-Host "== 2/4 Instalando Docker Desktop (acepta el UAC) ==" -ForegroundColor Cyan
  if (-not (Test-Path $installer)) {
    Write-Host "Descargando instalador de Docker..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path (Split-Path $installer) | Out-Null
    Invoke-WebRequest "https://desktop.docker.com/win/main/amd64/Docker Desktop Installer.exe" -OutFile $installer
  }
  Start-Process $installer -ArgumentList "install","--quiet","--accept-license","--backend=wsl-2" -Verb RunAs -Wait
} else {
  Write-Host "== 2/4 Docker Desktop ya está instalado ==" -ForegroundColor Green
}

# --- Iniciar Docker Desktop y esperar el engine ---
Write-Host "== 3/4 Iniciando Docker Desktop (puede tardar 1-2 min la 1a vez) ==" -ForegroundColor Cyan
if (Test-Path $dockerExe) { Start-Process $dockerExe }
$docker = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
$listo = $false
for ($i=0; $i -lt 60; $i++) {
  try { & $docker info *> $null; if ($LASTEXITCODE -eq 0) { $listo = $true; break } } catch {}
  Start-Sleep -Seconds 5
}
if (-not $listo) {
  Write-Host "Docker aún no responde. Abre Docker Desktop, acepta los términos y espera a que diga 'Engine running', luego vuelve a ejecutar este script." -ForegroundColor Red
  exit 1
}
Write-Host "Docker está corriendo ✔" -ForegroundColor Green

# --- Levantar Postgres + Redis ---
Write-Host "== 4/4 Levantando Postgres + Redis ==" -ForegroundColor Cyan
Set-Location (Split-Path $PSScriptRoot -Parent)
& $docker compose up -d
Write-Host ""
Write-Host "LISTO. Postgres corriendo en localhost:5432." -ForegroundColor Green
Write-Host "Ahora avísame en el chat y hago la migración de Prisma a Postgres + seed." -ForegroundColor Yellow
