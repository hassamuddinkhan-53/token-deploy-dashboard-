const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying Router with account:", await deployer.getAddress());

    const factoryAddress = process.env.FACTORY_ADDRESS;
    if (!factoryAddress) {
        throw new Error("FACTORY_ADDRESS not found in .env");
    }

    console.log("Using Factory address:", factoryAddress);

    const Router = await hre.ethers.getContractFactory("RouterV2");
    const router = await Router.deploy(factoryAddress);
    await router.waitForDeployment();

    const routerAddress = await router.getAddress();
    console.log("✅ Router deployed at:", routerAddress);

    // Update .env file
    const envPath = path.resolve('.env');
    let content = fs.readFileSync(envPath, 'utf8');
    content = content.replace(/ROUTER_ADDRESS=.*/, `ROUTER_ADDRESS=${routerAddress}`);
    fs.writeFileSync(envPath, content);
    console.log("✅ Updated .env with ROUTER_ADDRESS");
}

main().catch((e) => { console.error(e); process.exit(1); });
