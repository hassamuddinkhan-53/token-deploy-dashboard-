const hre = require('hardhat');
const path = require('path');
const fs = require('fs');

async function main() {
  const { ethers } = hre;
  const contractsDir = path.join(__dirname, '../contracts');
  const files = fs.readdirSync(contractsDir).filter(f => f.endsWith('.sol'));
  const deployer = (await ethers.getSigners())[0];
  console.log(`Deployer: ${deployer.address}`);
  for (const file of files) {
    const contractName = file.replace('.sol', '');
    try {
      const Factory = await ethers.getContractFactory(contractName);
      // For contracts with constructor args, you may need to customize this:
      const contract = await Factory.deploy();
      await contract.deploymentTransaction().wait();
      const address = await contract.getAddress();
      const tx = contract.deploymentTransaction();
      const txHash = tx.hash;
      const network = hre.network.name;
      const etherscanPrefix = network === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';
      console.log('------------------------------');
      console.log(`Contract: ${contractName}`);
      console.log(`Address: ${address}`);
      console.log(`Tx Hash: ${txHash}`);
      console.log(`Etherscan: ${etherscanPrefix}/tx/${txHash}`);
    } catch (err) {
      console.error(`Failed to deploy ${contractName}:`, err.message);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
