const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const Mock = await hre.ethers.getContractFactory('MockERC20', deployer);
const Factory = await hre.ethers.getContractFactory('SimpleFactory', deployer);
const Router = await hre.ethers.getContractFactory('UniswapStyleRouter', deployer);


  const dai = await Mock.deploy('DAI', 'DAI', hre.ethers.parseUnits('1000000', 18));
  await dai.waitForDeployment();
  const usdc = await Mock.deploy('USDC', 'USDC', hre.ethers.parseUnits('1000000', 18));
  await usdc.waitForDeployment();

  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const router = await Router.deploy(factory.target);
  await router.waitForDeployment();

  const pairAddr = await factory.getPair(dai.target, usdc.target);

  console.log('Deployer:', await deployer.getAddress());
  console.log('DAI:', dai.target);
  console.log('USDC:', usdc.target);
  console.log('Factory:', factory.target);
  console.log('Router:', router.target);
  console.log('Pair (may be zero until ensure):', pairAddr);

  const add = await dai.approve(router.target, hre.ethers.MaxUint256);
  await add.wait();
  const add2 = await usdc.approve(router.target, hre.ethers.MaxUint256);
  await add2.wait();

  const tx = await router.addLiquidity(dai.target, usdc.target, hre.ethers.parseUnits('10000', 18), hre.ethers.parseUnits('10000', 18));
  await tx.wait();

  const pairAfter = await factory.getPair(dai.target, usdc.target);
  console.log('Pair after ensure:', pairAfter);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
