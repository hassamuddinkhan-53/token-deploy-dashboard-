// scripts/ensure-balances-and-add-liquidity.js
// This script checks token balances, mints if needed, and adds liquidity to all pairs

require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !FACTORY_ADDRESS || !ROUTER_ADDRESS) {
    console.error('❌ Missing environment variables');
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY, provider);

// ABIs
const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function mint(address to, uint256 amount) returns (bool)',
    'function owner() view returns (address)',
    'function transfer(address to, uint256 amount) returns (bool)'
];

const FACTORY_ABI = [
    'function getPair(address tokenA, address tokenB) view returns (address)',
    'function createPair(address tokenA, address tokenB) returns (address)'
];

const ROUTER_ABI = [
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)'
];

const PAIR_ABI = [
    'function getReserves() view returns (uint112, uint112)',
    'function token0() view returns (address)',
    'function token1() view returns (address)'
];

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

// Load tokens
function loadTokens() {
    const filePath = path.resolve('deployedTokens.json');
    if (!fs.existsSync(filePath)) {
        console.error('❌ deployedTokens.json not found');
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Check and ensure balance
async function ensureBalance(tokenAddress, tokenSymbol, requiredAmount) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await token.decimals();
    const balance = await token.balanceOf(wallet.address);
    const required = ethers.parseUnits(requiredAmount.toString(), decimals);

    console.log(`\n📊 ${tokenSymbol} Balance Check:`);
    console.log(`   Current: ${ethers.formatUnits(balance, decimals)}`);
    console.log(`   Required: ${requiredAmount}`);

    if (balance >= required) {
        console.log(`   ✅ Sufficient balance`);
        return decimals;
    }

    console.log(`   ⚠️  Insufficient balance - attempting to mint...`);

    try {
        const amountToMint = required - balance;
        const tx = await token.mint(wallet.address, amountToMint);
        await tx.wait();
        console.log(`   ✅ Minted ${ethers.formatUnits(amountToMint, decimals)} ${tokenSymbol}`);
        console.log(`   TX: ${tx.hash}`);
        return decimals;
    } catch (error) {
        console.error(`   ❌ Failed to mint ${tokenSymbol}:`, error.message);
        throw error;
    }
}

// Approve router
async function approveRouter(tokenAddress, tokenSymbol, amount) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const allowance = await token.allowance(wallet.address, ROUTER_ADDRESS);

    if (allowance >= amount) {
        console.log(`   ✅ Router already approved for ${tokenSymbol}`);
        return;
    }

    console.log(`   🔐 Approving router for ${tokenSymbol}...`);
    const tx = await token.approve(ROUTER_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    console.log(`   ✅ Approved - TX: ${tx.hash}`);
}

// Add liquidity to a pair
async function addLiquidityToPair(tokenA, tokenB, amountPerToken) {
    console.log(`\n🔗 Processing Pair: ${tokenA.symbol} / ${tokenB.symbol}`);

    const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, wallet);
    const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, wallet);

    const decimalsA = await tokenAContract.decimals();
    const decimalsB = await tokenBContract.decimals();

    const amountA = ethers.parseUnits(amountPerToken.toString(), decimalsA);
    const amountB = ethers.parseUnits(amountPerToken.toString(), decimalsB);

    // Approve tokens
    await approveRouter(tokenA.address, tokenA.symbol, amountA);
    await approveRouter(tokenB.address, tokenB.symbol, amountB);

    // Check if pair exists
    let pairAddress = await factory.getPair(tokenA.address, tokenB.address);

    if (pairAddress === ethers.ZeroAddress) {
        console.log(`   🏭 Creating new pair...`);
        const txCreate = await factory.createPair(tokenA.address, tokenB.address);
        await txCreate.wait();
        pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        console.log(`   ✅ Pair created at: ${pairAddress}`);
    } else {
        console.log(`   📍 Pair exists at: ${pairAddress}`);
    }

    // Add liquidity
    console.log(`   💧 Adding liquidity: ${amountPerToken} ${tokenA.symbol} + ${amountPerToken} ${tokenB.symbol}...`);

    try {
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 min
        const tx = await router.addLiquidity(
            tokenA.address,
            tokenB.address,
            amountA,
            amountB,
            0, // amountAMin
            0, // amountBMin
            wallet.address,
            deadline
        );
        const receipt = await tx.wait();
        console.log(`   ✅ Liquidity added - TX: ${receipt.hash}`);

        // Check reserves
        const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const [reserve0, reserve1] = await pair.getReserves();
        const token0 = await pair.token0();

        const reserveA = token0.toLowerCase() === tokenA.address.toLowerCase() ? reserve0 : reserve1;
        const reserveB = token0.toLowerCase() === tokenA.address.toLowerCase() ? reserve1 : reserve0;

        console.log(`   📊 Reserves: ${ethers.formatUnits(reserveA, decimalsA)} ${tokenA.symbol} / ${ethers.formatUnits(reserveB, decimalsB)} ${tokenB.symbol}`);

        return {
            pair: `${tokenA.symbol}-${tokenB.symbol}`,
            pairAddress,
            liquidityTx: receipt.hash,
            reserves: {
                [tokenA.symbol]: ethers.formatUnits(reserveA, decimalsA),
                [tokenB.symbol]: ethers.formatUnits(reserveB, decimalsB)
            }
        };
    } catch (error) {
        console.error(`   ❌ Failed to add liquidity:`, error.message);
        return {
            pair: `${tokenA.symbol}-${tokenB.symbol}`,
            error: error.message
        };
    }
}

// Main execution
(async () => {
    console.log('🚀 Starting Balance Check and Liquidity Addition\n');
    console.log(`Wallet: ${wallet.address}`);
    console.log(`Factory: ${FACTORY_ADDRESS}`);
    console.log(`Router: ${ROUTER_ADDRESS}\n`);

    const tokens = loadTokens();
    const REQUIRED_AMOUNT = 10000;

    // Step 1: Ensure all token balances
    console.log('═══════════════════════════════════════');
    console.log('STEP 1: Ensuring Token Balances');
    console.log('═══════════════════════════════════════');

    for (const token of tokens) {
        try {
            await ensureBalance(token.address, token.symbol, REQUIRED_AMOUNT);
        } catch (error) {
            console.error(`\n❌ Failed to ensure balance for ${token.symbol}`);
            console.error(`   This token may not have a mint function or you're not the owner`);
            console.error(`   Please manually transfer tokens to: ${wallet.address}\n`);
        }
    }

    // Step 2: Add liquidity to all pairs
    console.log('\n═══════════════════════════════════════');
    console.log('STEP 2: Adding Liquidity to All Pairs');
    console.log('═══════════════════════════════════════');

    const results = [];
    const LIQUIDITY_AMOUNT = 1000; // Use 1000 tokens per pair to conserve balance

    for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
            const result = await addLiquidityToPair(tokens[i], tokens[j], LIQUIDITY_AMOUNT);
            results.push(result);
        }
    }

    // Save results
    const reportPath = path.resolve('liquidity_setup_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

    console.log('\n═══════════════════════════════════════');
    console.log('✅ COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`\n📄 Report saved to: ${reportPath}`);
    console.log(`\n✅ Successfully processed ${results.length} pairs`);

    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    console.log(`   ✅ Successful: ${successful}`);
    if (failed > 0) {
        console.log(`   ❌ Failed: ${failed}`);
    }
})();
