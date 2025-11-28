# Build script for Capacitor export
# Moves API routes outside project to avoid static export errors

Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
}
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force
}

Write-Host "Moving API folder temporarily..." -ForegroundColor Yellow
if (Test-Path "src/app/api") {
    Move-Item -Path "src/app/api" -Destination "../api_temp" -Force
}

Write-Host "Building Next.js for static export..." -ForegroundColor Green
npm run export

$buildSuccess = $LASTEXITCODE -eq 0

Write-Host "Restoring API folder..." -ForegroundColor Yellow
if (Test-Path "../api_temp") {
    Move-Item -Path "../api_temp" -Destination "src/app/api" -Force
}

if ($buildSuccess) {
    Write-Host "Build complete successfully!" -ForegroundColor Green
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
