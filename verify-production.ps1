# Production Verification Script
Write-Output "=== PRODUCTION VERIFICATION ==="

# 1. Backend Worker Health
Write-Output "`n--- 1. Backend Worker Health ---"
try {
    $r = Invoke-RestMethod -Uri "https://api.scratchsolidsolutions.org/api/health" -TimeoutSec 10
    Write-Output "Health: status=$($r.status) d1=$($r.checks.d1) resend=$($r.checks.resend) zoho=$($r.checks.zoho)"
} catch { Write-Output "Health: FAIL - $($_.Exception.Message)" }

# 2. Hetzner Services
Write-Output "`n--- 2. Hetzner Services ---"
$hetzner = @('booking','n8n','erp','status')
foreach ($s in $hetzner) {
    try {
        $r = Invoke-WebRequest -Uri "https://$s.scratchsolidsolutions.org" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
        Write-Output "$s.scratchsolidsolutions.org : $($r.StatusCode)"
    } catch { Write-Output "$s.scratchsolidsolutions.org : UNREACHABLE" }
}

# 3. Marketing Site Pages
Write-Output "`n--- 3. Marketing Site Pages ---"
$pages = @('/','/services','/about','/gallery','/contact','/auth','/book','/business-booking','/client-dashboard','/business-dashboard','/booking-selection','/forgot-password','/terms','/privacy')
foreach ($p in $pages) {
    try {
        $r = Invoke-WebRequest -Uri "https://scratchsolidsolutions.org$p" -UseBasicParsing -TimeoutSec 15 -ErrorAction SilentlyContinue
        $title = if ($r.Content -match '<title>(.*?)</title>') { $matches[1] } else { 'NO TITLE' }
        Write-Output "$p : $($r.StatusCode) | Title: $title"
    } catch { Write-Output "$p : ERROR - $($_.Exception.Message)" }
}

# 4. Auth Flows (redirect checks)
Write-Output "`n--- 4. Auth Redirects ---"
try {
    $r = Invoke-WebRequest -Uri "https://scratchsolidsolutions.org/book" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 10
    Write-Output "/book (no redirect): Status=$($r.StatusCode)"
} catch {
    if ($_.Exception.Response) {
        Write-Output "/book redirect: $($_.Exception.Response.StatusCode.Value__) -> $($_.Exception.Response.Headers.Location)"
    } else { Write-Output "/book: FAIL" }
}

# 5. Reviews API
Write-Output "`n--- 5. Reviews API ---"
try {
    $r = Invoke-RestMethod -Uri "https://scratchsolidsolutions.org/api/reviews" -TimeoutSec 10
    $count = if ($r.results) { $r.results.Count } else { 0 }
    Write-Output "Approved reviews count: $count"
    if ($count -gt 0) {
        $r.results | Select-Object -First 3 | ForEach-Object { Write-Output "  - $($_.rating)* | $($_.user_name) | $($_.text.Substring(0,[Math]::Min(50,$_.text.Length)))..." }
    }
} catch { Write-Output "Reviews: FAIL - $($_.Exception.Message)" }

# 6. Portal
Write-Output "`n--- 6. Internal Portal ---"
try {
    $r = Invoke-WebRequest -Uri "https://portal.scratchsolidsolutions.org" -UseBasicParsing -TimeoutSec 10 -ErrorAction SilentlyContinue
    Write-Output "Portal root: $($r.StatusCode)"
} catch { Write-Output "Portal: UNREACHABLE" }

# 7. Zoho
Write-Output "`n--- 7. Zoho Integration ---"
try {
    $r = Invoke-RestMethod -Uri "https://api.scratchsolidsolutions.org/api/zoho/health" -TimeoutSec 10
    Write-Output "Zoho health: $($r | ConvertTo-Json -Compress)"
} catch { Write-Output "Zoho: FAIL - $($_.Exception.Message)" }

# 8. Paystack
Write-Output "`n--- 8. Paystack Integration ---"
try {
    $r = Invoke-RestMethod -Uri "https://api.scratchsolidsolutions.org/api/payments/paystack/health" -TimeoutSec 10
    Write-Output "Paystack health: $($r | ConvertTo-Json -Compress)"
} catch { Write-Output "Paystack health: FAIL - $($_.Exception.Message)" }

try {
    $r = Invoke-RestMethod -Uri "https://scratchsolidsolutions.org/api/payments/paystack/health" -TimeoutSec 10
    Write-Output "Marketing Paystack: $($r | ConvertTo-Json -Compress)"
} catch { Write-Output "Marketing Paystack: FAIL - $($_.Exception.Message)" }

Write-Output "`n=== VERIFICATION COMPLETE ==="
