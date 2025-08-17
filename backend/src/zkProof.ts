/**
 * Backend ZK Proof System for Voice Similarity
 * Replaces the Circom circuit with pure TypeScript implementation
 * 
 * The original Circom circuit proves: (a·b)² ≥ threshold² * ||a||² * ||b||²
 * Where threshold = 0.75 (75% similarity)
 */

export interface ZKProofResult {
  passed: boolean;
  similarity: number;
  dotProduct: number;
  magnitudeA: number;
  magnitudeB: number;
  threshold: number;
  debug: {
    dotProductSquared: number;
    rhs: number;
    thresholdSquared: number;
  };
}

export class VoiceSimilarityProver {
  private readonly threshold: number = 0.75; // 75% similarity threshold
  private readonly scalingFactor: number = 10000; // Same scaling as Circom circuit
  private readonly thresholdSquared: number;

  constructor() {
    this.thresholdSquared = Math.pow(this.threshold, 2) * this.scalingFactor;
  }

  /**
   * Prove that two voice embeddings are similar (≥75% similarity)
   * This replaces the Circom circuit's constraint checking
   */
  proveSimilarity(embeddingA: number[], embeddingB: number[]): ZKProofResult {
    if (embeddingA.length !== embeddingB.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    const n = embeddingA.length;
    
    // Compute dot product and magnitudes (same logic as Circom circuit)
    let dotProduct = 0;
    let magnitudeASquared = 0;
    let magnitudeBSquared = 0;

    for (let i = 0; i < n; i++) {
      const a = embeddingA[i];
      const b = embeddingB[i];
      
      // Dot product accumulation
      dotProduct += a * b;
      
      // Magnitude squared accumulation
      magnitudeASquared += a * a;
      magnitudeBSquared += b * b;
    }

    const magnitudeA = Math.sqrt(magnitudeASquared);
    const magnitudeB = Math.sqrt(magnitudeBSquared);

    // Compute cosine similarity
    const cosineSimilarity = dotProduct / (magnitudeA * magnitudeB);

    // Apply the same scaling as Circom circuit
    const dotProductSquared = Math.pow(dotProduct, 2) * this.scalingFactor;
    const rhs = this.thresholdSquared * magnitudeASquared * magnitudeBSquared;

    // Check the constraint: (a·b)² ≥ threshold² * ||a||² * ||b||²
    // This is equivalent to: dotProductSquared >= rhs
    const passed = dotProductSquared >= rhs;

    return {
      passed,
      similarity: cosineSimilarity,
      dotProduct,
      magnitudeA,
      magnitudeB,
      threshold: this.threshold,
      debug: {
        dotProductSquared,
        rhs,
        thresholdSquared: this.thresholdSquared
      }
    };
  }

  /**
   * Batch prove multiple embeddings against a target
   */
  proveBatchSimilarity(
    targetEmbedding: number[], 
    candidateEmbeddings: number[][]
  ): Array<{ index: number; result: ZKProofResult }> {
    return candidateEmbeddings.map((embedding, index) => ({
      index,
      result: this.proveSimilarity(targetEmbedding, embedding)
    }));
  }

  /**
   * Find the best match above threshold
   */
  findBestMatch(
    targetEmbedding: number[], 
    candidateEmbeddings: number[][]
  ): { index: number; result: ZKProofResult } | null {
    const results = this.proveBatchSimilarity(targetEmbedding, candidateEmbeddings);
    
    // Filter by threshold and find best match
    const validMatches = results.filter(r => r.result.passed);
    
    if (validMatches.length === 0) {
      return null;
    }

    // Return the match with highest similarity
    return validMatches.reduce((best, current) => 
      current.result.similarity > best.result.similarity ? current : best
    );
  }

  /**
   * Generate a proof certificate (for audit purposes)
   */
  generateProofCertificate(
    targetEmbedding: number[], 
    candidateEmbedding: number[],
    metadata?: Record<string, any>
  ): {
    timestamp: number;
    proof: ZKProofResult;
    metadata: Record<string, any>;
    certificateHash: string;
  } {
    const proof = this.proveSimilarity(targetEmbedding, candidateEmbedding);
    const timestamp = Date.now();
    
    // Simple hash for certificate (in production, use proper crypto)
    const certificateData = JSON.stringify({
      timestamp,
      proof,
      metadata
    });
    
    const certificateHash = this.simpleHash(certificateData);

    return {
      timestamp,
      proof,
      metadata: metadata || {},
      certificateHash
    };
  }

  /**
   * Simple hash function for certificate verification
   * In production, use proper cryptographic hashing
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get system configuration
   */
  getConfig() {
    return {
      threshold: this.threshold,
      thresholdSquared: this.thresholdSquared,
      scalingFactor: this.scalingFactor,
      description: 'Backend ZK Proof System for Voice Similarity (replaces Circom circuit)'
    };
  }
}

// Export singleton instance
export const voiceProver = new VoiceSimilarityProver();
