#!/bin/bash
# Sepolia DEX Deployment Commands

# ==============================================================================
# SETUP (One time)
# ==============================================================================

# 1. Copy environment template and edit with your keys
cp .env.example .env
# Edit .env with your Alchemy API key and private key

# 2. Install root dependencies (already done if using npm install)
npm install


# ==============================================================================
# COMPILE CONTRACTS
# ==============================================================================

# Compile all Solidity contracts
npx hardhat compile


# ==============================================================================
# DEPLOY TO SEPOLIA TESTNET
# ==============================================================================

# Deploy DAI, USDC, Factory, Router, and initial liquidity
# This automatically updates frontend/config.js with deployed addresses
npx hardhat run scripts/deploy-sepolia.js --network sepolia


# ==============================================================================
# START FRONTEND DEV SERVER
# ==============================================================================

cd frontend

# Install frontend dependencies (if not done)
npm install

# Start Vite dev server on http://localhost:5173
npm run dev

# Build for production (optional)
npm run build


# ==============================================================================
# VERIFICATION (Optional)
# ==============================================================================

# Verify contracts on Etherscan (requires ETHERSCAN_API_KEY in .env)
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example for Factory verification:
# npx hardhat verify --network sepolia 0x<factory_address> 0x<deployer_address>


# ==============================================================================
# LOCAL TESTING (Alternative to Sepolia)
# ==============================================================================

# Terminal 1: Start local Hardhat node
npx hardhat node --port 8666

# Terminal 2: Deploy to local network
npx hardhat run scripts/deploy-swap.js --network localhost

# Terminal 3: Start frontend on http://localhost:5174
cd frontend && npm run dev


# ==============================================================================
# USEFUL COMMANDS
# ==============================================================================

# Clean build artifacts
npx hardhat clean

# Run tests (if test files exist)
npx hardhat test

# Check gas usage
npx hardhat run scripts/deploy-sepolia.js --network sepolia --verbose

# View accounts and balances
npx hardhat accounts

# Flatten contracts (combine with imports)
npx hardhat flatten contracts/UniswapV2Factory.sol


# ==============================================================================
# ENVIRONMENT SETUP
# ==============================================================================

# Get Alchemy API Key: https://www.alchemy.com
# Get test ETH: https://sepoliafaucet.com
# Export from MetaMask: Account Details → Export Private Key

# .env format:
# ALCHEMY_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# PRIVATE_KEY=0x123abc...


# ==============================================================================
# FRONTEND OPERATIONS
# ==============================================================================

# Kill port if already in use (macOS/Linux)
lsof -ti:5173 | xargs kill -9

# Kill port if already in use (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Check Vite build size
npm run build -- --report-compressed-size


# ==============================================================================
# DEBUGGING
# ==============================================================================

# Show detailed compilation errors
npx hardhat compile --verbose

# Run with stack traces
npx hardhat run scripts/deploy-sepolia.js --network sepolia --show-stack-traces

# Check contract state (requires ethers version)
node
> const hre = require("hardhat");
> const router = await hre.ethers.getContractAt("UniswapV2Router02", "0x...");
> console.log(await router.factory());


# ==============================================================================
# POST-DEPLOYMENT
# ==============================================================================

# Check deployed addresses
cat frontend/config.js

# View on Sepolia Etherscan
# DAI: https://sepolia.etherscan.io/address/0x<dai_address>
# USDC: https://sepolia.etherscan.io/address/0x<usdc_address>
# Factory: https://sepolia.etherscan.io/address/0x<factory_address>
# Router: https://sepolia.etherscan.io/address/0x<router_address>
# Pair: https://sepolia.etherscan.io/address/0x<pair_address>
