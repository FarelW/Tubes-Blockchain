const hre = require("hardhat");

/**
 * Script to update oracle address in deployed contract
 * Usage: npx hardhat run scripts/updateOracle.js --network localhost
 */
async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const newOracleAddress = "0xEdA92D4CFb9552Ee81c457309a5b72fd0179d675";

  console.log("Updating oracle address...");
  console.log("Contract:", contractAddress);
  console.log("New Oracle:", newOracleAddress);

  // Get contract instance
  const EscrowContract = await hre.ethers.getContractFactory("EscrowContract");
  const contract = EscrowContract.attach(contractAddress);

  // Get current owner
  const owner = await contract.owner();
  console.log("Current owner:", owner);

  // Get signer (must be owner)
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer address:", signer.address);

  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    throw new Error("Signer must be the contract owner!");
  }

  // Get current oracle
  const currentOracle = await contract.oracle();
  console.log("Current oracle:", currentOracle);

  // Update oracle
  console.log("\nUpdating oracle address...");
  const tx = await contract.setOracle(newOracleAddress);
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Verify new oracle
  const newOracle = await contract.oracle();
  console.log("\nNew oracle address:", newOracle);
  console.log("Update successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

