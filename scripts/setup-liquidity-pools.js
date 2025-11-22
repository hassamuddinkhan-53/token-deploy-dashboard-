// scripts/setup-liquidity-pools.js
// ------------------------------------------------------------
// This script fully automates the creation of liquidity pools for all
// ERC‑20 tokens you have deployed on Sepolia and then runs a basic
// swap test for each pool.  It does **not** modify any smart‑contract
// source code – it only calls the existing router/factory functions.
// ------------------------------------------------------------

/*
  Prerequisites (run once before executing this script):
  1. Install ethers.js:          npm i ethers
  2. Provide a JSON file `deployedTokens.json` in the project root
     containing the array stored in localStorage under the key
     `deployed_tokens_v1`. Example format:
     [
       {"address":"0x...", "name":"MyToken", "symbol":"MTK"},
       {"address":"0x...", "name":"Other",   "symbol":"OTH"}
     ]
  3. Create a `.env` file with the following variables:
       SEPOLIA_RPC_URL   – Sepolia RPC endpoint (e.g. Alchemy/Infura)
       PRIVATE_KEY       – Private key of the wallet that holds the tokens
       FACTORY_ADDRESS   – Deployed Uniswap‑style factory contract address
       ROUTER_ADDRESS    – Deployed router contract address
  4. Ensure the factory and router ABIs are available in
     `abis/Factory.json` and `abis/Router.json` (or replace the
     placeholder ABIs below with the correct ones).
*/

require('dotenv').config();
const { ethers, keccak256, defaultAbiCoder } = require('ethers');
const fs = require('fs');
const path = require('path');

// ------------------------------------------------------------
// Load configuration & ABIs
// ------------------------------------------------------------
const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !FACTORY_ADDRESS || !ROUTER_ADDRESS) {
    console.error('❌ Missing environment variables. Please check your .env file.');
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// Minimal ERC‑20 ABI (balanceOf, approve, allowance, decimals)
const ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)'
];

// Placeholder Factory ABI – replace with real ABI if needed
const FACTORY_ABI = [
    'function getPair(address tokenA, address tokenB) view returns (address)',
    'function createPair(address tokenA, address tokenB) returns (address)'
];

// Placeholder Router ABI – replace with real ABI if needed
const ROUTER_ABI = [
    'function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) returns (uint amountA, uint amountB, uint liquidity)',
    'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)'
];

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);
const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);

