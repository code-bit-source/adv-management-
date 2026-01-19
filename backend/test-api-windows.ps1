# PowerShell Test Script for Password Setup Feature
# Run this with: powershell -ExecutionPolicy Bypass -File test-api-windows.ps1

$baseUrl = "http://localhost:5000/api/auth"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Password Setup Feature - Test Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Set password without token (should fail)
Write-Host "Test 1: Set password without authentication token" -ForegroundColor Yellow
Write-Host "Expected: 401 Unauthorized" -ForegroundColor Gray

try {
    $body = @{
        password = "TestPassword123"
        confirmPassword = "TestPassword123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/set-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Red
    Write-Host "Response: $($response.Content)" -ForegroundColor Red
    Write-Host "FAILED: Should have returned 401" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Status: 401" -ForegroundColor Green
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Green
        Write-Host "PASSED: Correctly rejected unauthenticated request" -ForegroundColor Green
    } else {
        Write-Host "FAILED: Unexpected error - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 2: Check if regular login endpoint exists
Write-Host "Test 2: Check login endpoint" -ForegroundColor Yellow
Write-Host "Testing with invalid credentials" -ForegroundColor Gray

try {
    $body = @{
        email = "test@example.com"
        password = "wrongpassword"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseUrl/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Response: $($response.Content)" -ForegroundColor Yellow
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Response: $responseBody" -ForegroundColor Yellow
    Write-Host "Login endpoint is working (returned error as expected)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Manual Testing Required:" -ForegroundColor Cyan
Write-Host "1. Use Postman or similar tool to test Google signup" -ForegroundColor White
Write-Host "2. Get JWT token from Google signup response" -ForegroundColor White
Write-Host "3. Test set-password endpoint with that token" -ForegroundColor White
Write-Host "4. Test login with the newly set password" -ForegroundColor White
Write-Host ""
Write-Host "See PASSWORD_SETUP_GUIDE.md for detailed testing instructions" -ForegroundColor White
Write-Host ""
