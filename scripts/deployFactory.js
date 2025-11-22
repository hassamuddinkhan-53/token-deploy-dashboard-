const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying SimpleFactory with account:", await deployer.getAddress());

    const Factory = await hre.ethers.getContractFactory("SimpleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const factoryAddress = await factory.getAddress();
    console.log("✅ Factory deployed at:", factoryAddress);

    // Update .env file
    const envPath = path.resolve('.env');
    let content = fs.readFileSync(envPath, 'utf8');
    content = content.replace(/FACTORY_ADDRESS=.*/, `FACTORY_ADDRESS=${factoryAddress}`);
    fs.writeFileSync(envPath, content);
    console.log("✅ Updated .env with FACTORY_ADDRESS");
}

main().catch((e) => { console.error(e); process.exit(1); });
