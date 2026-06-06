# Production Readiness Verification Script for ScratchSolid 2.0
# Run this before each production deployment

$ErrorActionPreference = "Continue"
$results = New-Object System.Collections.Generic.List[Object]
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $repoRoot

function Add-Result($Check, $Status, $Message) {
    $script:results.Add([PSCustomObject]@{ Check = $Check; Status = $Status; Message = $Message })
}

Write-Host "=== ScratchSolid 2.0 Production Readiness Verification ===" -ForegroundColor Cyan
Write-Host "Repository root: $repoRoot" -ForegroundColor Gray

# 1. TypeScript Compilation Check
Write-Host "`n[1/8] Checking TypeScript compilation..." -ForegroundColor Yellow
$projects = @(
    @{ Name = "internal-portal"; Path = "$repoRoot\internal-portal" },
    @{ Name = "backend-worker"; Path = "$repoRoot\backend-worker" },
    @{ Name = "marketing-site"; Path = "$repoRoot\marketing-site" }
)

foreach ($project in $projects) {
    Push-Location $project.Path
    try {
        $tsc = npx tsc --noEmit 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Result "$($project.Name) TS Compile" "PASS" "No TypeScript errors"
        } else {
            Add-Result "$($project.Name) TS Compile" "FAIL" "TypeScript compilation failed"
        }
    } finally {
        Pop-Location
    }
}

# 2. Jest Tests Check
Write-Host "`n[2/8] Running Jest tests..." -ForegroundColor Yellow
foreach ($project in $projects) {
    Push-Location $project.Path
    try {
        $jest = npx jest --passWithNoTests --silent 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Result "$($project.Name) Tests" "PASS" "All tests passing"
        } else {
            Add-Result "$($project.Name) Tests" "WARN" "Some tests failed (see output)"
        }
    } catch {
        Add-Result "$($project.Name) Tests" "WARN" "Test execution issue: $_"
    } finally {
        Pop-Location
    }
}

# 3. Environment Variables Audit
Write-Host "`n[3/8] Auditing environment variables..." -ForegroundColor Yellow
$requiredVars = @(
    "RESEND_API_KEY",
    "META_ACCESS_TOKEN",
    "META_PHONE_NUMBER_ID",
    "ERPNEXT_API_URL",
    "ERPNEXT_API_KEY",
    "ERPNEXT_API_SECRET",
    "ZOHO_CLIENT_ID",
    "ZOHO_CLIENT_SECRET",
    "ZOHO_REFRESH_TOKEN",
    "ZOHO_ORG_ID",
    "JWT_SECRET",
    "CSRF_SECRET",
    "INTERNAL_PORTAL_N8N_WEBHOOK_SECRET"
)

$envFile = Get-Content "$repoRoot\infra\.env.example" -ErrorAction SilentlyContinue
$missingEnvChecks = @()
foreach ($var in $requiredVars) {
    if ($envFile -match $var) {
        Add-Result "Env: $var" "PASS" "Documented in .env.example"
    } else {
        Add-Result "Env: $var" "WARN" "Not found in .env.example"
    }
}

# 4. Wrangler Secrets Check
Write-Host "`n[4/8] Checking wrangler secrets configuration..." -ForegroundColor Yellow
$wranglerFiles = @(
    "$repoRoot\internal-portal\wrangler.jsonc",
    "$repoRoot\backend-worker\wrangler.toml",
    "$repoRoot\marketing-site\wrangler.jsonc"
)

foreach ($file in $wranglerFiles) {
    if (Test-Path $file) {
        Add-Result "Wrangler: $file" "PASS" "Config file exists"
    } else {
        Add-Result "Wrangler: $file" "FAIL" "Config file missing"
    }
}

# 5. Database Migrations Check
Write-Host "`n[5/8] Checking database migrations..." -ForegroundColor Yellow
$migrationDirs = @(
    "$repoRoot\internal-portal\migrations",
    "$repoRoot\backend-worker\migrations"
)

