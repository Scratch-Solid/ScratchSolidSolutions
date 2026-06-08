@echo off
echo === SQL Injection Test ===
curl.exe -s --max-time 15 -X POST -H "Content-Type: application/json" -d "{\"email\":\"'; DROP TABLE users; --\",\"password\":\"x\"}" https://api.scratchsolidsolutions.org/api/auth/login
echo.
echo === XSS Signup Test ===
curl.exe -s --max-time 15 -X POST -H "Content-Type: application/json" -d "{\"name\":\"<script>alert(1)</script>\",\"email\":\"xss_test@example.com\",\"password\":\"TestPass123!\",\"role\":\"client\"}" https://api.scratchsolidsolutions.org/api/auth/signup
echo.
echo === CORS Preflight Test ===
curl.exe -s --max-time 15 -X OPTIONS -H "Origin: https://portal.scratchsolidsolutions.org" -H "Access-Control-Request-Method: POST" -I https://api.scratchsolidsolutions.org/api/auth/login
echo.
echo === Security Headers Test ===
curl.exe -s --max-time 15 -I https://api.scratchsolidsolutions.org/api/health
