const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying VoiceRegistryMirror to Polygon Amoy...");
  
  const VoiceRegistryMirror = await ethers.getContractFactory("VoiceRegistryMirror");
  const mirrorContract = await VoiceRegistryMirror.deploy();
  
  await mirrorContract.waitForDeployment();
  const address = await mirrorContract.getAddress();
  
  console.log("VoiceRegistryMirror deployed to:", address);
  console.log("Network: Polygon Amoy Testnet");
  console.log("Transaction hash:", mirrorContract.deploymentTransaction().hash);
  
  // Verify the contract
  console.log("\nTo verify on Polygonscan Amoy:");
  console.log(`npx hardhat verify --network polygonAmoy ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
