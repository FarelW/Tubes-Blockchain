const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // For development, use deployer as oracle (in production, use separate oracle address)
  const oracleAddress = deployer.address;
  console.log("Oracle address:", oracleAddress);

  // Deploy EscrowContract
  console.log("\nDeploying EscrowContract...");
  const EscrowContract = await hre.ethers.getContractFactory("EscrowContract");
  const escrowContract = await EscrowContract.deploy(oracleAddress);

  await escrowContract.waitForDeployment();
  const contractAddress = await escrowContract.getAddress();

  console.log("EscrowContract deployed to:", contractAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    escrowContract: contractAddress,
    oracle: oracleAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Write deployment info to file
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`\nDeployment info saved to deployments/${hre.network.name}.json`);

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

