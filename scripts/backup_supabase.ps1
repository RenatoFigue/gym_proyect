# Copia manual/programable de PostgreSQL para recuperación académica.
# Requiere pg_dump/pg_restore en PATH y variable PG_BACKUP_URL protegida.
# Ejemplo: configurar PG_BACKUP_URL en una sesión PRIVADA (no guardar en .ps1).
param([string]$Destination = (Join-Path $PSScriptRoot '..\backups'))
$ErrorActionPreference = 'Stop'
if (-not $env:PG_BACKUP_URL) { throw 'Configura PG_BACKUP_URL en tu equipo, sin incluirla en el repositorio.' }
foreach ($command in @('pg_dump','pg_restore')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "Falta instalar PostgreSQL client tools: $command" }
}
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$backupPath = Join-Path $Destination ("gymcontrol_{0}.dump" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
# La URL se suministra como variable de entorno, no se imprime ni se guarda en el ZIP.
$env:PGCONNECT_TIMEOUT = '15'
& pg_dump --format=custom --no-owner --no-acl --file=$backupPath $env:PG_BACKUP_URL
if ($LASTEXITCODE -ne 0) { Remove-Item $backupPath -ErrorAction SilentlyContinue; throw 'Falló pg_dump.' }
& pg_restore --list $backupPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'El archivo de respaldo no superó la comprobación de inventario.' }
Write-Output "Copia creada: $backupPath"
Write-Output 'ATENCIÓN: listar un backup NO equivale a probar la restauración. Restaura en otra base y mide RTO.'