// ------------------------------------------------------------
// Helper utilities
// ------------------------------------------------------------
function loadDeployedTokens() {
    const filePath = path.resolve('deployedTokens.json');
    if (!fs.existsSync(filePath)) {
        console.error('❌ deployedTokens.json not found.');
        process.exit(1);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

function getPairKey(tokenA, tokenB) {
    // Uniswap‑style ordering: sort addresses
    const [addr0, addr1] = tokenA.toLowerCase() < tokenB.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];
    return keccak256(defaultAbiCoder.encode(['address', 'address'], [addr0, addr1]));
}

async function approveIfNeeded(tokenContract, spender, amount) {
    const allowance = await tokenContract.allowance(wallet.address, spender);
    if (allowance >= amount) return true; // already approved
    const tx = await tokenContract.approve(spender, amount);
    await tx.wait();
    return true;
}

// ------------------------------------------------------------
// Main workflow
// ------------------------------------------------------------
(async () => {
    console.log('🚀 Starting liquidity‑pool automation on Sepolia');

    // 1️⃣ Detect tokens
    const tokens = loadDeployedTokens();
    if (tokens.length < 2) {
        console.error('❌ Need at least two tokens to create a pool.');
        return;
    }
    console.log(`🔎 Detected ${tokens.length} deployed token(s).`);

    // 2️⃣ Generate unique pairs
    const pairs = [];
    for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
            pairs.push({ tokenA: tokens[i], tokenB: tokens[j] });
        }
    }
    console.log(`🔗 Generated ${pairs.length} unique pair(s).`);

    const report = [];

    for (const { tokenA, tokenB } of pairs) {
        console.log('\n=== Processing Pair ===');
        console.log(`Token A: ${tokenA.symbol} (${tokenA.address})`);
        console.log(`Token B: ${tokenB.symbol} (${tokenB.address})`);

        const erc20A = new ethers.Contract(tokenA.address, ERC20_ABI, wallet);
        const erc20B = new ethers.Contract(tokenB.address, ERC20_ABI, wallet);

        // Determine a modest amount for liquidity (e.g., 10000 tokens each)
        const decimalsA = await erc20A.decimals();
        const decimalsB = await erc20B.decimals();
        const amountA = ethers.parseUnits('10000', decimalsA);
        const amountB = ethers.parseUnits('10000', decimalsB);

        // 3️⃣ Approve router to spend tokens
        console.log('🔐 Approving router for token A...');
        await approveIfNeeded(erc20A, ROUTER_ADDRESS, amountA);
        console.log('🔐 Approving router for token B...');
        await approveIfNeeded(erc20B, ROUTER_ADDRESS, amountB);

        // 4️⃣ Create or fetch pool address
        let pairAddress = await factory.getPair(tokenA.address, tokenB.address);
        if (pairAddress === ethers.ZeroAddress) {
            console.log('🏭 Pool does not exist – creating via factory...');
            const txCreate = await factory.createPair(tokenA.address, tokenB.address);
            const receipt = await txCreate.wait();
            // The PairCreated event is the standard way to get the address
            const event = receipt.logs
                .map(l => factory.interface.parseLog(l))
                .find(e => e && e.name === 'PairCreated');
            pairAddress = event ? event.args.pair : null;
            if (!pairAddress) {
                console.error('❌ Failed to obtain pool address after creation.');
                continue;
            }
            console.log(`🏊‍♂️ New pool created at ${pairAddress}`);
        } else {
            console.log(`📍 Existing pool found at ${pairAddress}`);
        }

        // 5️⃣ Add liquidity
        console.log('💧 Adding liquidity...');
        const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 min
        try {
            const txAdd = await router.addLiquidity(
                tokenA.address,
                tokenB.address,
                amountA,
                amountB,
                0, // amountAMin – set to 0 for simplicity in test env
                0, // amountBMin
                wallet.address,
                deadline
            );
            const receiptAdd = await txAdd.wait();
            console.log('✅ Liquidity added. Transaction hash:', receiptAdd.hash);
        } catch (e) {
            console.error('❌ addLiquidity failed:', e.message);
            continue;
        }

        // 6️⃣ Verify reserves (read directly from the pair contract)
        const PAIR_ABI = [
            'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
            'function token0() view returns (address)',
            'function token1() view returns (address)'
        ];
        const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
        const [reserve0, reserve1] = await pairContract.getReserves();
        const token0 = await pairContract.token0();
        const token1 = await pairContract.token1();
        const reserveA = token0.toLowerCase() === tokenA.address.toLowerCase() ? reserve0 : reserve1;
        const reserveB = token1.toLowerCase() === tokenB.address.toLowerCase() ? reserve1 : reserve0;
        console.log(`📊 Reserves – ${tokenA.symbol}: ${ethers.formatUnits(reserveA, decimalsA)} | ${tokenB.symbol}: ${ethers.formatUnits(reserveB, decimalsB)}`);

        // 7️⃣ Test swaps (swap a small amount, e.g., 1 tokenA -> tokenB)
        const testAmountIn = ethers.parseUnits('1', decimalsA);
        const minOut = 0; // for test env we accept any amount
        console.log('🔁 Performing test swap A → B...');
        let swapSuccessAB = false;
        try {
            const txSwapAB = await router.swapExactTokensForTokens(
                testAmountIn,
                minOut,
                [tokenA.address, tokenB.address],
                wallet.address,
                deadline
            );
            const receiptSwapAB = await txSwapAB.wait();
            console.log('✅ Swap A→B succeeded. Tx hash:', receiptSwapAB.hash);
            swapSuccessAB = true;
        } catch (e) {
            console.error('❌ Swap A→B failed:', e.message);
        }

        // Swap B → A (using 1 tokenB)
        const testAmountInB = ethers.parseUnits('1', decimalsB);
        console.log('🔁 Performing test swap B → A...');
        let swapSuccessBA = false;
        try {
            const txSwapBA = await router.swapExactTokensForTokens(
                testAmountInB,
                minOut,
                [tokenB.address, tokenA.address],
                wallet.address,
                deadline
            );
            const receiptSwapBA = await txSwapBA.wait();
            console.log('✅ Swap B→A succeeded. Tx hash:', receiptSwapBA.hash);
            swapSuccessBA = true;
        } catch (e) {
            console.error('❌ Swap B→A failed:', e.message);
        }

        // 8️⃣ Record report entry
        report.push({
            pair: `${tokenA.symbol}-${tokenB.symbol}`,
            poolAddress: pairAddress,
            pairKey: getPairKey(tokenA.address, tokenB.address),
            reserves: {
                [tokenA.symbol]: ethers.formatUnits(reserveA, decimalsA),
                [tokenB.symbol]: ethers.formatUnits(reserveB, decimalsB)
            },
            swapTest: {
                AtoB: swapSuccessAB,
                BtoA: swapSuccessBA
            }
        });
    }

    // ------------------------------------------------------------
    // 9️⃣ Output final report
    // ------------------------------------------------------------
    const reportPath = path.resolve('liquidity_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log('\n📄 Report written to', reportPath);
    console.log('🟢 Automation complete.');
})();
