import { ethers } from 'ethers';

// VoiceRegistry contract ABI - only the functions we need
const VOICE_REGISTRY_ABI = [
  "function registerVoice(bytes32 commitment, string calldata walrusUri) external",
  "function isRegistered(bytes32 commitment) external view returns (bool)",
  "function getOwner(bytes32 commitment) external view returns (address)",
  "function getWalrusUri(bytes32 commitment) external view returns (string)",
  "function revokeVoice(bytes32 commitment) external",
  "function logAuthenticationAttempt(address targetOwner, bytes32 targetCommitment, bool success, uint256 similarity, uint256 threshold, string calldata metadata) external returns (uint256)",
  "function getAuthAttempt(uint256 attemptId) external view returns (tuple(address attemptedBy, address targetOwner, bytes32 targetCommitment, bool success, uint256 similarity, uint256 threshold, uint256 timestamp, string metadata))",
  "function getTotalAuthAttempts() external view returns (uint256)",
  "function getAuthAttemptsForOwner(address targetOwner, uint256 offset, uint256 limit) external view returns (tuple(address attemptedBy, address targetOwner, bytes32 targetCommitment, bool success, uint256 similarity, uint256 threshold, uint256 timestamp, string metadata)[])",
  "event VoiceRegistered(bytes32 indexed commitment, address indexed owner, string walrusUri, uint256 timestamp)",
  "event VoiceRevoked(bytes32 indexed commitment, address indexed owner, uint256 timestamp)",
  "event AuthenticationAttempt(uint256 indexed attemptId, address indexed attemptedBy, address indexed targetOwner, bytes32 targetCommitment, bool success, uint256 similarity, uint256 threshold, uint256 timestamp, string metadata)"
];

// Contract address - you'll need to update this with your deployed contract address
const VOICE_REGISTRY_ADDRESS = "0xAC3a3123770346d8d4c186d892d81b4522b1D512";

/**
 * Cleans and validates an embedding array
 * @param embedding - Raw embedding array
 * @returns Cleaned embedding array
 */
export function sanitizeEmbedding(embedding: any[]): number[] {
  console.log('sanitizeEmbedding called with:', embedding);
  console.log('Embedding type:', typeof embedding);
  console.log('Is array:', Array.isArray(embedding));
  console.log('Length:', embedding?.length);
  
  if (!Array.isArray(embedding)) {
    throw new Error('Embedding must be an array');
  }
  
  // Check if it's a nested array
  if (embedding.length > 0 && Array.isArray(embedding[0])) {
    console.warn('Detected nested array, flattening...');
    embedding = embedding.flat();
    console.log('After flattening:', embedding);
  }
  
  return embedding.map((value: any, index: number) => {
    // Convert to number if it's a string
    let numValue = typeof value === 'string' ? parseFloat(value) : Number(value);
    
    // Check if conversion was successful
    if (isNaN(numValue) || !isFinite(numValue)) {
      console.warn(`Invalid embedding value at index ${index}: ${value}, replacing with 0`);
      numValue = 0;
    }
    
    return numValue;
  });
}

/**
 * Converts a float array to a bytes32 commitment
 * @param embedding - Array of float values (voice embedding)
 * @returns bytes32 commitment hash
 */
export function vectorToCommitment(embedding: number[]): string {
  if (embedding.length === 0) {
    throw new Error('Embedding cannot be empty');
  }

  // Clean and validate the embedding
  const cleanEmbedding = sanitizeEmbedding(embedding);

  // Quantize: multiply by 10000 and round to nearest integer
  // This matches the circom circuit's expected scale (threshold is 5625, circuit scales by 10000)
  const quantizedValues = cleanEmbedding.map(value => {
    const scaled = value * 10000;
    return Math.round(scaled);
  });

  // Validate quantized values are within int256 range
  for (let i = 0; i < quantizedValues.length; i++) {
    const value = quantizedValues[i];
    if (value < Number.MIN_SAFE_INTEGER || value > Number.MAX_SAFE_INTEGER) {
      throw new Error(`Quantized value at index ${i} (${value}) is out of safe integer range`);
    }
  }

  // Encode as int256 array and hash with keccak256
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['int256[]'],
    [quantizedValues]
  );
  
  return ethers.keccak256(encoded);
}

/**
 * Gets a signer from either Dynamic wallet or window.ethereum
 * @param dynamicSigner - Optional signer from Dynamic wallet
 * @returns ethers Signer
 */
