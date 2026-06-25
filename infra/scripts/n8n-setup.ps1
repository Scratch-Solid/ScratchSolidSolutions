#Requires -Version 5.1
<#
.SYNOPSIS
    Automates n8n workflow import and credential setup via REST API.
.DESCRIPTION
    Logs into n8n, creates the Portal Webhook Secret credential,
    imports all workflows from infra/n8n-workflows/, and activates them.
#>

$ErrorActionPreference = "Continue"
$N8N_URL = "https://n8n.scratchsolidsolutions.org"
$CREDENTIALS = @{
    email    = 'it@scratchsolidsolutions.org'
    password = 'JinR-236#@09)'
}

$PortalWebhookSecret = '1413dd0fd4bff83c47ef17a3d7fa24a18c15aef6b20bd7f7e90b7de0b1baac0d'

function Invoke-N8NApi {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [switch]$IgnoreError
    )
    $uri = "$N8N_URL$Path"
    $params = @{
        Uri         = $uri
        Method      = $Method
        UseBasicParsing = $true
        ErrorAction = 'SilentlyContinue'
        WebSession  = $script:session
    }
    if ($Body) {
        $params.ContentType = 'application/json'
        $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }
    $response = Invoke-WebRequest @params
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
        if ($response.Content) {
            return $response.Content | ConvertFrom-Json
        }
        return @{}
    }
    if ($IgnoreError) {
        return @{ error = $true; status = $response.StatusCode; content = $response.Content }
    }
    throw "n8n API error $($response.StatusCode): $($response.Content)"
}

# ─── 1. LOGIN ───
Write-Host "[1] Logging into n8n..." -ForegroundColor Cyan
$loginBody = @{
    email    = $CREDENTIALS.email
    password = $CREDENTIALS.password
}
$loginResponse = Invoke-WebRequest -Uri "$N8N_URL/rest/login" -Method POST `
    -ContentType 'application/json' -Body ($loginBody | ConvertTo-Json) `
    -UseBasicParsing -SessionVariable 'script:session' -ErrorAction SilentlyContinue

if ($loginResponse.StatusCode -ne 200) {
    Write-Error "n8n login failed: $($loginResponse.StatusCode)"
    exit 1
}
Write-Host "    Login successful" -ForegroundColor Green

# ─── 2. LIST EXISTING WORKFLOWS ───
Write-Host "[2] Checking existing workflows..." -ForegroundColor Cyan
$existingWorkflows = Invoke-N8NApi -Method GET -Path '/rest/workflows'
$existingNames = @()
if ($existingWorkflows.data) {
    $existingNames = $existingWorkflows.data | ForEach-Object { $_.name }
    Write-Host "    Found $($existingNames.Count) existing workflow(s)" -ForegroundColor Green
} else {
    Write-Host "    No existing workflows found" -ForegroundColor Green
}

# ─── 3. CREATE PORTAL WEBHOOK SECRET CREDENTIAL ───
Write-Host "[3] Creating 'Portal Webhook Secret' credential..." -ForegroundColor Cyan
$credPayload = @{
    name   = 'Portal Webhook Secret'
    type   = 'httpHeaderAuth'
    data   = @{
        name  = 'Authorization'
        value = "Bearer $PortalWebhookSecret"
    }
}
$credResult = Invoke-N8NApi -Method POST -Path '/rest/credentials' -Body $credPayload -IgnoreError
if ($credResult.error) {
    if ($credResult.content -like '*already exists*' -or $credResult.content -like '*duplicate*') {
        Write-Host "    Credential already exists, skipping" -ForegroundColor Yellow
    } else {
        Write-Warning "    Credential creation failed: $($credResult.content)"
    }
} else {
    Write-Host "    Credential created" -ForegroundColor Green
}

# ─── 4. IMPORT WORKFLOWS ───
$workflowFiles = @(
    'calcom-booking-ingestion.json',
    'zoho-create-invoice.json',
    'create-shift.json',
    'send-whatsapp.json',
    'zoho-payment-webhook.json',
    'data-retention-cleanup.json'
)

$workflowDir = [System.IO.Path]::Combine($PSScriptRoot, '..', 'n8n-workflows')
if (-not (Test-Path $workflowDir)) {
    $workflowDir = [System.IO.Path]::Combine((Get-Location), 'infra', 'n8n-workflows')
}

$imported = 0
foreach ($file in $workflowFiles) {
    $path = Join-Path $workflowDir $file
    if (-not (Test-Path $path)) {
        Write-Warning "    Workflow file not found: $path"
        continue
    }

    Write-Host "[4.$($imported+1)] Importing $file..." -ForegroundColor Cyan
    $json = Get-Content $path -Raw | ConvertFrom-Json

    # Skip if already exists
    if ($existingNames -contains $json.name) {
        Write-Host "    Workflow '$($json.name)' already exists, skipping" -ForegroundColor Yellow
        continue
    }

    # Build payload
    $payload = @{
        name        = $json.name
        active      = $false
        nodes       = $json.nodes
        connections = $json.connections
        settings    = $json.settings
        tags        = @()
    }
    if ($json.staticData) { $payload.staticData = $json.staticData }

    $result = Invoke-N8NApi -Method POST -Path '/rest/workflows' -Body $payload
    $workflowId = $result.data.id
    Write-Host "    Imported: $($result.data.name) (ID: $workflowId)" -ForegroundColor Green

    # Activate if it has a trigger
    $hasTrigger = $json.nodes | Where-Object { $_.type -like '*Trigger*' }
    if ($hasTrigger) {
        Write-Host "    Activating workflow..." -ForegroundColor Cyan
        $actResult = Invoke-N8NApi -Method PATCH -Path "/rest/workflows/$workflowId" -Body @{ active = $true } -IgnoreError
        if ($actResult.error) {
            Write-Warning "    Activation failed: $($actResult.content) — create missing credentials in n8n UI, then activate manually"
        } else {
            Write-Host "    Activated" -ForegroundColor Green
        }
    }

    $imported++
}

# ─── 5. SUMMARY ───
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  n8n Setup Complete" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Workflows imported: $imported / $($workflowFiles.Count)" -ForegroundColor Green
Write-Host ""
Write-Host "  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Log into n8n UI and manually create these credentials:" -ForegroundColor Yellow
Write-Host "     - Cal.com API" -ForegroundColor Yellow
Write-Host "     - Zoho Books (OAuth2)" -ForegroundColor Yellow
Write-Host "     - WhatsApp Business Cloud" -ForegroundColor Yellow
Write-Host "     - SMTP (Resend)" -ForegroundColor Yellow
Write-Host "  2. In Cal.com admin, add webhook URL from the booking-ingestion workflow" -ForegroundColor Yellow
Write-Host "  3. Set INTERNAL_PORTAL_N8N_WEBHOOK_SECRET in Cloudflare wrangler and redeploy portal" -ForegroundColor Yellow
Write-Host ""
