#!/usr/bin/env pwsh
# One-shot secret injection for all three ScratchSolid projects
# Usage: .\scripts\inject-all-secrets.ps1
# Requires: npx wrangler and logged-in Cloudflare account

$ErrorActionPreference = "Stop"

# Auto-load .env.secrets from the same directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$envFile = Join-Path $scriptDir ".env.secrets"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#\s=]+)\s*=\s*(.*)\s*$') {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      if (-not [string]::IsNullOrWhiteSpace($value)) {
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
      }
    }
  }
  Write-Host "[Config] Loaded secrets from ${envFile}" -ForegroundColor DarkGray
}

$secrets = @{
  "cleaning-service-backend" = @{
    "ZOHO_ORG_ID"       = $env:SSS_ZOHO_ORG_ID
    "ZOHO_REFRESH_TOKEN"= $env:SSS_ZOHO_REFRESH_TOKEN
    "CSRF_SECRET"       = $env:SSS_CSRF_SECRET
  }
  "scratchsolidsolutions" = @{
    "JWT_SECRET"        = $env:SSS_JWT_SECRET
    "CSRF_SECRET"       = $env:SSS_CSRF_SECRET
    "RESEND_API_KEY"    = $env:SSS_RESEND_API_KEY
    "ZOHO_CLIENT_SECRET"= $env:SSS_ZOHO_CLIENT_SECRET
    "ZOHO_ORG_ID"       = $env:SSS_ZOHO_ORG_ID
    "ZOHO_REFRESH_TOKEN"= $env:SSS_ZOHO_REFRESH_TOKEN
  }
  "scratchsolid-portal" = @{
    "RESEND_API_KEY"    = $env:SSS_RESEND_API_KEY
    "ZOHO_CLIENT_SECRET"= $env:SSS_ZOHO_CLIENT_SECRET
    "ZOHO_ORG_ID"       = $env:SSS_ZOHO_ORG_ID
    "ZOHO_REFRESH_TOKEN"= $env:SSS_ZOHO_REFRESH_TOKEN
  }
}

function Inject-Secret($project, $name, $value) {
  if ([string]::IsNullOrWhiteSpace($value)) {
    Write-Host "  SKIP ${name} (not set in env)" -ForegroundColor DarkGray
    return
  }
  Write-Host "  PUT ${name} => ${project}..." -NoNewline
  try {
    $value | npx wrangler secret put $name --name $project 2>&1 | Out-Null
    Write-Host " OK" -ForegroundColor Green
  } catch {
    Write-Host " FAIL: $_" -ForegroundColor Red
  }
}

Write-Host "`n=== ScratchSolid Secret Injection ===" -ForegroundColor Cyan
Write-Host "Prerequisites:" -ForegroundColor Yellow
Write-Host "  Set env vars in your shell / .env file:" -ForegroundColor Yellow
Write-Host "    SSS_JWT_SECRET, SSS_CSRF_SECRET, SSS_RESEND_API_KEY" -ForegroundColor Yellow
Write-Host "    SSS_ZOHO_CLIENT_SECRET, SSS_ZOHO_ORG_ID, SSS_ZOHO_REFRESH_TOKEN" -ForegroundColor Yellow
Write-Host ""

foreach ($project in $secrets.Keys) {
  Write-Host "Project: ${project}" -ForegroundColor Cyan
  foreach ($secret in $secrets[$project].GetEnumerator()) {
    Inject-Secret $project $secret.Key $secret.Value
  }
  Write-Host ""
}

Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Verify with: npx wrangler secret list --name <project>" -ForegroundColor DarkGray
