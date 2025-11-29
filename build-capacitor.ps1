# Build script for Capacitor export
# Temporarily modifies next.config.ts and moves API routes to build static export

Write-Host "=== Capacitor Build Script ===" -ForegroundColor Cyan

# Backup original next.config.ts
Write-Host "Backing up next.config.ts..." -ForegroundColor Yellow
Copy-Item -Path "next.config.ts" -Destination "next.config.ts.backup" -Force

# Create temporary next.config.ts with export settings
Write-Host "Creating static export config..." -ForegroundColor Yellow
$exportConfig = @"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
    ],
  },
};

export default nextConfig;
"@

Set-Content -Path "next.config.ts" -Value $exportConfig

# Clean previous builds
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force
}
if (Test-Path "out") {
    Remove-Item -Path "out" -Recurse -Force
}

# Move API folder temporarily
Write-Host "Moving API folder temporarily..." -ForegroundColor Yellow
if (Test-Path "src/app/api") {
    Move-Item -Path "src/app/api" -Destination "../api_temp" -Force
}

# Build Next.js for static export
Write-Host "Building Next.js for static export..." -ForegroundColor Green
npm run build

$buildSuccess = $LASTEXITCODE -eq 0

# Restore API folder
Write-Host "Restoring API folder..." -ForegroundColor Yellow
if (Test-Path "../api_temp") {
    Move-Item -Path "../api_temp" -Destination "src/app/api" -Force
}

# Restore original next.config.ts
Write-Host "Restoring original next.config.ts..." -ForegroundColor Yellow
Move-Item -Path "next.config.ts.backup" -Destination "next.config.ts" -Force

if ($buildSuccess) {
    Write-Host "Build complete successfully!" -ForegroundColor Green
} else {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