export async function getSigner(dynamicSigner?: any): Promise<ethers.Signer> {
  if (dynamicSigner) {
    return dynamicSigner;
  }

  if (typeof window !== 'undefined' && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    return await provider.getSigner();
  }

  throw new Error('No wallet provider available');
}

/**
 * Gets a provider for the Zircuit testnet
 * @returns ethers Provider
 */
export function getProvider(): ethers.Provider {
  return new ethers.JsonRpcProvider('https://garfield-testnet.zircuit.com/', {
    chainId: 48898,
    name: 'Zircuit Garfield Testnet'
  });
}

/**
 * Switches the user's wallet to the Zircuit Garfield testnet
 * @param signer - ethers Signer
 * @returns Promise<boolean> - success status
 */
export async function switchToZircuitNetwork(signer: ethers.Signer): Promise<boolean> {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xbf02' }], // 48898 in hex
      });
      return true;
    }
    return false;
  } catch (error: any) {
    // If the network doesn't exist, add it
    if (error.code === 4902) {
      try {
        const ethereum = (window as any).ethereum;
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xbf02', // 48898 in hex
            chainName: 'Zircuit Garfield Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://garfield-testnet.zircuit.com/'],
            blockExplorerUrls: ['https://garfield-testnet.zircuit.com/'],
          }],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Zircuit network:', addError);
        return false;
      }
    }
    console.error('Failed to switch to Zircuit network:', error);
    return false;
  }
}

/**
 * Gets the VoiceRegistry contract instance
 * @param signer - ethers Signer
 * @returns VoiceRegistry contract instance
 */
export function getVoiceRegistryContract(signer: ethers.Signer) {
  return new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, signer);
}

/**
 * Registers a voice on the blockchain
 * @param embedding - Voice embedding array
 * @param walrusUri - URI from Walrus storage
 * @param dynamicSigner - Optional signer from Dynamic wallet
 * @returns Transaction receipt
 */
