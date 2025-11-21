const hre = require('hardhat');

async function main() {
  const [deployer, alice, bob] = await hre.ethers.getSigners();
  console.log('Deployer:', await deployer.getAddress());
  console.log('Alice:', await alice.getAddress());
  console.log('Bob:', await bob.getAddress());

  const Mock = await hre.ethers.getContractFactory('MockERC20', deployer);
  const total = hre.ethers.parseUnits('1000000', 18);
  const tokenA = await Mock.deploy('TokenA', 'TKA', total);
  await tokenA.waitForDeployment();
  const tokenB = await Mock.deploy('TokenB', 'TKB', total);
  await tokenB.waitForDeployment();

  console.log('TokenA:', tokenA.target);
  console.log('TokenB:', tokenB.target);

  // Check initial balances (deployer should hold total)
  const balA = await tokenA.balanceOf(await deployer.getAddress());
  const balB = await tokenB.balanceOf(await deployer.getAddress());
  console.log('Deployer TokenA balance == total:', balA.eq(total));
  console.log('Deployer TokenB balance == total:', balB.eq(total));

  // Transfer 1000 TKA to Alice
  const amt = hre.ethers.parseUnits('1000', 18);
  const tx = await tokenA.transfer(await alice.getAddress(), amt);
  await tx.wait();
  const aliceBal = await tokenA.balanceOf(await alice.getAddress());
  console.log('Alice received 1000 TKA:', aliceBal.eq(amt));

  // Approve Bob to spend 500 TKA from Deployer
  const approveAmt = hre.ethers.parseUnits('500', 18);
  const app = await tokenA.approve(await bob.getAddress(), approveAmt);
  await app.wait();
  const allowance = await tokenA.allowance(await deployer.getAddress(), await bob.getAddress());
  console.log('Allowance for Bob is 500 TKA:', allowance.eq(approveAmt));

  // Have Bob call transferFrom to move 200 from deployer to Bob
  const bobConnected = tokenA.connect(bob);
  const transferFromAmt = hre.ethers.parseUnits('200', 18);
  const tx2 = await bobConnected.transferFrom(await deployer.getAddress(), await bob.getAddress(), transferFromAmt);
  await tx2.wait();
  const bobBal = await tokenA.balanceOf(await bob.getAddress());
  console.log('Bob received 200 TKA via transferFrom:', bobBal.eq(transferFromAmt));

  console.log('Simple token tests completed.');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
