# Test runner script for Windows PowerShell
$env:USE_SQLITE = "true"
$env:JWT_SECRET = "test-jwt-secret-32-chars-minimum!!"
$env:ENCRYPT_SECRET = "test-encrypt-secret-32-chars-min!"
$env:MAIN_ADMIN_EMAIL = "admin@test.com"
$env:MAIN_ADMIN_PASSWORD = "Admin@Test123!"
$env:NODE_ENV = "test"
$env:PORT = "3099"
$env:DISABLE_RATE_LIMIT = "true"

Set-Location $PSScriptRoot\..
node tests/suite.test.js