export async function registerVoiceOnChain(
  embedding: number[], 
  walrusUri: string, 
  dynamicSigner?: any
): Promise<ethers.ContractTransactionReceipt> {
  try {
    console.log(`⛓️ Starting voice registration on blockchain...`);
    console.log(`📊 Embedding array length: ${embedding.length}`);
    console.log(`📊 Embedding sample values: ${embedding.slice(0, 5)}`);
    console.log(`📊 Embedding contains NaN: ${embedding.some(val => isNaN(val))}`);
    console.log(`📊 Embedding contains invalid values: ${embedding.some(val => !isFinite(val))}`);
    console.log(`🌊 Walrus URI: ${walrusUri}`);
    
    const signer = await getSigner(dynamicSigner);
    console.log(`🔑 Signer obtained: ${await signer.getAddress()}`);
    
    // Check and switch to correct network if needed
    console.log(`🌐 Checking network configuration...`);
    const networkSwitched = await switchToZircuitNetwork(signer);
    if (networkSwitched) {
      console.log('✅ Successfully switched to Zircuit Garfield testnet');
    } else {
      console.log('ℹ️ Already on Zircuit Garfield testnet or network switch failed');
    }
    
    const contract = getVoiceRegistryContract(signer);
    console.log(`📋 VoiceRegistry contract instance created`);
    
    // Generate commitment from embedding
    console.log(`🔐 Generating commitment hash from embedding...`);
    const commitment = vectorToCommitment(embedding);
    console.log(`✅ Commitment generated: ${commitment}`);
    
    // Add delay for demo visibility - commitment generation takes time
    console.log(`⏳ Preparing commitment for blockchain (this takes time in real scenarios)...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log(`📝 Registering voice on blockchain...`);
    console.log(`   Commitment: ${commitment}`);
    console.log(`   Walrus URI: ${walrusUri}`);
    console.log(`   Contract: ${VOICE_REGISTRY_ADDRESS}`);
    
    // Call registerVoice function
    const tx = await contract.registerVoice(commitment, walrusUri);
    console.log(`📡 Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);
    
    // Add delay for demo visibility - blockchain confirmation takes time
    console.log(`⏳ Transaction confirmation in progress (this takes time in real scenarios)...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    console.log(`✅ Voice registered successfully!`);
    console.log(`📊 Transaction hash: ${receipt.hash}`);
    console.log(`📊 Block number: ${receipt.blockNumber}`);
    console.log(`📊 Gas used: ${receipt.gasUsed?.toString() || 'Unknown'}`);
    console.log(`🎉 Blockchain registration process completed!`);
    
    return receipt;
  } catch (error) {
    console.error('❌ Error registering voice on chain:', error);
    throw error;
  }
}

/**
 * Checks if a voice commitment is registered
 * @param embedding - 144-dimensional voice embedding array
 * @returns Promise<boolean>
 */
export async function isVoiceRegistered(embedding: number[]): Promise<boolean> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    const commitment = vectorToCommitment(embedding);
    return await contract.isRegistered(commitment);
  } catch (error) {
    console.error('Error checking voice registration:', error);
    throw error;
  }
}

/**
 * Gets the owner of a voice commitment
 * @param embedding - 144-dimensional voice embedding array
 * @returns Promise<string> - owner address
 */
export async function getVoiceOwner(embedding: number[]): Promise<string> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    const commitment = vectorToCommitment(embedding);
    return await contract.getOwner(commitment);
  } catch (error) {
    console.error('Error getting voice owner:', error);
    throw error;
  }
}

/**
 * Gets the Walrus URI for a voice commitment
 * @param embedding - 144-dimensional voice embedding array
 * @returns Promise<string> - Walrus URI
 */
export async function getVoiceWalrusUri(embedding: number[]): Promise<string> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    const commitment = vectorToCommitment(embedding);
    return await contract.getWalrusUri(commitment);
  } catch (error) {
    console.error('Error getting voice Walrus URI:', error);
    throw error;
  }
}

/**
 * Revokes a voice (only owner can do this)
 * @param embedding - Voice embedding array
 * @param dynamicSigner - Optional signer from Dynamic wallet
 * @returns Transaction receipt
 */
export async function revokeVoice(
  embedding: number[], 
  dynamicSigner?: any
): Promise<ethers.ContractTransactionReceipt> {
  try {
    const signer = await getSigner(dynamicSigner);
    const contract = getVoiceRegistryContract(signer);
    
    const commitment = vectorToCommitment(embedding);
    
    console.log('Revoking voice with commitment:', commitment);
    
    const tx = await contract.revokeVoice(commitment);
    const receipt = await tx.wait();
    
    console.log('Voice revoked successfully!');
    console.log('Transaction hash:', receipt.hash);
    
    return receipt;
  } catch (error) {
    console.error('Error revoking voice:', error);
    throw error;
  }
}

/**
 * Interface for authentication attempt data
 */
export interface AuthAttemptData {
  targetOwner: string;
  targetEmbedding: number[];
  success: boolean;
  similarity: number; // 0-1 range
  threshold: number; // 0-1 range
  metadata?: Record<string, any>;
}

/**
 * Logs an authentication attempt on the blockchain
 * @param attemptData - Authentication attempt data
 * @param dynamicSigner - Optional signer from Dynamic wallet
 * @returns Transaction receipt and attempt ID
 */
export async function logAuthenticationAttempt(
  attemptData: AuthAttemptData,
  dynamicSigner?: any
): Promise<{ receipt: ethers.ContractTransactionReceipt; attemptId: bigint }> {
  try {
    console.log(`⛓️ Logging authentication attempt on blockchain...`);
    console.log(`📊 Target owner: ${attemptData.targetOwner}`);
    console.log(`📊 Success: ${attemptData.success}`);
    console.log(`📊 Similarity: ${(attemptData.similarity * 100).toFixed(2)}%`);
    console.log(`📊 Threshold: ${(attemptData.threshold * 100).toFixed(2)}%`);
    
    const signer = await getSigner(dynamicSigner);
    console.log(`🔑 Signer obtained: ${await signer.getAddress()}`);
    
    // Check and switch to correct network if needed
    const networkSwitched = await switchToZircuitNetwork(signer);
    if (networkSwitched) {
      console.log('✅ Successfully switched to Zircuit Garfield testnet');
    }
    
    const contract = getVoiceRegistryContract(signer);
    
    // Generate commitment from target embedding
    const targetCommitment = vectorToCommitment(attemptData.targetEmbedding);
    console.log(`🔐 Target commitment: ${targetCommitment}`);
    
    // Scale similarity and threshold to uint256 (multiply by 10000)
    const scaledSimilarity = Math.round(attemptData.similarity * 10000);
    const scaledThreshold = Math.round(attemptData.threshold * 10000);
    
    // Prepare metadata
    const metadata = JSON.stringify({
      timestamp: Date.now(),
      zkProofGenerated: true,
      ...attemptData.metadata
    });
    
    console.log(`📝 Logging authentication attempt...`);
    console.log(`   Target Owner: ${attemptData.targetOwner}`);
    console.log(`   Target Commitment: ${targetCommitment}`);
    console.log(`   Success: ${attemptData.success}`);
    console.log(`   Scaled Similarity: ${scaledSimilarity} (${attemptData.similarity * 100}%)`);
    console.log(`   Scaled Threshold: ${scaledThreshold} (${attemptData.threshold * 100}%)`);
    console.log(`   Metadata: ${metadata}`);
    
    // Call logAuthenticationAttempt function
    const tx = await contract.logAuthenticationAttempt(
      attemptData.targetOwner,
      targetCommitment,
      attemptData.success,
      scaledSimilarity,
      scaledThreshold,
      metadata
    );
    
    console.log(`📡 Transaction sent: ${tx.hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    
    // Extract the attemptId from the event logs
    const authAttemptEvent = receipt.logs?.find(
      log => log.topics[0] === ethers.id('AuthenticationAttempt(uint256,address,address,bytes32,bool,uint256,uint256,uint256,string)')
    );
    
    let attemptId = BigInt(0);
    if (authAttemptEvent) {
      // Parse the event to get the attemptId (first indexed parameter)
      const parsedLog = contract.interface.parseLog({
        topics: authAttemptEvent.topics,
        data: authAttemptEvent.data
      });
      if (parsedLog) {
        attemptId = parsedLog.args[0]; // attemptId is the first parameter
      }
    }
    
    console.log(`✅ Authentication attempt logged successfully!`);
    console.log(`📊 Transaction hash: ${receipt.hash}`);
    console.log(`📊 Block number: ${receipt.blockNumber}`);
    console.log(`📊 Attempt ID: ${attemptId.toString()}`);
    console.log(`🎉 Authentication logging process completed!`);
    
    return { receipt, attemptId };
  } catch (error) {
    console.error('❌ Error logging authentication attempt:', error);
    throw error;
  }
}

/**
 * Gets authentication attempt details by ID
 * @param attemptId - The attempt ID to query
 * @returns Authentication attempt details
 */
export async function getAuthAttempt(attemptId: bigint): Promise<any> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    const attempt = await contract.getAuthAttempt(attemptId);
    
    return {
      attemptedBy: attempt.attemptedBy,
      targetOwner: attempt.targetOwner,
      targetCommitment: attempt.targetCommitment,
      success: attempt.success,
      similarity: Number(attempt.similarity) / 10000, // Convert back to 0-1 range
      threshold: Number(attempt.threshold) / 10000, // Convert back to 0-1 range
      timestamp: Number(attempt.timestamp),
      metadata: JSON.parse(attempt.metadata || '{}')
    };
  } catch (error) {
    console.error('Error getting authentication attempt:', error);
    throw error;
  }
}

