@echo off
for /L %%i in (1,1,5) do (
  curl.exe -s --max-time 10 -X POST -H "Content-Type: application/json" -d @test_rate.json https://api.scratchsolidsolutions.org/api/auth/login
  echo.
)
