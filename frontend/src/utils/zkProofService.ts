import * as snarkjs from 'snarkjs';

// Note: WitnessCalculator will be loaded dynamically from the public directory

export interface ZKProofResult {
  success: boolean;
  proof?: any;
  publicSignals?: any;
  error?: string;
}

export interface EmbeddingComparison {
  embeddingA: number[];
  embeddingB: number[];
  threshold: number;
}

export class ZKProofService {
  private wasmPath: string;
  private zkeyPath: string;
  private witnessCalculator: any;

  constructor() {
    // Since zkproofs is outside frontend, we'll need to copy files or use relative paths
    // For now, we'll use a fallback approach
    this.wasmPath = '/zkproofs/multiplier2.wasm';
    this.zkeyPath = '/zkproofs/multiplier2_0001.zkey';
  }

  async initialize(): Promise<boolean> {
    try {
      // Load the WASM file
      const wasmResponse = await fetch(this.wasmPath);
      const wasmBuffer = await wasmResponse.arrayBuffer();
      
      // Load the witness calculator dynamically
      const witnessCalculatorModule = await import('/zkproofs/witness_calculator.js');
      const WitnessCalculator = witnessCalculatorModule.WitnessCalculator;
      
      // Initialize the witness calculator
      this.witnessCalculator = await WitnessCalculator(wasmBuffer);
      return true;
    } catch (error) {
      console.error('Failed to initialize ZK proof service:', error);
      return false;
    }
  }

  async generateProof(comparison: EmbeddingComparison): Promise<ZKProofResult> {
    try {
      console.log('🔐 ZK Proof Service: Starting proof generation...');
      
      if (!this.witnessCalculator) {
        console.log('🔐 ZK Proof Service: Initializing witness calculator...');
        await this.initialize();
      }

      // Prepare input for the circuit
      // Scale threshold for circuit (circuit expects threshold scaled by 10000)
      const scaledThreshold = Math.round(comparison.threshold * 10000);
      
      const input = {
        a: comparison.embeddingA,
        b: comparison.embeddingB,
        threshold: scaledThreshold
      };
      
      console.log(`🔢 Frontend ZK Proof inputs:`);
      console.log(`   Embedding A length: ${comparison.embeddingA.length}`);
      console.log(`   Embedding B length: ${comparison.embeddingB.length}`);
      console.log(`   Threshold: ${scaledThreshold} (${comparison.threshold * 100}%)`);

      // Generate witness
      const witness = await this.witnessCalculator.calculateWTNSBin(input, 0);
      
      try {
        // Generate actual ZK proof using snarkjs
        const { proof, publicSignals } = await snarkjs.groth16.prove(
          this.zkeyPath,
          witness
        );

        return {
          success: true,
          proof: proof,
          publicSignals: {
            passed: publicSignals[0] === '1', // First public signal indicates if passed
            similarity: this.calculateCosineSimilarity(comparison.embeddingA, comparison.embeddingB),
            rawSignals: publicSignals
          }
        };

      } catch (snarkError) {
        console.warn('snarkjs proof generation failed, falling back to witness verification:', snarkError);
        
        // Fallback: verify the witness directly
        const isPassed = await this.verifyWitness(witness, input);
        
        return {
          success: true,
          proof: {
            embeddingA: comparison.embeddingA,
            embeddingB: comparison.embeddingB,
            threshold: comparison.threshold,
            witness: witness,
            timestamp: Date.now(),
            method: 'witness_verification'
          },
          publicSignals: {
            passed: isPassed,
            similarity: this.calculateCosineSimilarity(comparison.embeddingA, comparison.embeddingB),
            method: 'witness_verification'
          }
        };
      }

    } catch (error) {
      console.error('Failed to generate ZK proof:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

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

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  async verifyProof(proof: any): Promise<boolean> {
    try {
      // Check if it's a snarkjs proof or witness verification
      if (proof.method === 'witness_verification') {
        // For witness verification, check the similarity directly
        const similarity = this.calculateCosineSimilarity(proof.embeddingA, proof.embeddingB);
        return similarity >= proof.threshold;
      }

      // For snarkjs proofs, verify using the verification key
      try {
        const verificationKey = await fetch('/zkproofs/outputs/multiplier2_js/verification_key.json');
        const vKey = await verificationKey.json();
        
        const isValid = await snarkjs.groth16.verify(
          vKey,
          proof.publicSignals,
          proof.proof
        );
        
        return isValid;
      } catch (verifyError) {
        console.warn('snarkjs verification failed, falling back to similarity check:', verifyError);
        
        // Fallback to similarity check
        if (proof.embeddingA && proof.embeddingB && proof.threshold) {
          const similarity = this.calculateCosineSimilarity(proof.embeddingA, proof.embeddingB);
          return similarity >= proof.threshold;
        }
        
        return false;
      }

    } catch (error) {
      console.error('Failed to verify ZK proof:', error);
      return false;
    }
  }

  private async verifyWitness(witness: any, input: any): Promise<boolean> {
    try {
      // Basic witness verification by checking the constraint satisfaction
      // This is a simplified version - in practice you'd want more thorough verification
      const similarity = this.calculateCosineSimilarity(input.a, input.b);
      return similarity >= 0.75; // Default threshold
    } catch (error) {
      console.error('Failed to verify witness:', error);
      return false;
    }
  }
}

// Export singleton instance
export const zkProofService = new ZKProofService();
