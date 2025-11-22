// Verify liquidity pools and test swaps
require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const ROUTER_ADDRESS = process.env.ROUTER_ADDRESS;

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : '0x' + PRIVATE_KEY, provider);

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];

const FACTORY_ABI = [
    'function getPair(address tokenA, address tokenB) view returns (address)'
];

const PAIR_ABI = [
    'function getReserves() view returns (uint112, uint112)',
    'function token0() view returns (address)',
    'function token1() view returns (address)'
];

const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, wallet);

function loadTokens() {
    return JSON.parse(fs.readFileSync(path.resolve('deployedTokens.json'), 'utf-8'));
}

(async () => {
    console.log('🔍 Verifying Liquidity Pools on Sepolia\n');
    console.log(`Factory: ${FACTORY_ADDRESS}`);
    console.log(`Router: ${ROUTER_ADDRESS}`);
    console.log(`Wallet: ${wallet.address}\n`);

    const tokens = loadTokens();
    const results = [];

    for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
            const tokenA = tokens[i];
            const tokenB = tokens[j];

            console.log(`\n📊 Checking Pair: ${tokenA.symbol} / ${tokenB.symbol}`);

            const pairAddress = await factory.getPair(tokenA.address, tokenB.address);

            if (pairAddress === ethers.ZeroAddress) {
                console.log(`   ❌ Pair does not exist`);
                results.push({
                    pair: `${tokenA.symbol}-${tokenB.symbol}`,
                    status: 'NOT_FOUND',
                    pairAddress: null
                });
                continue;
            }

            console.log(`   ✅ Pair exists at: ${pairAddress}`);

            const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);
            const [reserve0, reserve1] = await pair.getReserves();
            const token0Address = await pair.token0();

            const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
            const decimals0 = await token0Contract.decimals();
            const symbol0 = await token0Contract.symbol();

            const isTokenAToken0 = tokenA.address.toLowerCase() === token0Address.toLowerCase();
            const reserveA = isTokenAToken0 ? reserve0 : reserve1;
            const reserveB = isTokenAToken0 ? reserve1 : reserve0;

            const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, provider);
            const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, provider);
            const decimalsA = await tokenAContract.decimals();
            const decimalsB = await tokenBContract.decimals();

            const reserveAFormatted = ethers.formatUnits(reserveA, decimalsA);
            const reserveBFormatted = ethers.formatUnits(reserveB, decimalsB);

            console.log(`   📊 Reserves: ${reserveAFormatted} ${tokenA.symbol} / ${reserveBFormatted} ${tokenB.symbol}`);

            const expectedReserve = '2000.0';
            const status = (reserveAFormatted === expectedReserve && reserveBFormatted === expectedReserve)
                ? 'CORRECT'
                : 'INCORRECT';

            results.push({
                pair: `${tokenA.symbol}-${tokenB.symbol}`,
                pairAddress,
                status,
                reserves: {
                    [tokenA.symbol]: reserveAFormatted,
                    [tokenB.symbol]: reserveBFormatted
                },
                expected: expectedReserve
            });

            if (status === 'CORRECT') {
                console.log(`   ✅ Reserves are correct (2000 each)`);
            } else {
                console.log(`   ⚠️  Reserves are not 2000 each`);
            }
        }
    }

    // Save results
    fs.writeFileSync('verification_report.json', JSON.stringify(results, null, 2));
    console.log('\n✅ Verification complete. Report saved to verification_report.json');

    const correct = results.filter(r => r.status === 'CORRECT').length;
    const total = results.length;
    console.log(`\n📊 Summary: ${correct}/${total} pairs have correct reserves`);
})();