/**
 * Gets the total number of authentication attempts
 * @returns Total number of attempts
 */
export async function getTotalAuthAttempts(): Promise<bigint> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    return await contract.getTotalAuthAttempts();
  } catch (error) {
    console.error('Error getting total auth attempts:', error);
    throw error;
  }
}

/**
 * Gets authentication attempts for a specific owner (paginated)
 * @param targetOwner - The owner address to query
 * @param offset - Number of results to skip
 * @param limit - Maximum number of results to return (max 100)
 * @returns Array of authentication attempts
 */
export async function getAuthAttemptsForOwner(
  targetOwner: string,
  offset: number = 0,
  limit: number = 10
): Promise<any[]> {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(VOICE_REGISTRY_ADDRESS, VOICE_REGISTRY_ABI, provider);
    
    const attempts = await contract.getAuthAttemptsForOwner(targetOwner, offset, limit);
    
    return attempts.map((attempt: any) => ({
      attemptedBy: attempt.attemptedBy,
      targetOwner: attempt.targetOwner,
      targetCommitment: attempt.targetCommitment,
      success: attempt.success,
      similarity: Number(attempt.similarity) / 10000, // Convert back to 0-1 range
      threshold: Number(attempt.threshold) / 10000, // Convert back to 0-1 range
      timestamp: Number(attempt.timestamp),
      metadata: JSON.parse(attempt.metadata || '{}')
    }));
  } catch (error) {
    console.error('Error getting auth attempts for owner:', error);
    throw error;
  }
}
