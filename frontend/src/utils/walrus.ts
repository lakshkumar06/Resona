// Real Walrus SDK integration for storing voice fingerprints on blockchain
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient, RetryableWalrusClientError } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Import WASM URL for Vite
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';

export interface FingerprintData {
  walletAddress: string;
  embedding: number[];
  timestamp: number;
  model: string;
  metadata?: Record<string, any>;
}

class RealWalrusClient {
  private walrusClient: WalrusClient | null = null;
  private suiClient: SuiClient | null = null;
  private keypair: Ed25519Keypair | null = null;
  private isInitialized: boolean = false;
  
  // Backend wallet for storing all embeddings
  private readonly BACKEND_PRIVATE_KEY = 'suiprivkey1qz04l04xjnnnury484r2ffpun3nks4evv25f7vlua2xuj2maquwnyufxj7r';
  private readonly BACKEND_WALLET_ADDRESS = '0x0596cc6eab600b0eae0694c166b736379efc3349f82f430eb4d6e20690d33b14';

  constructor() {
    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
    try {
      
      if (this.isInitialized) {
        return;
      }

      // Initialize Sui client
      this.suiClient = new SuiClient({
        url: getFullnodeUrl('testnet'),
      });

      // Initialize Walrus client with proper WASM URL
      this.walrusClient = new WalrusClient({
        network: 'testnet',
        suiClient: this.suiClient,
        wasmUrl: walrusWasmUrl, // Use the imported WASM URL
        storageNodeClientOptions: {
          timeout: 60_000,
        }
      });

      // Initialize keypair from Sui private key
      try {
        this.keypair = Ed25519Keypair.fromSecretKey(this.BACKEND_PRIVATE_KEY);
      } catch (keyError) {
        console.error('❌ Failed to create keypair from Sui private key:', keyError);
        throw new Error('Invalid Sui private key format');
      }

      // Log the derived wallet address
      const derivedAddress = this.keypair.getPublicKey().toSuiAddress();

      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Walrus client initialization failed:', error);
      this.isInitialized = false;
      this.walrusClient = null;
      this.suiClient = null;
      this.keypair = null;
      throw error;
    }
  }

  async store(data: FingerprintData): Promise<{ success: boolean; hash: string; error?: string }> {
    try {
      console.log(`🌊 Starting Walrus storage process...`);
      console.log(`📊 Wallet address: ${data.walletAddress}`);
      console.log(`📊 Embedding dimensions: ${data.embedding.length}`);
      console.log(`📊 Model: ${data.model}`);
      
      // Ensure client is initialized
      console.log(`🔧 Checking Walrus client initialization...`);
      if (!this.isInitialized || !this.walrusClient || !this.keypair) {
        console.log(`🔧 Initializing Walrus client...`);
        await this.initialize();
      }

      // Double-check initialization
      if (!this.walrusClient || !this.keypair) {
        throw new Error('Failed to initialize Walrus client');
      }
      console.log(`✅ Walrus client ready`);

      // Convert data to Uint8Array
      console.log(`🔧 Preparing data for storage...`);
      const jsonString = JSON.stringify(data);
      const blob = new TextEncoder().encode(jsonString);
      console.log(`📊 Data size: ${blob.length} bytes`);

      // Check WAL balance before attempting storage
      console.log(`💰 Checking WAL token balance...`);
      const balanceResult = await this.checkWALBalance();
      
      if (balanceResult.error) {
        throw new Error(`Failed to check WAL balance: ${balanceResult.error}`);
      }
      console.log(`💰 WAL balance: ${balanceResult.balance}`);

      // Check SUI balance for gas fees
      console.log(`💰 Checking SUI balance for gas fees...`);
      const suiBalanceResult = await this.checkSUIBalance();
      
      if (suiBalanceResult.error) {
        console.warn('Failed to check SUI balance:', suiBalanceResult.error);
      } else {
        console.log(`💰 SUI balance: ${suiBalanceResult.balance}`);
      }

      // Add delay for demo visibility - blockchain operations take time
      console.log(`⏳ Preparing for blockchain storage (this takes time in real scenarios)...`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Write blob to Walrus blockchain - only the embedding data
      console.log(`🌊 Writing blob to Walrus blockchain...`);
      const { blobId } = await this.walrusClient.writeBlob({
        blob: blob,
        deletable: true,
        epochs: 1,
        signer: this.keypair,
      });

      console.log(`✅ Stored embedding data blob: ${blobId}`);
      console.log(`📊 Data stored: ${data.walletAddress} with ${data.embedding.length} embedding dimensions`);
      console.log(`🎉 Walrus storage process completed successfully!`);

      return {
        success: true,
        hash: blobId
      };
    } catch (error) {
      console.error('❌ Error storing fingerprint on blockchain:', error);
      
      // Handle retryable errors
      if (error instanceof RetryableWalrusClientError || (error instanceof Error && error.message.includes('NotEnoughBlobConfirmationsError'))) {
        console.log(`🔄 Retryable error detected, resetting Walrus client...`);
        this.walrusClient?.reset();
        
        return {
          success: false,
          hash: '',
          error: 'Network issues with Walrus storage nodes. Please try again in a few minutes.'
        };
      }

      let errorMessage = error instanceof Error ? error.message : 'Unknown blockchain error';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Not enough coins of type') && errorMessage.includes('WAL')) {
        errorMessage = 'Insufficient WAL tokens in backend wallet. Please add WAL tokens to: ' + this.BACKEND_WALLET_ADDRESS;
      }
      
      return {
        success: false,
        hash: '',
        error: errorMessage
      };
    }
  }

