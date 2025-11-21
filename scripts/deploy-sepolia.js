const hre = require('hardhat');
const fs = require('fs');

const SEPOLIA_WETH = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

async function deployToSepolia() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  // Deploy Fake DAI (ERC20)
  const DAIFactory = await hre.ethers.getContractFactory('MockERC20');
  const dai = await DAIFactory.deploy('Fake DAI', 'DAI', hre.ethers.parseUnits('1000000', 18));
  await dai.waitForDeployment();
  console.log('✓ DAI deployed:', dai.target);

  // Deploy Fake USDC (ERC20)
  const USDCFactory = await hre.ethers.getContractFactory('MockERC20');
  const usdc = await USDCFactory.deploy('Fake USDC', 'USDC', hre.ethers.parseUnits('1000000', 6));
  await usdc.waitForDeployment();
  console.log('✓ USDC deployed:', usdc.target);

  // Deploy Uniswap V2 Factory
  const FactoryFactory = await hre.ethers.getContractFactory('UniswapV2Factory');
  const factory = await FactoryFactory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log('✓ Factory deployed:', factory.target);

  // Deploy Uniswap V2 Router
  const RouterFactory = await hre.ethers.getContractFactory('UniswapV2Router02');
  const router = await RouterFactory.deploy(factory.target, SEPOLIA_WETH);
  await router.waitForDeployment();
  console.log('✓ Router deployed:', router.target);

  // Create DAI-USDC pair
  let pairTx = await factory.createPair(dai.target, usdc.target);
  await pairTx.wait();
  const pairAddress = await factory.getPair(dai.target, usdc.target);
  console.log('✓ Pair created:', pairAddress);

  // Approve router to spend tokens
  let approveTx = await dai.approve(router.target, hre.ethers.MaxUint256);
  await approveTx.wait();
  approveTx = await usdc.approve(router.target, hre.ethers.MaxUint256);
  await approveTx.wait();
  console.log('✓ Router approved');

  // Add initial liquidity (optional, for testing)
  const addLiquidityTx = await router.addLiquidity(
    dai.target,
    usdc.target,
    hre.ethers.parseUnits('10000', 18),
    hre.ethers.parseUnits('10000', 6),
    0,
    0,
    deployer.address,
    Math.floor(Date.now() / 1000) + 60 * 20
  );
  await addLiquidityTx.wait();
  console.log('✓ Initial liquidity added');

  // Save addresses to config
  const config = {
    ROUTER_ADDRESS: router.target,
    FACTORY_ADDRESS: factory.target,
    DAI_ADDRESS: dai.target,
    USDC_ADDRESS: usdc.target,
    SEPOLIA_WETH: SEPOLIA_WETH
  };

  fs.writeFileSync(
    'frontend/config.js',
    `export const ROUTER_ADDRESS = "${config.ROUTER_ADDRESS}";\n` +
    `export const FACTORY_ADDRESS = "${config.FACTORY_ADDRESS}";\n` +
    `export const DAI_ADDRESS = "${config.DAI_ADDRESS}";\n` +
    `export const USDC_ADDRESS = "${config.USDC_ADDRESS}";\n` +
    `export const SEPOLIA_WETH = "${config.SEPOLIA_WETH}";\n` +
    `export const CHAIN_ID = 11155111;\n`
  );

  console.log('\n========== DEPLOYMENT SUMMARY ==========');
  console.log(`DAI:            ${dai.target}`);
  console.log(`USDC:           ${usdc.target}`);
  console.log(`Factory:        ${factory.target}`);
  console.log(`Router:         ${router.target}`);
  console.log(`Pair:           ${pairAddress}`);
  console.log(`WETH (Sepolia): ${SEPOLIA_WETH}`);
  console.log('========================================\n');
  console.log('✓ Addresses saved to frontend/config.js');
}

deployToSepolia()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
