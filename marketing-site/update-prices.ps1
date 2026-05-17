# Price Management Script for Scratch Solid Solutions
# This script provides a permanent, database-level solution for updating service pricing
# Usage: .\update-prices.ps1 [local|remote]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "remote")]
    [string]$Environment = "local"
)

Write-Host "=== Scratch Solid Solutions - Price Management ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow
Write-Host ""

# Set the environment flag
$envFlag = if ($Environment -eq "remote") { "--remote" } else { "--local" }

# Check if wrangler is installed
try {
    $wranglerVersion = npx wrangler --version
    Write-Host "Wrangler version: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Wrangler is not installed. Please run: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

# Navigate to marketing-site directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptPath\marketing-site"

Write-Host "Applying price updates to $Environment database..." -ForegroundColor Yellow
Write-Host ""

# Execute the SQL script
try {
    npx wrangler d1 execute scratchsolid_db $envFlag --file=sql/update_service_pricing.sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Price updates applied successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "To verify the changes, you can run:" -ForegroundColor Cyan
        Write-Host "npx wrangler d1 execute scratchsolid_db $envFlag --command='SELECT * FROM service_pricing ORDER BY service_id, client_type'" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "Failed to apply price updates" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error executing SQL script: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Price Management Complete ===" -ForegroundColor Cyan
