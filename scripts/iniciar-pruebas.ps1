# Levanta el SITIO DE PRUEBAS (base de datos aparte, con alumnos ficticios) en http://localhost:3002.
# Usa .env.pruebas, que queda solo en esta compu (no se sube a GitHub).
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$archivo = ".env.pruebas"
$url = "https://nifgzblriejwmctyzmzn.supabase.co"
$publica = "sb_publishable_wzswN_34Rahip4z618fCnA_f0zrIsYB"

if (-not (Test-Path $archivo)) {
  $texto = "# Sitio de pruebas. Pega abajo la clave secreta del proyecto 'BA Vocal Coach - Pruebas'`r`n# (Supabase > ese proyecto > Project Settings > API Keys > Secret keys, empieza con sb_secret_)`r`nSECRETA="
  [System.IO.File]::WriteAllText((Join-Path $raiz $archivo), $texto, (New-Object System.Text.UTF8Encoding($false)))
}
$secreta = (Get-Content $archivo | Where-Object { $_ -match "sb_secret_" } | ForEach-Object { ($_ -replace '^.*?(sb_secret_\S+).*$', '$1') } | Select-Object -First 1)
if (-not $secreta) {
  Write-Host ""
  Write-Host " Falta la clave secreta del proyecto de pruebas." -ForegroundColor Yellow
  Write-Host " Se abre .env.pruebas: pegala despues de SECRETA=, guarda y volve a abrir iniciar-pruebas.cmd."
  Start-Process notepad.exe (Join-Path $raiz $archivo)
  exit 1
}

$env:NEXT_PUBLIC_SUPABASE_URL = $url
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $publica
$env:SUPABASE_SERVICE_ROLE_KEY = $secreta
$env:NEXT_PUBLIC_SITE_URL = "http://localhost:3002"
$env:NEXT_DIST_DIR = ".next-pruebas"
# En pruebas no se mandan mails ni se cobra ni se crean Zoom de verdad
$env:NEXT_PUBLIC_MODO_PRUEBAS = "1"

if (-not (Test-Path node_modules)) { npm install }
Write-Host ""
Write-Host " SITIO DE PRUEBAS en http://localhost:3002  (deja esta ventana abierta)" -ForegroundColor Green
Write-Host ""
npx next dev -p 3002
