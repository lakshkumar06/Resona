/**
 * Test script for the Backend ZK Proof System
 * Verifies that the backend implementation matches the Circom circuit logic
 */

import { voiceProver } from './zkProof';

// Test data: 192-dimensional embeddings (same as Circom circuit)
const createTestEmbedding = (baseValue: number, noise: number = 0.1): number[] => {
  const embedding: number[] = [];
  for (let i = 0; i < 192; i++) {
    // Add some variation to make it realistic
    const value = baseValue + (Math.random() - 0.5) * noise;
    embedding.push(value);
  }
  return embedding;
};

// Test 1: Same embedding should have 100% similarity
console.log('🧪 Test 1: Same embedding (should pass)');
const embedding1 = createTestEmbedding(0.5);
const result1 = voiceProver.proveSimilarity(embedding1, embedding1);
console.log(`Result: ${result1.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Similarity: ${(result1.similarity * 100).toFixed(2)}%`);
console.log(`Threshold: ${(result1.threshold * 100).toFixed(2)}%`);
console.log('---');

// Test 2: Very similar embeddings (should pass)
console.log('🧪 Test 2: Very similar embeddings (should pass)');
const embedding2 = createTestEmbedding(0.5, 0.05); // Low noise = high similarity
const result2 = voiceProver.proveSimilarity(embedding1, embedding2);
console.log(`Result: ${result2.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Similarity: ${(result2.similarity * 100).toFixed(2)}%`);
console.log(`Threshold: ${(result2.threshold * 100).toFixed(2)}%`);
console.log('---');

// Test 3: Different embeddings (should fail)
console.log('🧪 Test 3: Different embeddings (should fail)');
const embedding3 = createTestEmbedding(0.8, 0.3); // High noise = low similarity
const result3 = voiceProver.proveSimilarity(embedding1, embedding3);
console.log(`Result: ${result3.passed ? '✅ PASSED' : '❌ FAILED'}`);
console.log(`Similarity: ${(result3.similarity * 100).toFixed(2)}%`);
console.log(`Threshold: ${(result3.threshold * 100).toFixed(2)}%`);
console.log('---');

// Test 4: Batch processing
console.log('🧪 Test 4: Batch processing');
const candidates = [
  embedding1, // Same (100%)
  embedding2, // Similar (high %)
  embedding3, // Different (low %)
  createTestEmbedding(0.6, 0.1), // Medium similarity
  createTestEmbedding(0.4, 0.2)  // Medium-low similarity
];

const batchResults = voiceProver.proveBatchSimilarity(embedding1, candidates);
console.log('Batch Results:');
batchResults.forEach((result, index) => {
  console.log(`  ${index}: ${result.result.passed ? '✅' : '❌'} ${(result.result.similarity * 100).toFixed(2)}%`);
});

// Test 5: Best match finding
console.log('\n🧪 Test 5: Best match finding');
const bestMatch = voiceProver.findBestMatch(embedding1, candidates);
if (bestMatch) {
  console.log(`Best match found at index ${bestMatch.index}`);
  console.log(`Similarity: ${(bestMatch.result.similarity * 100).toFixed(2)}%`);
} else {
  console.log('No matches found above threshold');
}

// Test 6: Certificate generation
console.log('\n🧪 Test 6: Certificate generation');
const certificate = voiceProver.generateProofCertificate(embedding1, embedding2, {
  test: true,
  timestamp: Date.now()
});
console.log('Certificate generated:');
console.log(`  Hash: ${certificate.certificateHash}`);
console.log(`  Timestamp: ${new Date(certificate.timestamp).toISOString()}`);

// Test 7: System configuration
console.log('\n🧪 Test 7: System configuration');
const config = voiceProver.getConfig();
console.log('System Config:');
console.log(`  Threshold: ${config.threshold}`);
console.log(`  Threshold²: ${config.thresholdSquared}`);
console.log(`  Scaling Factor: ${config.scalingFactor}`);
console.log(`  Description: ${config.description}`);

// Test 8: Verify the math matches Circom circuit
console.log('\n🧪 Test 8: Math verification (Circom circuit compatibility)');
const testA = [1, 2, 3, 4, 5];
const testB = [1, 2, 3, 4, 5];

const result = voiceProver.proveSimilarity(testA, testB);
console.log('Debug values (should match Circom circuit):');
console.log(`  Dot Product: ${result.dotProduct}`);
console.log(`  Magnitude A: ${result.magnitudeA.toFixed(4)}`);
console.log(`  Magnitude B: ${result.magnitudeB.toFixed(4)}`);
console.log(`  Dot Product² (scaled): ${result.debug.dotProductSquared}`);
console.log(`  RHS (threshold² * ||a||² * ||b||²): ${result.debug.rhs}`);
console.log(`  Threshold²: ${result.debug.thresholdSquared}`);

console.log('\n🎉 ZK Proof System testing complete!');
console.log('The backend implementation should now match the Circom circuit logic.');