  async readFingerprint(blobId: string): Promise<FingerprintData | null> {
    try {
      console.log(`🔄 readFingerprint: Reading blob ${blobId}...`);
      
      // Ensure client is initialized
      if (!this.isInitialized || !this.walrusClient) {
        await this.initialize();
      }

      if (!this.walrusClient) {
        console.error('❌ readFingerprint: Failed to initialize Walrus client');
        throw new Error('Failed to initialize Walrus client');
      }


      // Read blob from Walrus blockchain
      const blob = await this.walrusClient.readBlob({ blobId });
      
      if (!blob) {
        console.log(`⚠️ readFingerprint: No blob found for ID ${blobId}`);
        return null;
      }

      console.log(`✅ readFingerprint: Blob ${blobId} retrieved successfully`);

      // Convert blob back to JSON
      const jsonString = new TextDecoder().decode(blob);
      const fingerprintData: FingerprintData = JSON.parse(jsonString);
      
      console.log(`✅ readFingerprint: Successfully parsed fingerprint for ${fingerprintData.walletAddress}`);
      return fingerprintData;
    } catch (error) {
      console.error(`❌ readFingerprint: Error reading blob ${blobId}:`, error);
      return null;
    }
  }

  // Method to get network status
  getNetworkStatus(): string {
    if (!this.isInitialized) {
      return 'Not initialized';
    }
    if (!this.suiClient) {
      return 'Sui client not ready';
    }
    if (!this.walrusClient) {
      return 'Walrus client not ready';
    }
    return 'Connected to Sui Testnet';
  }

  // Method to get keypair address
  getKeypairAddress(): string | null {
    return this.keypair?.getPublicKey().toSuiAddress() || null;
  }

  // Method to get backend wallet address
  getBackendWalletAddress(): string {
    if (this.BACKEND_WALLET_ADDRESS) {
      return this.BACKEND_WALLET_ADDRESS;
    }
    
    // Derive address from private key if not set
    if (this.keypair) {
      return this.keypair.getPublicKey().toSuiAddress();
    }
    
    // Fallback to empty string if keypair not initialized
    return '';
  }

  // Method to check WAL balance
  async checkWALBalance(): Promise<{ balance: string; error?: string }> {
    if (!this.suiClient) {
      return { balance: '0', error: 'Sui client not initialized' };
    }

    try {
      const WAL_COIN_TYPE = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';
      
      const balance = await this.suiClient.getBalance({
        owner: this.BACKEND_WALLET_ADDRESS,
        coinType: WAL_COIN_TYPE,
      });

      return { balance: balance.totalBalance };
    } catch (error) {
      console.error('Error checking WAL balance:', error);
      return { balance: '0', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Method to check SUI balance for gas fees
  async checkSUIBalance(): Promise<{ balance: string; error?: string }> {
    if (!this.suiClient) {
      return { balance: '0', error: 'Sui client not initialized' };
    }

    try {
      const balance = await this.suiClient.getBalance({
        owner: this.BACKEND_WALLET_ADDRESS,
        coinType: '0x2::sui::SUI',
      });

      return { balance: balance.totalBalance };
    } catch (error) {
      console.error('Error checking SUI balance:', error);
      return { balance: '0', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export a singleton instance
export const walrusClient = new RealWalrusClient();

// Helper function to store fingerprint
export async function storeFingerprint(
  walletAddress: string, 
  embedding: number[], 
  model: string = "ecapa-tdnn"
): Promise<{ success: boolean; hash: string; error?: string }> {
  const fingerprintData: FingerprintData = {
    walletAddress,
    embedding,
    timestamp: Date.now(),
    model,
    metadata: {
      version: "1.0.0",
      platform: "web3-voice-auth"
    }
  };

  // Store only the embedding data blob - no mapping needed
  return await walrusClient.store(fingerprintData);
}

// Helper function to read fingerprint by blob ID
export async function readFingerprintByBlobId(blobId: string): Promise<FingerprintData | null> {
  try {
    return await walrusClient.readFingerprint(blobId);
  } catch (error) {
    console.error('Error reading fingerprint by blob ID:', error);
    return null;
  }
}

// Helper function to get network status
export function getWalrusNetworkStatus(): string {
  return walrusClient.getNetworkStatus();
}

// Helper function to get keypair address
export function getWalrusKeypairAddress(): string | null {
  return walrusClient.getKeypairAddress();
}

// Helper function to get backend wallet address
export function getWalrusBackendWalletAddress(): string {
  return walrusClient.getBackendWalletAddress();
}

// Helper function to check WAL balance
export async function checkWALBalance(): Promise<{ balance: string; error?: string }> {
  return await walrusClient.checkWALBalance();
} 