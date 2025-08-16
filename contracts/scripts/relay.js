const { ethers } = require("hardhat");
const config = require("../config");

async function main() {
  console.log("Starting voice registration relay...");
  
  // Validate configuration
  if (config.ZIRCUIT_CONTRACT_ADDRESS === "0x..." || config.MIRROR_CONTRACT_ADDRESS === "0x...") {
    console.error("Please update the contract addresses in config.js before running the relay");
    process.exit(1);
  }
  
  // Zircuit provider and contract
  const zircuitProvider = new ethers.JsonRpcProvider(config.ZIRCUIT_RPC);
  const zircuitAbi = [
    "event VoiceRegistered(bytes32 indexed commitment, address indexed owner, string walrusUri, uint256 timestamp)"
  ];
  const zircuitContract = new ethers.Contract(config.ZIRCUIT_CONTRACT_ADDRESS, zircuitAbi, zircuitProvider);
  
  // Polygon Amoy provider and mirror contract
  const polygonProvider = new ethers.JsonRpcProvider(config.POLYGON_AMOY_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY || "0x0a5ddc6cfa8e084c6503c18fa85dc9d45e804df0edc55c7fe60ea99d5017933a", polygonProvider);
  
  const mirrorAbi = [
    "function mirrorVoiceRegistration(bytes32 commitment, string walrusUri, uint256 timestamp) external"
  ];
  const mirrorContract = new ethers.Contract(config.MIRROR_CONTRACT_ADDRESS, mirrorAbi, wallet);
  
  console.log("Listening for VoiceRegistered events on Zircuit at:", config.ZIRCUIT_CONTRACT_ADDRESS);
  console.log("Mirroring to Polygon Amoy at:", config.MIRROR_CONTRACT_ADDRESS);
  
  // Relay logic
  zircuitContract.on("VoiceRegistered", async (commitment, owner, walrusUri, timestamp) => {
    try {
      console.log("Detected registration on Zircuit:", commitment);
      console.log("Owner:", owner);
      console.log("Walrus URI:", walrusUri);
      console.log("Timestamp:", timestamp.toString());
      
      const tx = await mirrorContract.mirrorVoiceRegistration(commitment, walrusUri, timestamp);
      console.log("Mirroring transaction sent:", tx.hash);
      
      await tx.wait();
      console.log("Successfully mirrored to Polygon Amoy:", tx.hash);
      console.log("---");
    } catch (error) {
      console.error("Error mirroring registration:", error);
    }
  });
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\nShutting down relay...');
    process.exit(0);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