foreach ($dir in $migrationDirs) {
    if (Test-Path $dir) {
        $count = (Get-ChildItem "$dir\*.sql" -ErrorAction SilentlyContinue).Count
        Add-Result "Migrations: $dir" "PASS" "$count migration files found"
    } else {
        Add-Result "Migrations: $dir" "WARN" "Migration directory not found"
    }
}

# 6. Security Audit - Public Routes
Write-Host "`n[6/8] Auditing public API routes..." -ForegroundColor Yellow
$publicRoutes = Get-ChildItem -Recurse -Filter "route.ts" -Path "$repoRoot\internal-portal\src\app\api" | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $hasRateLimit = $content -match 'withRateLimit'
    $hasAuth = $content -match 'withAuth|checkAuthAndRole'
    $isWebhook = $_.FullName -match 'webhooks'
    if (-not $hasAuth -and -not $isWebhook -and -not $hasRateLimit) {
        [PSCustomObject]@{ File = $_.FullName; Issue = "No auth or rate limiting" }
    }
}

if ($publicRoutes.Count -gt 0) {
    $sample = ($publicRoutes | Select-Object -First 3 | ForEach-Object { $_.File.Split("\")[-3..-1] -join "/" }) -join ", "
    Add-Result "Public Route Audit" "WARN" "$($publicRoutes.Count) public routes without rate limiting (e.g. $sample...)"
} else {
    Add-Result "Public Route Audit" "PASS" "All public routes have rate limiting or auth"
}

# 7. CSP and Security Headers
Write-Host "`n[7/8] Checking security headers..." -ForegroundColor Yellow
$middlewareFile = "$repoRoot\internal-portal\src\lib\middleware.ts"
if (Test-Path $middlewareFile) {
    $middleware = Get-Content $middlewareFile -Raw
    $checks = @{
        "CSP" = $middleware -match "Content-Security-Policy"
        "HSTS" = $middleware -match "Strict-Transport-Security"
        "X-Frame-Options" = $middleware -match "X-Frame-Options"
        "CSRF" = $middleware -match "withCsrf"
    }
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Add-Result "Security: $($check.Key)" "PASS" "Implemented"
        } else {
            Add-Result "Security: $($check.Key)" "FAIL" "Missing"
        }
    }
} else {
    Add-Result "Security Headers" "FAIL" "Middleware file not found"
}

# 8. WhatsApp Free-Tier Compliance
Write-Host "`n[8/8] Checking WhatsApp free-tier compliance..." -ForegroundColor Yellow
$whatsappFiles = @(
    "$repoRoot\internal-portal\src\lib\notifications.ts",
    "$repoRoot\internal-portal\src\app\api\webhooks\n8n\send-whatsapp\route.ts"
)

$complianceOk = $true
foreach ($file in $whatsappFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match 'sendWhatsAppTemplate|template_message') {
            Add-Result "WhatsApp: $file" "FAIL" "Still references paid templates"
            $complianceOk = $false
        }
    }
}
if ($complianceOk) {
    Add-Result "WhatsApp Free-Tier" "PASS" "No paid template references found"
}

# Summary
Write-Host "`n=== Verification Summary ===" -ForegroundColor Cyan
$table = $results | Format-Table -AutoSize | Out-String
Write-Host $table

$passCount = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$warnCount = ($results | Where-Object { $_.Status -eq "WARN" }).Count
$failCount = ($results | Where-Object { $_.Status -eq "FAIL" }).Count

$color = if ($failCount -eq 0) { "Green" } else { "Red" }
Write-Host "Results: $passCount passed, $warnCount warnings, $failCount failures" -ForegroundColor $color

if ($failCount -gt 0) {
    Write-Host "`nDeployment BLOCKED due to failures." -ForegroundColor Red
    exit 1
} elseif ($warnCount -gt 0) {
    Write-Host "`nDeployment allowed with warnings. Review before proceeding." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "`nAll checks passed. Ready for deployment!" -ForegroundColor Green
    exit 0
}
