#Requires -Version 5.1
$ErrorActionPreference = "Continue"
$N8N_URL = "https://n8n.scratchsolidsolutions.org"
$CRED = @{ email = 'it@scratchsolidsolutions.org'; password = 'JinR-236#@09)' }
$SECRET = '1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d'

function N8N-Call($Method, $Path, $Body = $null, [switch]$Ignore) {
    $p = @{ Uri = "$N8N_URL$Path"; Method = $Method; UseBasicParsing = $true; ErrorAction = 'SilentlyContinue'; WebSession = $script:sess }
    if ($Body) { $p.ContentType = 'application/json'; $p.Body = ($Body | ConvertTo-Json -Depth 10 -Compress) }
    $r = Invoke-WebRequest @p
    if ($r.StatusCode -lt 300) { if ($r.Content) { return $r.Content | ConvertFrom-Json }; return @{} }
    if ($Ignore) { return @{ err = $true; status = $r.StatusCode; body = $r.Content } }
    throw "n8n error $($r.StatusCode): $($r.Content)"
}

Write-Host "[1] Logging into n8n..." -ForegroundColor Cyan
$login = Invoke-WebRequest -Uri "$N8N_URL/rest/login" -Method POST -ContentType 'application/json' -Body ($CRED | ConvertTo-Json) -UseBasicParsing -SessionVariable 'script:sess' -ErrorAction SilentlyContinue
if ($login.StatusCode -ne 200) { Write-Error "Login failed"; exit 1 }
Write-Host "    OK" -ForegroundColor Green

Write-Host "[2] Checking existing workflows..." -ForegroundColor Cyan
$existing = N8N-Call GET '/rest/workflows'
$names = @(); if ($existing.data) { $names = $existing.data | ForEach-Object { $_.name } }
Write-Host "    Found $($names.Count) workflow(s)" -ForegroundColor Green

Write-Host "[3] Creating Portal Webhook Secret credential..." -ForegroundColor Cyan
$cred = N8N-Call POST '/rest/credentials' @{ name = 'Portal Webhook Secret'; type = 'httpHeaderAuth'; data = @{ name = 'Authorization'; value = "Bearer $SECRET" } } -Ignore
if ($cred.err) { Write-Warning "    Credential issue: $($cred.body)" } else { Write-Host "    OK" -ForegroundColor Green }

$files = @('calcom-booking-ingestion.json','zoho-create-invoice.json','create-shift.json','send-whatsapp.json','zoho-payment-webhook.json','data-retention-cleanup.json')
$dir = [System.IO.Path]::Combine($PSScriptRoot, '..', 'n8n-workflows')
if (-not (Test-Path $dir)) { $dir = [System.IO.Path]::Combine((Get-Location), 'infra', 'n8n-workflows') }
$done = 0

foreach ($f in $files) {
    $p = Join-Path $dir $f
    if (-not (Test-Path $p)) { Write-Warning "    Not found: $p"; continue }
    $j = Get-Content $p -Raw | ConvertFrom-Json
    if ($names -contains $j.name) { Write-Host "    Skip $($j.name) (exists)" -ForegroundColor Yellow; continue }

    Write-Host "[4.$($done+1)] Import $($j.name)..." -ForegroundColor Cyan
    $pl = @{ name = $j.name; active = $false; nodes = $j.nodes; connections = $j.connections; settings = $j.settings; tags = @() }
    if ($j.staticData) { $pl.staticData = $j.staticData }
    $res = N8N-Call POST '/rest/workflows' $pl
    $id = $res.data.id
    Write-Host "    Imported (ID: $id)" -ForegroundColor Green

    $trig = $j.nodes | Where-Object { $_.type -like '*Trigger*' }
    if ($trig) {
        Write-Host "    Activating..." -ForegroundColor Cyan
        $a = N8N-Call PATCH "/rest/workflows/$id" @{ active = $true } -Ignore
        if ($a.err) { Write-Warning "    Activation failed: $($a.body)" } else { Write-Host "    Activated" -ForegroundColor Green }
    }
    $done++
}

Write-Host ""
Write-Host "=== n8n Setup Complete ===" -ForegroundColor Cyan
Write-Host "Workflows imported: $done / $($files.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT: Create these credentials in n8n UI:" -ForegroundColor Yellow
Write-Host "  - Cal.com API" -ForegroundColor Yellow
Write-Host "  - Zoho Books (OAuth2)" -ForegroundColor Yellow
Write-Host "  - WhatsApp Business Cloud" -ForegroundColor Yellow
Write-Host "  - SMTP (Resend)" -ForegroundColor Yellow
Write-Host "Then activate workflows that failed activation." -ForegroundColor Yellow
