# B2B Logistics Escrow System - Deployment Script (PowerShell)
# This script automates the deployment process for Windows

Write-Host "🚀 Starting B2B Logistics Escrow System Deployment..." -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js v18+ first." -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "📦 Step 1: Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Installing smart-contract dependencies..."
Set-Location smart-contract
if (-not (Test-Path "node_modules")) {
    npm install
}
Set-Location ..

Write-Host "Installing oracle dependencies..."
Set-Location oracle
if (-not (Test-Path "node_modules")) {
    npm install
}
Set-Location ..

Write-Host "Installing frontend dependencies..."
Set-Location frontend
if (-not (Test-Path "node_modules")) {
    npm install
}
Set-Location ..

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Start Hardhat Node
Write-Host "📡 Step 2: Starting Hardhat node..." -ForegroundColor Yellow
Set-Location smart-contract
$nodeProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run node" -PassThru
Set-Location ..

# Wait for node to be ready
Write-Host "Waiting for Hardhat node to start..."
Start-Sleep -Seconds 8

Write-Host "✅ Hardhat node started (PID: $($nodeProcess.Id))" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy contract
Write-Host "📝 Step 3: Deploying smart contract..." -ForegroundColor Yellow
Set-Location smart-contract
npm run deploy
$deploymentInfo = Get-Content deployments/localhost.json | ConvertFrom-Json
$contractAddress = $deploymentInfo.escrowContract
$oracleAddress = $deploymentInfo.oracle
Set-Location ..

if (-not $contractAddress) {
    Write-Host "❌ Failed to get contract address" -ForegroundColor Red
    Stop-Process -Id $nodeProcess.Id -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✅ Contract deployed: $contractAddress" -ForegroundColor Green
Write-Host "✅ Oracle address: $oracleAddress" -ForegroundColor Green
Write-Host ""

# Step 4: Setup Oracle
Write-Host "⚙️  Step 4: Setting up Oracle service..." -ForegroundColor Yellow

Set-Location oracle

# Create .env if it doesn't exist
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from env.example..."
    Copy-Item env.example .env
}

# Update contract address in .env
$envContent = Get-Content .env -Raw
$envContent = $envContent -replace 'ESCROW_CONTRACT_ADDRESS=.*', "ESCROW_CONTRACT_ADDRESS=$contractAddress"
$envContent = $envContent -replace 'ORACLE_PRIVATE_KEY=.*', "ORACLE_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
Set-Content .env $envContent

# Initialize database
Write-Host "Initializing database..."
npm run init-db

Set-Location ..

Write-Host "✅ Oracle service configured" -ForegroundColor Green
Write-Host ""

# Step 5: Update Frontend
Write-Host "🎨 Step 5: Updating frontend configuration..." -ForegroundColor Yellow

Set-Location frontend/src/utils
$constantsContent = Get-Content constants.ts -Raw
$constantsContent = $constantsContent -replace "export const ESCROW_CONTRACT_ADDRESS = '.*'", "export const ESCROW_CONTRACT_ADDRESS = '$contractAddress'"
Set-Content constants.ts $constantsContent
Set-Location ../../..

Write-Host "✅ Frontend configuration updated" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Summary:"
Write-Host "   Contract Address: $contractAddress"
Write-Host "   Oracle Address:   $oracleAddress"
Write-Host "   Hardhat Node PID: $($nodeProcess.Id)"
Write-Host ""
Write-Host "🚀 Next Steps:"
Write-Host "   1. Start Oracle service:"
Write-Host "      cd oracle; npm start"
Write-Host ""
Write-Host "   2. Start Frontend (in another terminal):"
Write-Host "      cd frontend; npm run dev"
Write-Host ""
Write-Host "   3. Setup MetaMask:"
Write-Host "      - Network: Hardhat Local"
Write-Host "      - RPC URL: http://127.0.0.1:8545"
Write-Host "      - Chain ID: 31337"
Write-Host "      - Import account with private key from Hardhat node"
Write-Host ""
Write-Host "⚠️  Note: Keep Hardhat node running (PID: $($nodeProcess.Id))"
Write-Host "   To stop: Close the Hardhat node PowerShell window"
Write-Host ""
Write-Host "Happy Coding! 🎉" -ForegroundColor Green

