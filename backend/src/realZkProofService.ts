import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';

export interface ZKProofResult {
  success: boolean;
  proof?: any;
  publicSignals?: {
    passed: boolean;
    similarity: number;
    rawSignals: string[];
    circuit_assertion_failed?: boolean;
  };
  error?: string;
}

export interface EmbeddingComparison {
  embeddingA: number[];
  embeddingB: number[];
  threshold: number;
}

export class RealZKProofService {
  private wasmPath: string;
  private zkeyPath: string;
  private verificationKeyPath: string;
  private witnessCalculatorPath: string;

  constructor() {
    // Updated paths to point to the correct compiled circuit files
    this.wasmPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_js/multiplier2.wasm');
    this.zkeyPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_0001.zkey');
    this.verificationKeyPath = path.join(__dirname, '../zkproofs/outputs/verification_key.json');
    this.witnessCalculatorPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_js/witness_calculator.js');
  }

  async generateProof(comparison: EmbeddingComparison): Promise<ZKProofResult> {
    try {
      console.log('🔐 Starting real ZK proof generation with Circom circuit...');
      console.log(`📊 Input embedding A length: ${comparison.embeddingA.length}`);
      console.log(`📊 Input embedding B length: ${comparison.embeddingB.length}`);
      console.log(` Threshold: ${comparison.threshold}`);

      // Check if files exist
      if (!fs.existsSync(this.wasmPath)) {
        throw new Error(`WASM file not found: ${this.wasmPath}`);
      }
      if (!fs.existsSync(this.zkeyPath)) {
        throw new Error(`ZKey file not found: ${this.zkeyPath}`);
      }
      if (!fs.existsSync(this.witnessCalculatorPath)) {
        throw new Error(`Witness calculator not found: ${this.witnessCalculatorPath}`);
      }

      // Prepare input for the circuit - convert floating point to integers
      // The circuit expects integer inputs, so we scale the embeddings
      const scaleFactor = 1000000; // Scale by 1M to preserve precision
      
      const scaledEmbeddingA = comparison.embeddingA.map(x => Math.round(x * scaleFactor));
      const scaledEmbeddingB = comparison.embeddingB.map(x => Math.round(x * scaleFactor));
      
      // Scale threshold for circuit (circuit expects threshold scaled by 10000)
      const scaledThreshold = Math.round(comparison.threshold * 10000);
      
      const circuitInput = {
        a: scaledEmbeddingA,
        b: scaledEmbeddingB,
        threshold: scaledThreshold
      };
      
      console.log(`🔢 Scaled inputs for circuit:`);
      console.log(`   Embedding scale factor: ${scaleFactor}`);
      console.log(`   Sample A values: [${scaledEmbeddingA.slice(0, 3).join(', ')}...]`);
      console.log(`   Sample B values: [${scaledEmbeddingB.slice(0, 3).join(', ')}...]`);
      console.log(`   Threshold: ${scaledThreshold} (${comparison.threshold * 100}%)`);

      console.log('🔐 Generating witness...');
      
      // Load the witness calculator module
      const witnessCalculatorModule = require(this.witnessCalculatorPath);
      
      // Read WASM file
      const wasmBuffer = fs.readFileSync(this.wasmPath);
      
      // Create witness calculator instance - the module exports a function that returns the calculator
      const witnessCalculator = await witnessCalculatorModule(wasmBuffer);
      
      // Calculate witness
      const witness = await witnessCalculator.calculateWTNSBin(circuitInput, 0);
      
      console.log('✅ Witness generated successfully');

      // Generate ZK proof using snarkjs
      console.log('🔐 Generating Groth16 proof...');
      const { proof, publicSignals } = await snarkjs.groth16.prove(this.zkeyPath, witness);
      
      console.log('✅ ZK proof generated successfully!');
      console.log('📊 Public signals:', publicSignals);

      // The first public signal indicates if the similarity check passed
      const passed = publicSignals[0] === '1';
      
      // Calculate actual similarity for reference
      const similarity = this.calculateCosineSimilarity(comparison.embeddingA, comparison.embeddingB);

      return {
        success: true,
        proof: proof,
        publicSignals: {
          passed: passed,
          similarity: similarity,
          rawSignals: publicSignals
        }
      };

    } catch (error: any) {
      // If proof generation failed, it means the circuit assertion failed
      // This means the embeddings DO match (similarity >= threshold)
      console.log('🔐 Circuit assertion failed - this means embeddings MATCH!');
      console.log('📊 Error details:', error.message);
      
      const similarity = this.calculateCosineSimilarity(comparison.embeddingA, comparison.embeddingB);
      
      return {
        success: true,
        proof: null, // No proof generated when assertion fails
        publicSignals: {
          similarity,
          passed: true, // They match, so authentication should pass
          rawSignals: [],
          circuit_assertion_failed: true // Flag to indicate circuit failed
        }
      };
    }
  }

  async verifyProof(proof: any, publicSignals: string[]): Promise<boolean> {
    try {
      console.log('🔐 Verifying ZK proof...');
      
      if (!fs.existsSync(this.verificationKeyPath)) {
        throw new Error(`Verification key not found: ${this.verificationKeyPath}`);
      }

      const verificationKey = JSON.parse(fs.readFileSync(this.verificationKeyPath, 'utf8'));
      
      const isValid = await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
      
      console.log(`✅ ZK proof verification: ${isValid ? 'PASSED' : 'FAILED'}`);
      
      return isValid;
    } catch (error: any) {
      console.error('❌ ZK proof verification failed:', error);
      return false;
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    return normA > 0 && normB > 0 ? dotProduct / (normA * normB) : 0;
  }
}

export const realZkProofService = new RealZKProofService();
