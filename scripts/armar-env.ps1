# Arma .env.local a partir de las claves que esten en .env.example o .env.local,
# ubicando cada una en su variable segun su formato. Las claves no salen de esta compu.
$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$url = "https://xyvdgicltwvojmsnmmbm.supabase.co"

$valores = @{}
foreach ($archivo in @(".env.example", ".env.local")) {
  if (Test-Path $archivo) {
    foreach ($linea in Get-Content $archivo) {
      if ($linea -match '^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$') {
        $v = $Matches[2].Trim()
        if ($v) { $valores[$Matches[1]] = $v }
      }
    }
  }
}
# Las claves de Supabase se reconocen por su formato, esten en la linea que esten
$todas = $valores.Values
$publica = $todas | Where-Object { $_ -like "sb_publishable_*" } | Select-Object -First 1
$secreta = $todas | Where-Object { $_ -like "sb_secret_*" } | Select-Object -First 1
if (-not $publica -or -not $secreta) {
  Write-Host "No encontre las dos claves de Supabase (sb_publishable_... y sb_secret_...)." -ForegroundColor Yellow
  Write-Host "Pegalas en .env.example o .env.local (en cualquier linea) y volve a abrir iniciar.cmd."
  exit 1
}
function V($k, $def = "") { if ($valores.ContainsKey($k) -and $valores[$k] -notlike "sb_*" -and $valores[$k] -notlike "http*supabase*") { $valores[$k] } else { $def } }

@"
NEXT_PUBLIC_SUPABASE_URL=$url
NEXT_PUBLIC_SUPABASE_ANON_KEY=$publica
SUPABASE_SERVICE_ROLE_KEY=$secreta

NEXT_PUBLIC_SITE_URL=http://localhost:3000

RESEND_API_KEY=$(V 'RESEND_API_KEY')
EMAIL_FROM="BA - Vocal Coach <onboarding@resend.dev>"
ADMIN_EMAIL=$(V 'ADMIN_EMAIL')

MP_ACCESS_TOKEN=$(V 'MP_ACCESS_TOKEN')
MP_WEBHOOK_SECRET=$(V 'MP_WEBHOOK_SECRET')

ZOOM_ACCOUNT_ID=$(V 'ZOOM_ACCOUNT_ID')
ZOOM_CLIENT_ID=$(V 'ZOOM_CLIENT_ID')
ZOOM_CLIENT_SECRET=$(V 'ZOOM_CLIENT_SECRET')
"@ | ForEach-Object { [IO.File]::WriteAllText((Join-Path $raiz ".env.local"), $_, (New-Object System.Text.UTF8Encoding $false)) }

# .env.example vuelve a quedar vacio (es el que se sube a GitHub)
@"
# Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

RESEND_API_KEY=
EMAIL_FROM="BA - Vocal Coach <clases@tudominio.com>"
ADMIN_EMAIL=

MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

ZOOM_ACCOUNT_ID=
ZOOM_CLIENT_ID=
ZOOM_CLIENT_SECRET=
"@ | ForEach-Object { [IO.File]::WriteAllText((Join-Path $raiz ".env.example"), $_, (New-Object System.Text.UTF8Encoding $false)) }

Write-Host "Listo: .env.local armado con las claves en su lugar." -ForegroundColor Green
