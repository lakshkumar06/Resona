const { ethers } = require('ethers');
require('dotenv').config();

// Test blockchain connection and private key setup
async function testBlockchainConnection() {
  console.log('🧪 Testing blockchain connection and private key setup...');
  
  // Check environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`POLYGON_PRIVATE_KEY: ${process.env.POLYGON_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`ZIRCUIT_PRIVATE_KEY: ${process.env.ZIRCUIT_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  
  if (!process.env.POLYGON_PRIVATE_KEY) {
    console.log('❌ POLYGON_PRIVATE_KEY not found in environment');
    return;
  }
  
  try {
    // Test Polygon Amoy connection
    console.log('\n🔗 Testing Polygon Amoy connection...');
    const polygonProvider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
    const latestBlock = await polygonProvider.getBlockNumber();
    console.log(`✅ Polygon Amoy connected - Latest block: ${latestBlock}`);
    
    // Test private key and signer
    console.log('\n🔑 Testing private key and signer...');
    const privateKey = process.env.POLYGON_PRIVATE_KEY;
    const wallet = new ethers.Wallet(privateKey, polygonProvider);
    const address = await wallet.getAddress();
    console.log(`✅ Wallet created successfully - Address: ${address}`);
    
    // Check balance
    const balance = await polygonProvider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`💰 Wallet balance: ${balanceInEth} MATIC`);
    
    if (parseFloat(balanceInEth) < 0.01) {
      console.log('⚠️ Warning: Low balance - may not have enough gas for transactions');
    }
    
    // Test contract interaction (read-only)
    console.log('\n📋 Testing contract interaction...');
    const contractAddress = '0x6681c8A592485a495b6A26c9C2E752f194b5D6D0';
    const contractABI = [
      "event VoiceRegistered(bytes32 indexed commitment, address indexed owner, string walrusUri, uint256 timestamp)"
    ];
    
    const contract = new ethers.Contract(contractAddress, contractABI, polygonProvider);
    
    // Try to read the latest events
    const events = await contract.queryFilter('VoiceRegistered', latestBlock - 100, latestBlock);
    console.log(`✅ Contract interaction successful - Found ${events.length} VoiceRegistered events`);
    
    console.log('\n🎉 All tests passed! Blockchain connection is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('💡 Solution: Add more MATIC to your wallet for gas fees');
    } else if (error.message.includes('nonce')) {
      console.log('💡 Solution: Wait for pending transactions to confirm');
    } else if (error.message.includes('network')) {
      console.log('💡 Solution: Check your internet connection and RPC endpoint');
    }
  }
}

// Run the test
testBlockchainConnection();
