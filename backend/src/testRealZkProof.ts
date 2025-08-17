/**
 * Test script for the Real ZK Proof System using compiled Circom circuit
 * Tests the actual ZK proof generation and verification
 */

import { realZkProofService } from './realZkProofService';
import * as fs from 'fs';
import * as path from 'path';

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

async function testRealZkProof() {
  console.log('🧪 Testing Real ZK Proof System with compiled Circom circuit...\n');

  try {
    // Test 1: Check if circuit files exist
    console.log('📁 Test 1: Checking circuit files...');
    const wasmPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_js/multiplier2.wasm');
    const zkeyPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_0001.zkey');
    const verificationKeyPath = path.join(__dirname, '../zkproofs/outputs/verification_key.json');
    const witnessCalculatorPath = path.join(__dirname, '../zkproofs/outputs/multiplier2_js/witness_calculator.js');

    console.log(`   WASM file: ${fs.existsSync(wasmPath) ? '✅' : '❌'} ${wasmPath}`);
    console.log(`   ZKey file: ${fs.existsSync(zkeyPath) ? '✅' : '❌'} ${zkeyPath}`);
    console.log(`   Verification key: ${fs.existsSync(verificationKeyPath) ? '✅' : '❌'} ${verificationKeyPath}`);
    console.log(`   Witness calculator: ${fs.existsSync(witnessCalculatorPath) ? '✅' : '❌'} ${witnessCalculatorPath}`);

    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath) || !fs.existsSync(verificationKeyPath) || !fs.existsSync(witnessCalculatorPath)) {
      console.log('❌ Some circuit files are missing. Please compile the circuit first.');
      return;
    }

    console.log('✅ All circuit files found!\n');

    // Test 2: Same embedding (should generate proof and pass)
    console.log('🧪 Test 2: Same embedding (should generate proof and pass)');
    const embedding1 = createTestEmbedding(0.5);
    const result1 = await realZkProofService.generateProof({
      embeddingA: embedding1,
      embeddingB: embedding1,
      threshold: 0.75
    });

    if (result1.success) {
      console.log(`   Result: ${result1.publicSignals?.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Similarity: ${(result1.publicSignals?.similarity || 0) * 100}%`);
      console.log(`   Circuit assertion failed: ${result1.publicSignals?.circuit_assertion_failed ? 'Yes' : 'No'}`);
      console.log(`   Proof generated: ${result1.proof ? 'Yes' : 'No'}`);
    } else {
      console.log(`   ❌ Failed: ${result1.error}`);
    }
    console.log('---');

    // Test 3: Very similar embeddings (should generate proof and pass)
    console.log('🧪 Test 3: Very similar embeddings (should generate proof and pass)');
    const embedding2 = createTestEmbedding(0.5, 0.05); // Low noise = high similarity
    const result2 = await realZkProofService.generateProof({
      embeddingA: embedding1,
      embeddingB: embedding2,
      threshold: 0.75
    });

    if (result2.success) {
      console.log(`   Result: ${result2.publicSignals?.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Similarity: ${(result2.publicSignals?.similarity || 0) * 100}%`);
      console.log(`   Circuit assertion failed: ${result2.publicSignals?.circuit_assertion_failed ? 'Yes' : 'No'}`);
      console.log(`   Proof generated: ${result2.proof ? 'Yes' : 'No'}`);
    } else {
      console.log(`   ❌ Failed: ${result2.error}`);
    }
    console.log('---');

    // Test 4: Different embeddings (should generate proof and fail)
    console.log('🧪 Test 4: Different embeddings (should generate proof and fail)');
    const embedding3 = createTestEmbedding(0.8, 0.3); // High noise = low similarity
    const result3 = await realZkProofService.generateProof({
      embeddingA: embedding1,
      embeddingB: embedding3,
      threshold: 0.75
    });

    if (result3.success) {
      console.log(`   Result: ${result3.publicSignals?.passed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`   Similarity: ${(result3.publicSignals?.similarity || 0) * 100}%`);
      console.log(`   Circuit assertion failed: ${result3.publicSignals?.circuit_assertion_failed ? 'Yes' : 'No'}`);
      console.log(`   Proof generated: ${result3.proof ? 'Yes' : 'No'}`);
    } else {
      console.log(`   ❌ Failed: ${result3.error}`);
    }
    console.log('---');

    // Test 5: Proof verification (if proof was generated)
    if (result3.proof && result3.publicSignals?.rawSignals) {
      console.log('🧪 Test 5: Proof verification');
      const verified = await realZkProofService.verifyProof(result3.proof, result3.publicSignals.rawSignals);
      console.log(`   Proof verification: ${verified ? '✅ PASSED' : '❌ FAILED'}`);
    }

    console.log('\n🎉 Real ZK Proof System testing complete!');
    console.log('The system is now integrated with your compiled multiplier2.circom circuit.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRealZkProof().catch(console.error);
