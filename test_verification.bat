@echo off
curl.exe -s --max-time 15 -X POST -H "Content-Type: application/json" -d "{\"email\":\"fake@test.com\",\"password\":\"wrong\"}" https://api.scratchsolidsolutions.org/api/auth/login
echo.
echo STATUS:LOGIN_INVALID
curl.exe -s --max-time 15 -X POST -H "Content-Type: application/json" -d "{\"name\":\"TestUser\",\"email\":\"testuser_verify@example.com\",\"password\":\"TestPass123!\",\"role\":\"client\"}" https://api.scratchsolidsolutions.org/api/auth/signup
echo.
echo STATUS:SIGNUP
curl.exe -s --max-time 15 https://api.scratchsolidsolutions.org/api/auth/me
echo.
echo STATUS:ME_NO_TOKEN
curl.exe -s --max-time 15 https://api.scratchsolidsolutions.org/api/health
echo.
echo STATUS:HEALTH
