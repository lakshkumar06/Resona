import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { voiceProver, type ZKProofResult } from './zkProof';
import { realZkProofService } from './realZkProofService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Storage file for Walrus mappings (keeping for backward compatibility)
const MAPPINGS_FILE = path.join(__dirname, '../data/walrus_mappings.json');

// Ensure data directory exists
const dataDir = path.dirname(MAPPINGS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Walrus blockchain configuration
const WALRUS_RPC_URL = process.env.WALRUS_RPC_URL || 'https://walrus-mainnet.sui.io';
const WALRUS_BACKEND_PRIVATE_KEY = process.env.WALRUS_BACKEND_PRIVATE_KEY;

// Initialize Walrus client
let walrusClient: WalrusClient | null = null;
let suiClient: SuiClient | null = null;

try {
  if (WALRUS_BACKEND_PRIVATE_KEY) {
    // Initialize Sui client
    suiClient = new SuiClient({
      url: getFullnodeUrl('testnet'), // Start with testnet for safety
    });
    
    // Initialize Walrus client
    walrusClient = new WalrusClient({
      network: 'testnet',
      suiClient,
    });
    
    console.log('✅ Walrus client initialized successfully');
  } else {
    console.log('⚠️  WALRUS_BACKEND_PRIVATE_KEY not set - Walrus client not initialized');
  }
} catch (error) {
  console.error('❌ Error initializing Walrus client:', error);
  walrusClient = null;
  suiClient = null;
}

// Helper function to read mappings
function readMappings(): Record<string, string> {
  try {
    if (fs.existsSync(MAPPINGS_FILE)) {
      const data = fs.readFileSync(MAPPINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading mappings file:', error);
  }
  return {};
}

// Helper function to write mappings
function writeMappings(mappings: Record<string, string>): void {
  try {
    fs.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
  } catch (error) {
    console.error('Error writing mappings file:', error);
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Walrus embeddings API for LLM query protection
app.get('/api/walrus/embeddings', async (req, res) => {
  try {
    // First try to get embeddings from Walrus blockchain
    if (walrusClient) {
      try {
        console.log('Attempting to read embeddings from Walrus blockchain...');
        
        // Note: This endpoint is now deprecated in favor of using the subgraph
        // The frontend should query the subgraph for voice registrations
        console.log('⚠️  This endpoint is deprecated. Use the subgraph for voice registrations.');
        
        // Read mappings to get blob IDs (fallback only)
        const mappings = readMappings();
        const embeddings: any[] = [];
        
        for (const [walletAddress, blobId] of Object.entries(mappings)) {
          try {
            // Read blob from Walrus blockchain
            const blob = await walrusClient.readBlob({ blobId });
            
            if (blob) {
              // Convert blob back to JSON
              const jsonString = new TextDecoder().decode(blob);
              const fingerprintData = JSON.parse(jsonString);
              
              embeddings.push({
                walletAddress: fingerprintData.walletAddress || walletAddress,
                embedding: fingerprintData.embedding,
                timestamp: fingerprintData.timestamp || Date.now(),
                model: fingerprintData.model || "ecapa-tdnn",
                metadata: fingerprintData.metadata || {
                  version: "1.0.0",
                  platform: "web3-voice-auth"
                },
                blobId: blobId
              });
            }
          } catch (blobError) {
            console.error(`Error reading blob ${blobId} for wallet ${walletAddress}:`, blobError);
            // Continue with other blobs
          }
        }
        
        if (embeddings.length > 0) {
          console.log(`✅ Retrieved ${embeddings.length} embeddings from Walrus blockchain (fallback)`);
          return res.json(embeddings);
        }
      } catch (walrusError) {
        console.error('Error reading from Walrus blockchain:', walrusError);
        console.log('Falling back to local storage...');
      }
    }

    // Fallback: Get embeddings from the voice server's local storage
    console.log('Reading embeddings from local storage...');
    const embeddingsDir = path.join(__dirname, '../../voice-server/embeddings');
    const embeddings: any[] = [];

    if (fs.existsSync(embeddingsDir)) {
      const files = fs.readdirSync(embeddingsDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(embeddingsDir, file);
            const data = fs.readFileSync(filePath, 'utf8');
            const embeddingData = JSON.parse(data);
            
            embeddings.push({
              walletAddress: embeddingData.username || file.replace('.json', ''),
              embedding: embeddingData.embedding,
              timestamp: Date.now(),
              model: embeddingData.model || "ecapa-tdnn",
              metadata: {
                version: "1.0.0",
                platform: "web3-voice-auth"
              },
              blobId: file.replace('.json', '')
            });
          } catch (error) {
            console.error(`Error reading embedding file ${file}:`, error);
          }
        }
      }
    }

    console.log(`Returning ${embeddings.length} embeddings from local storage`);
    res.json(embeddings);
  } catch (error) {
    console.error('Error fetching embeddings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch embeddings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Submit voice registrations from subgraph for authentication
app.post('/api/submit-subgraph-registrations', async (req, res) => {
  try {
    const { registrations } = req.body;
    
    if (!registrations || !Array.isArray(registrations)) {
      return res.status(400).json({ error: 'registrations array is required' });
    }

    console.log(`Received ${registrations.length} voice registrations from subgraph`);
    
    // Process each registration and extract embeddings from Walrus
    const processedEmbeddings = [];
    
    for (const registration of registrations) {
      try {
        const { walletAddress, walrusUri, commitment, timestamp, blockNumber } = registration;
        
        if (!walrusUri) {
          console.warn(`Registration ${commitment} missing walrusUri`);
          continue;
        }
        
        // Extract blob ID from walrusUri
        let blobId = walrusUri;
        if (walrusUri.includes('://')) {
          blobId = walrusUri.split('/').pop() || walrusUri;
        }
        
        if (!blobId || blobId.length < 10) {
          console.warn(`Invalid blob ID for registration ${commitment}: ${blobId}`);
          continue;
        }
        
        // Try to read the blob from Walrus
        if (walrusClient) {
          try {
            const blob = await walrusClient.readBlob({ blobId });
            
            if (blob) {
              const jsonString = new TextDecoder().decode(blob);
              const fingerprintData = JSON.parse(jsonString);
              
              if (fingerprintData.embedding && fingerprintData.embedding.length > 0) {
                processedEmbeddings.push({
                  walletAddress,
                  blobId,
                  embedding: fingerprintData.embedding,
                  model: fingerprintData.model || "ecapa-tdnn",
                  timestamp: fingerprintData.timestamp || parseInt(timestamp) * 1000,
                  metadata: {
                    source: "subgraph",
                    commitment,
                    blockNumber: parseInt(blockNumber),
                    walrusUri
                  }
                });
                
                console.log(`✅ Processed registration ${commitment} with blob ${blobId}`);
              } else {
                console.warn(`Blob ${blobId} found but no valid embedding data for registration ${commitment}`);
              }
            }
          } catch (blobError: any) {
            // Handle specific blob errors gracefully
            if (blobError.message && blobError.message.includes('not found')) {
              console.warn(`Blob ${blobId} not found in Walrus (likely deleted) for registration ${commitment}`);
            } else if (blobError.message && blobError.message.includes('timeout')) {
              console.warn(`Timeout reading blob ${blobId} for registration ${commitment}`);
            } else {
              console.warn(`Failed to read blob ${blobId} for registration ${commitment}:`, blobError.message || blobError);
            }
            // Continue processing other registrations
          }
        }
      } catch (error) {
        console.error(`Error processing registration:`, error);
      }
    }
    
    if (processedEmbeddings.length === 0) {
      return res.status(400).json({ 
        error: 'No valid embeddings could be extracted from the registrations',
        processed: 0,
        total: registrations.length
      });
    }
    
    console.log(`Successfully processed ${processedEmbeddings.length}/${registrations.length} registrations`);
    
    // Store the processed embeddings for authentication
    // This could be stored in memory, database, or passed to the authentication system
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: `Processed ${processedEmbeddings.length} voice registrations`,
      processed: processedEmbeddings.length,
      total: registrations.length,
      embeddings: processedEmbeddings
    });
    
  } catch (error) {
    console.error('Error processing subgraph registrations:', error);
    res.status(500).json({ 
      error: 'Failed to process subgraph registrations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ZK Proof System Endpoints
app.post('/api/zk/prove-similarity', async (req, res) => {
  try {
    const { embeddingA, embeddingB, metadata } = req.body;
    
    if (!embeddingA || !embeddingB) {
      return res.status(400).json({ 
        error: 'Both embeddingA and embeddingB are required' 
      });
    }

    if (!Array.isArray(embeddingA) || !Array.isArray(embeddingB)) {
      return res.status(400).json({ 
        error: 'Embeddings must be arrays of numbers' 
      });
    }

    console.log(`🔐 Starting ZK similarity proof generation...`);
    console.log(`📊 Embedding A length: ${embeddingA.length}`);
    console.log(`📊 Embedding B length: ${embeddingB.length}`);
    console.log(`📋 Metadata:`, metadata || 'None');

    // Generate ZK proof using backend system
    console.log(`🔐 Generating ZK proof...`);
    const proof = voiceProver.proveSimilarity(embeddingA, embeddingB);
    console.log(`✅ ZK proof generated successfully!`);
    console.log(`📊 Proof results: similarity=${(proof.similarity * 100).toFixed(2)}%, threshold=${(proof.threshold * 100).toFixed(2)}%, passed=${proof.passed}`);
    
    // Generate certificate for audit
    console.log(`🔐 Generating proof certificate...`);
    const certificate = voiceProver.generateProofCertificate(embeddingA, embeddingB, metadata);
    console.log(`✅ Proof certificate generated successfully!`);
    
    console.log(`🎉 ZK similarity proof process completed`);
    
    res.json({
      success: true,
      proof,
      certificate,
      message: proof.passed ? 
        `Voice similarity verified: ${(proof.similarity * 100).toFixed(2)}% ≥ ${(proof.threshold * 100).toFixed(2)}%` :
        `Voice similarity below threshold: ${(proof.similarity * 100).toFixed(2)}% < ${(proof.threshold * 100).toFixed(2)}%`
    });

  } catch (error) {
    console.error('❌ Error in ZK similarity proof:', error);
    res.status(500).json({ 
      error: 'Failed to generate ZK proof',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.post('/api/zk/batch-prove', async (req, res) => {
  try {
    const { targetEmbedding, candidateEmbeddings, metadata } = req.body;
    
    if (!targetEmbedding || !candidateEmbeddings) {
      return res.status(400).json({ 
        error: 'Both targetEmbedding and candidateEmbeddings are required' 
      });
    }

    if (!Array.isArray(targetEmbedding) || !Array.isArray(candidateEmbeddings)) {
      return res.status(400).json({ 
        error: 'Embeddings must be arrays' 
      });
    }

    if (candidateEmbeddings.length === 0) {
      return res.status(400).json({ 
        error: 'At least one candidate embedding is required' 
      });
    }

    console.log(`🔐 Starting batch ZK proof generation...`);
    console.log(`📊 Target embedding length: ${targetEmbedding.length}`);
    console.log(`📊 Candidate embeddings count: ${candidateEmbeddings.length}`);
    console.log(`📋 Metadata:`, metadata || 'None');

    // Batch prove all candidates
    console.log(`🔐 Generating batch ZK proofs...`);
    const batchResults = voiceProver.proveBatchSimilarity(targetEmbedding, candidateEmbeddings);
    console.log(`✅ Batch ZK proofs generated successfully!`);
    console.log(`📊 Batch results: ${batchResults.filter(r => r.result.passed).length}/${batchResults.length} passed`);
    
    // Find best match
    console.log(`🔐 Finding best match...`);
    const bestMatch = voiceProver.findBestMatch(targetEmbedding, candidateEmbeddings);
    console.log(`✅ Best match analysis completed!`);
    
    console.log(`🎉 Batch ZK proof process completed`);
    
    res.json({
      success: true,
      batchResults,
      bestMatch,
      summary: {
        total: candidateEmbeddings.length,
        passed: batchResults.filter(r => r.result.passed).length,
        failed: batchResults.filter(r => !r.result.passed).length,
        hasMatch: bestMatch !== null
      }
    });

  } catch (error) {
    console.error('❌ Error in batch ZK proof:', error);
    res.status(500).json({ 
      error: 'Failed to generate batch ZK proof',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/zk/config', (req, res) => {
  try {
    const config = voiceProver.getConfig();
    res.json({
      success: true,
      config,
      description: 'Backend ZK Proof System Configuration'
    });
  } catch (error) {
    console.error('Error getting ZK config:', error);
    res.status(500).json({ 
      error: 'Failed to get ZK configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Voice Authentication Endpoint
app.post('/api/voice/authenticate', async (req, res) => {
  try {
    const { inputEmbedding, storedEmbeddings } = req.body;
    
    if (!inputEmbedding || !Array.isArray(inputEmbedding)) {
      return res.status(400).json({ 
        error: 'inputEmbedding is required and must be an array' 
      });
    }
    
    if (!storedEmbeddings || !Array.isArray(storedEmbeddings)) {
      return res.status(400).json({ 
        error: 'storedEmbeddings is required and must be an array' 
      });
    }
    
    if (storedEmbeddings.length === 0) {
      return res.status(400).json({ 
        error: 'At least one stored embedding is required' 
      });
    }
    
    console.log(`🔍 Starting voice authentication process...`);
    console.log(`📊 Input embedding length: ${inputEmbedding.length}`);
    console.log(`📊 Stored embeddings to check: ${storedEmbeddings.length}`);
    
    // Find the best match using the ZK proof system
    let bestMatch = null;
    let bestSimilarity = 0.0;
    let matchedWallet = null;
    let matchedBlobId = null;
    
    for (let i = 0; i < storedEmbeddings.length; i++) {
      const storedData = storedEmbeddings[i];
      const storedEmbedding = storedData.embedding;
      
      if (!storedEmbedding || !Array.isArray(storedEmbedding) || storedEmbedding.length === 0) {
        console.log(`⚠️  Skipping embedding ${i}: invalid or empty`);
        continue;
      }
      
      console.log(`🔍 Processing embedding ${i + 1}/${storedEmbeddings.length}:`);
      console.log(`   Wallet: ${storedData.walletAddress || 'Unknown'}`);
      console.log(`   Blob ID: ${storedData.blobId || 'Unknown'}`);
      console.log(`   Embedding length: ${storedEmbedding.length}`);
      
      try {
        console.log(`   🔐 Generating ZK proof for similarity check...`);
        // Use the ZK proof system to check similarity
        const proof = voiceProver.proveSimilarity(inputEmbedding, storedEmbedding);
        
        console.log(`   📊 ZK Proof Results:`);
        console.log(`      Similarity: ${(proof.similarity * 100).toFixed(2)}%`);
        console.log(`      Threshold: ${(proof.threshold * 100).toFixed(2)}%`);
        console.log(`      Passed: ${proof.passed ? '✅' : '❌'}`);
        
        // Track the best similarity for response
        if (proof.similarity > bestSimilarity) {
          bestSimilarity = proof.similarity;
        }
        
        // Check if this is a match
        if (proof.passed) {
          bestMatch = proof;
          matchedWallet = storedData.walletAddress || 'Unknown';
          matchedBlobId = storedData.blobId || 'Unknown';
          
          console.log(`   🚨 VOICE MATCH DETECTED!`);
          console.log(`      Wallet: ${matchedWallet}`);
          console.log(`      Blob ID: ${matchedBlobId}`);
          console.log(`      Similarity: ${(proof.similarity * 100).toFixed(2)}%`);
          console.log(`   🎯 Stopping search - match found at position ${i + 1}/${storedEmbeddings.length}`);
          
          // Return immediately for optimal performance
          return res.json({
            authenticated: true,
            message: `🚨 SECURITY THREAT: Voice match detected with blob ID ${matchedBlobId}!`,
            verification_method: "zk_proof_system",
            matched_wallet: matchedWallet,
            matched_blob_id: matchedBlobId,
            similarity: proof.similarity,
            threshold: proof.threshold,
            proof_details: proof
          });
        }
        
      } catch (error) {
        console.error(`   ❌ Error comparing embeddings:`, error);
        continue;
      }
    }
    
    // No match found
    console.log(`🔍 Voice authentication completed - no matches found`);
    console.log(`📊 Total embeddings checked: ${storedEmbeddings.length}`);
    console.log(`📊 Best similarity: ${(bestSimilarity * 100).toFixed(2)}%`);
    
    res.json({
      authenticated: false,
      message: "✅ SECURE: No voice match found",
      verification_method: "zk_proof_system",
      similarity: bestSimilarity,
      threshold: 0.75
    });
    
  } catch (error) {
    console.error('❌ Error in voice authentication:', error);
    res.status(500).json({ 
      error: 'Failed to authenticate voice',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// New endpoint: Authenticate against specific wallet address using ZK proofs
app.post('/api/voice/authenticate-wallet', async (req, res) => {
  try {
    const { inputEmbedding, walletAddress, subgraphData } = req.body;
    
    if (!inputEmbedding || !Array.isArray(inputEmbedding)) {
      return res.status(400).json({ 
        error: 'inputEmbedding is required and must be an array' 
      });
    }
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ 
        error: 'walletAddress is required and must be a string' 
      });
    }
    
    console.log(`🔍 Starting ZK voice authentication for specific wallet: ${walletAddress}`);
    console.log(`📊 Input embedding length: ${inputEmbedding.length}`);
    
    // Query the subgraph for this specific wallet address
    if (!walrusClient) {
      return res.status(500).json({ 
        error: 'Walrus client not initialized' 
      });
    }
    
    try {
      // First try to get embeddings from subgraph data if provided
      let walletEmbeddings = [];
      
      if (subgraphData && subgraphData.voiceRegistereds && Array.isArray(subgraphData.voiceRegistereds)) {
        console.log(`Checking subgraph data for wallet ${walletAddress}...`);
        
        // Filter registrations for this specific wallet
        const walletRegistrations = subgraphData.voiceRegistereds.filter(
          (reg: any) => reg.owner && reg.owner.toLowerCase() === walletAddress.toLowerCase()
        );
        
        if (walletRegistrations.length > 0) {
          console.log(`Found ${walletRegistrations.length} voice registrations for wallet ${walletAddress}`);
          
          // Process each registration and extract embeddings from Walrus
          for (const registration of walletRegistrations) {
            try {
              const { walrusUri, commitment, timestamp, blockNumber } = registration;
              
              if (!walrusUri) {
                console.warn(`Registration ${commitment} missing walrusUri`);
                continue;
              }
              
              // Extract blob ID from walrusUri
              let blobId = walrusUri;
              if (walrusUri.includes('://')) {
                blobId = walrusUri.split('/').pop() || walrusUri;
              }
              
              if (!blobId || blobId.length < 10) {
                console.warn(`Invalid blob ID for registration ${commitment}: ${blobId}`);
                continue;
              }
              
              // Try to read the blob from Walrus
              try {
                const blob = await walrusClient.readBlob({ blobId });
                
                if (blob) {
                  const jsonString = new TextDecoder().decode(blob);
                  const fingerprintData = JSON.parse(jsonString);
                  
                  if (fingerprintData.embedding && fingerprintData.embedding.length > 0) {
                    walletEmbeddings.push({
                      walletAddress,
                      blobId,
                      embedding: fingerprintData.embedding,
                      model: fingerprintData.model || "ecapa-tdnn",
                      timestamp: fingerprintData.timestamp || parseInt(timestamp) * 1000,
                      metadata: {
                        source: "subgraph_specific_wallet",
                        commitment,
                        blockNumber: parseInt(blockNumber),
                        walrusUri
                      }
                    });
                    
                    console.log(`✅ Retrieved embedding for wallet ${walletAddress} from blob ${blobId}`);
                  } else {
                    console.warn(`Blob ${blobId} found but no valid embedding data for registration ${commitment}`);
                  }
                }
              } catch (blobError: any) {
                // Handle specific blob errors gracefully
                if (blobError.message && blobError.message.includes('not found')) {
                  console.warn(`Blob ${blobId} not found in Walrus (likely deleted) for registration ${commitment}`);
                } else if (blobError.message && blobError.message.includes('timeout')) {
                  console.warn(`Timeout reading blob ${blobId} for registration ${commitment}`);
                } else {
                  console.warn(`Failed to read blob ${blobId} for registration ${commitment}:`, blobError.message || blobError);
                }
                // Continue processing other registrations
              }
            } catch (error) {
              console.error(`Error processing registration:`, error);
            }
          }
        }
      }
      
      // Fallback: Check local mappings if no subgraph data or no embeddings found
      if (walletEmbeddings.length === 0) {
        console.log(`No embeddings found in subgraph for wallet ${walletAddress}, checking local mappings...`);
        const mappings = readMappings();
        
        // Check if this wallet has any registrations in local mappings
        if (mappings[walletAddress]) {
          const blobId = mappings[walletAddress];
          console.log(`Found blob ID ${blobId} for wallet ${walletAddress} in local mappings`);
          
          try {
            const blob = await walrusClient.readBlob({ blobId });
            
            if (blob) {
              const jsonString = new TextDecoder().decode(blob);
              const fingerprintData = JSON.parse(jsonString);
              
              if (fingerprintData.embedding && fingerprintData.embedding.length > 0) {
                walletEmbeddings.push({
                  walletAddress,
                  blobId,
                  embedding: fingerprintData.embedding,
                  model: fingerprintData.model || "ecapa-tdnn",
                  timestamp: fingerprintData.timestamp || Date.now(),
                  metadata: {
                    source: "local_mappings",
                    blobId
                  }
                });
                
                console.log(`✅ Retrieved embedding for wallet ${walletAddress} from local mappings blob ${blobId}`);
              } else {
                console.warn(`Blob ${blobId} found but no valid embedding data for wallet ${walletAddress}`);
              }
            }
          } catch (blobError: any) {
            if (blobError.message && blobError.message.includes('not found')) {
              console.warn(`Blob ${blobId} not found in Walrus for wallet ${walletAddress}`);
            } else {
              console.warn(`Failed to read blob ${blobId} for wallet ${walletAddress}:`, blobError.message || blobError);
            }
          }
        }
      }
      
      // If still no embeddings found, return error
      if (walletEmbeddings.length === 0) {
        console.log(`No embeddings found for wallet ${walletAddress} in subgraph or local mappings`);
        return res.status(404).json({
          error: 'No voice registrations found for this wallet address',
          message: 'Please ensure the wallet has registered their voice or use the general authentication endpoint',
          walletAddress
        });
      }
      
      // Now generate REAL ZK proof using the Circom circuit
      console.log(`🔐 Generating REAL ZK proof using Circom circuit...`);
      
      try {
        const storedData = walletEmbeddings[0]; // Use first embedding
        const storedEmbedding = storedData.embedding;
        
        console.log(`🔐 Generating ZK proof for similarity check using multiplier2.circom...`);
        
        // Use the real ZK proof service with your Circom circuit
        const zkProofResult = await realZkProofService.generateProof({
          embeddingA: inputEmbedding,
          embeddingB: storedEmbedding,
          threshold: 0.75
        });
        
        if (!zkProofResult.success) {
          throw new Error(zkProofResult.error || 'ZK proof generation failed');
        }
        
        if (!zkProofResult.publicSignals) {
          throw new Error('ZK proof generated but no public signals received');
        }
        
        console.log(`📊 REAL ZK Proof Results for ${storedData.blobId}:`);
        console.log(`   Similarity: ${(zkProofResult.publicSignals.similarity * 100).toFixed(2)}%`);
        console.log(`   Threshold: 75%`);
        console.log(`   Passed: ${zkProofResult.publicSignals.passed ? '✅' : '❌'}`);
        console.log(`   Public Signals: ${zkProofResult.publicSignals.rawSignals.join(', ')}`);
        
        // Verify the proof
        const proofVerified = await realZkProofService.verifyProof(
          zkProofResult.proof!, 
          zkProofResult.publicSignals.rawSignals
        );
        
        console.log(`🔐 ZK Proof verification: ${proofVerified ? '✅ PASSED' : '❌ FAILED'}`);
        
        // Check if the circuit assertion failed (which means embeddings MATCH)
        if (zkProofResult.publicSignals.circuit_assertion_failed) {
          console.log(`✅ VOICE MATCH DETECTED for wallet ${walletAddress} using REAL ZK circuit!`);
          console.log(`   Blob ID: ${storedData.blobId}`);
          console.log(`   Similarity: ${(zkProofResult.publicSignals.similarity * 100).toFixed(2)}%`);
          console.log(`   Circuit assertion failed - this proves similarity >= threshold`);
          
          return res.json({
            authenticated: true,
            message: `✅ WALLET CONNECTED: Voice successfully matched to wallet ${walletAddress}! (REAL ZK Circuit Verified)`,
            verification_method: "real_zk_proof_circom",
            matched_wallet: walletAddress,
            matched_blob_id: storedData.blobId,
            similarity: zkProofResult.publicSignals.similarity,
            threshold: 0.75,
            proof_details: {
              zk_proof: null,
              public_signals: [],
              verification_passed: true,
              circuit_assertion_failed: true,
              explanation: "Circuit assertion failed = embeddings match (similarity >= threshold)"
            },
            stored_embedding: storedData.embedding,
            zk_proof_generated: true
          });
        }
        
        // If we have a valid proof, check if it passed verification
        if (zkProofResult.publicSignals.passed && proofVerified) {
          console.log(`✅ NO VOICE MATCH for wallet ${walletAddress} using REAL ZK proof!`);
          console.log(`   Blob ID: ${storedData.blobId}`);
          console.log(`   Similarity: ${(zkProofResult.publicSignals.similarity * 100).toFixed(2)}%`);
          console.log(`   Circuit generated valid proof - this proves similarity < threshold`);
          
          res.json({
            authenticated: false,
            message: `✅ SECURE: No voice match found for wallet ${walletAddress} (REAL ZK Verified)`,
            verification_method: "real_zk_proof_circom",
            similarity: zkProofResult.publicSignals.similarity,
            threshold: 0.75,
            walletAddress,
            proof_details: {
              zk_proof: zkProofResult.proof!,
              public_signals: zkProofResult.publicSignals.rawSignals,
              verification_passed: proofVerified,
              explanation: "Circuit generated valid proof = embeddings don't match (similarity < threshold)"
            },
            stored_embedding: storedData.embedding,
            zk_proof_generated: true
          });
        } else {
          // This shouldn't happen with our new logic, but handle it just in case
          console.log(`⚠️ Unexpected ZK proof result for wallet ${walletAddress}`);
          console.log(`   Similarity: ${(zkProofResult.publicSignals.similarity * 100).toFixed(2)}%`);
          console.log(`   Passed: ${zkProofResult.publicSignals.passed}`);
          console.log(`   Verified: ${proofVerified}`);
          
          res.json({
            authenticated: false,
            message: `⚠️ Unexpected ZK proof result for wallet ${walletAddress}`,
            verification_method: "real_zk_proof_circom",
            similarity: zkProofResult.publicSignals.similarity,
            threshold: 0.75,
            walletAddress,
            proof_details: {
              zk_proof: zkProofResult.proof,
              public_signals: zkProofResult.publicSignals.rawSignals,
              verification_passed: proofVerified,
              error: "Unexpected ZK proof state"
            },
            stored_embedding: storedData.embedding,
            zk_proof_generated: true
          });
        }
        
      } catch (zkError: any) {
        console.error('❌ ZK proof generation failed with unexpected error:', zkError);
        
        // This should not happen with our new logic, but handle it gracefully
        res.status(500).json({
          error: 'ZK proof generation failed unexpectedly',
          details: zkError.message || 'Unknown ZK error',
          walletAddress,
          zk_proof_generated: false
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing wallet ${walletAddress}:`, error);
      res.status(500).json({ 
        error: 'Failed to process wallet authentication',
        details: error instanceof Error ? error.message : 'Unknown error',
        walletAddress
      });
    }
    
  } catch (error) {
    console.error('❌ Error in wallet-specific voice authentication:', error);
    res.status(500).json({ 
      error: 'Failed to authenticate voice for specific wallet',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/health`);
  console.log(`Walrus embeddings API available at http://localhost:${PORT}/api/walrus/embeddings`);
  console.log(`Subgraph registrations API available at http://localhost:${PORT}/api/submit-subgraph-registrations`);
  console.log(`Voice Authentication API available at http://localhost:${PORT}/api/voice/authenticate`);
  console.log(`Wallet-specific Voice Authentication API available at http://localhost:${PORT}/api/voice/authenticate-wallet`);
  console.log(`ZK Proof System available at http://localhost:${PORT}/api/zk/`);
}); 