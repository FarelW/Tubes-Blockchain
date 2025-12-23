#!/bin/bash

# B2B Logistics Escrow System - Deployment Script
# This script automates the deployment process

set -e  # Exit on error

echo "🚀 Starting B2B Logistics Escrow System Deployment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js v18+ first.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js version: $(node -v)${NC}"
echo ""

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Step 1: Installing dependencies...${NC}"
echo ""

echo "Installing smart-contract dependencies..."
cd smart-contract
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo "Installing oracle dependencies..."
cd oracle
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Start Hardhat Node
echo -e "${YELLOW}📡 Step 2: Starting Hardhat node...${NC}"
cd smart-contract
npm run node > ../hardhat-node.log 2>&1 &
NODE_PID=$!
cd ..

# Wait for node to be ready
echo "Waiting for Hardhat node to start..."
sleep 8

# Check if node is running
if ! kill -0 $NODE_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start Hardhat node. Check hardhat-node.log for details.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Hardhat node started (PID: $NODE_PID)${NC}"
echo ""

# Step 3: Deploy contract
echo -e "${YELLOW}📝 Step 3: Deploying smart contract...${NC}"
cd smart-contract
npm run deploy
CONTRACT_ADDRESS=$(cat deployments/localhost.json | grep -o '"escrowContract": "[^"]*' | cut -d'"' -f4)
ORACLE_ADDRESS=$(cat deployments/localhost.json | grep -o '"oracle": "[^"]*' | cut -d'"' -f4)
cd ..

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}❌ Failed to get contract address${NC}"
    kill $NODE_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Contract deployed: $CONTRACT_ADDRESS${NC}"
echo -e "${GREEN}✅ Oracle address: $ORACLE_ADDRESS${NC}"
echo ""

# Step 4: Setup Oracle
echo -e "${YELLOW}⚙️  Step 4: Setting up Oracle service...${NC}"

cd oracle

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from env.example..."
    cp env.example .env
fi

# Update contract address in .env
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|ESCROW_CONTRACT_ADDRESS=.*|ESCROW_CONTRACT_ADDRESS=$CONTRACT_ADDRESS|" .env
    sed -i '' "s|ORACLE_PRIVATE_KEY=.*|ORACLE_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80|" .env
else
    # Linux
    sed -i "s|ESCROW_CONTRACT_ADDRESS=.*|ESCROW_CONTRACT_ADDRESS=$CONTRACT_ADDRESS|" .env
    sed -i "s|ORACLE_PRIVATE_KEY=.*|ORACLE_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80|" .env
fi

# Initialize database
echo "Initializing database..."
npm run init-db

cd ..

echo -e "${GREEN}✅ Oracle service configured${NC}"
echo ""

# Step 5: Update Frontend
echo -e "${YELLOW}🎨 Step 5: Updating frontend configuration...${NC}"

cd frontend/src/utils

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|export const ESCROW_CONTRACT_ADDRESS = '.*'|export const ESCROW_CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'|" constants.ts
else
    # Linux
    sed -i "s|export const ESCROW_CONTRACT_ADDRESS = '.*'|export const ESCROW_CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'|" constants.ts
fi

cd ../../..

echo -e "${GREEN}✅ Frontend configuration updated${NC}"
echo ""

# Summary
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "📋 Deployment Summary:"
echo "   Contract Address: $CONTRACT_ADDRESS"
echo "   Oracle Address:   $ORACLE_ADDRESS"
echo "   Hardhat Node PID: $NODE_PID"
echo ""
echo "🚀 Next Steps:"
echo "   1. Start Oracle service:"
echo "      cd oracle && npm start"
echo ""
echo "   2. Start Frontend (in another terminal):"
echo "      cd frontend && npm run dev"
echo ""
echo "   3. Setup MetaMask:"
echo "      - Network: Hardhat Local"
echo "      - RPC URL: http://127.0.0.1:8545"
echo "      - Chain ID: 31337"
echo "      - Import account with private key from Hardhat node"
echo ""
echo "⚠️  Note: Keep Hardhat node running (PID: $NODE_PID)"
echo "   To stop: kill $NODE_PID"
echo ""
echo -e "${GREEN}Happy Coding! 🎉${NC}"

