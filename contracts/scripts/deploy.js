async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying VoiceRegistry contract with the account:", deployer.address);
  
  const VoiceRegistryFactory = await ethers.getContractFactory("VoiceRegistry");
  const VoiceRegistry = await VoiceRegistryFactory.deploy();
  
  await VoiceRegistry.waitForDeployment();
  
  console.log("VoiceRegistry deployed to:", VoiceRegistry.target);
  console.log("Deployment transaction hash:", VoiceRegistry.deploymentTransaction().hash);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
