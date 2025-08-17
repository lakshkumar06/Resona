import { realZkProofService } from './realZkProofService';

async function testRealZkProof() {
  console.log('🧪 Testing Real ZK Proof Service...');
  
  try {
    // Test 1: Random embeddings (should not match)
    console.log('\n🔍 Test 1: Random embeddings (should not match)');
    const embeddingA = new Array(192).fill(0).map((_, i) => Math.random() * 2 - 1);
    const embeddingB = new Array(192).fill(0).map((_, i) => Math.random() * 2 - 1);
    
    console.log('📊 Test embeddings created:');
    console.log(`   Embedding A: ${embeddingA.length} dimensions`);
    console.log(`   Embedding B: ${embeddingB.length} dimensions`);
    
    // Test ZK proof generation
    console.log('\n🔐 Testing ZK proof generation...');
    const result1 = await realZkProofService.generateProof({
      embeddingA,
      embeddingB,
      threshold: 0.75
    });
    
    if (result1.success) {
      console.log('✅ ZK proof generation result:');
      console.log(`   Similarity: ${(result1.publicSignals!.similarity * 100).toFixed(2)}%`);
      console.log(`   Passed: ${result1.publicSignals!.passed ? 'YES' : 'NO'}`);
      console.log(`   Circuit assertion failed: ${result1.publicSignals!.circuit_assertion_failed ? 'YES' : 'NO'}`);
      console.log(`   Public signals: ${result1.publicSignals!.rawSignals.length} signals`);
      
      if (result1.proof) {
        // Test proof verification
        console.log('\n🔐 Testing ZK proof verification...');
        const verificationResult = await realZkProofService.verifyProof(
          result1.proof,
          result1.publicSignals!.rawSignals
        );
        
        console.log(`✅ ZK proof verification: ${verificationResult ? 'PASSED' : 'FAILED'}`);
      }
    } else {
      console.error('❌ ZK proof generation failed:', result1.error);
    }
    
    // Test 2: Similar embeddings (should match, circuit should fail)
    console.log('\n\n🔍 Test 2: Similar embeddings (should match, circuit should fail)');
    const embeddingC = new Array(192).fill(0).map((_, i) => Math.random() * 2 - 1);
    const embeddingD = embeddingC.map(x => x + (Math.random() * 0.1 - 0.05)); // Small variation
    
    console.log('📊 Similar embeddings created:');
    console.log(`   Embedding C: ${embeddingC.length} dimensions`);
    console.log(`   Embedding D: ${embeddingD.length} dimensions (small variation)`);
    
    const result2 = await realZkProofService.generateProof({
      embeddingA: embeddingC,
      embeddingB: embeddingD,
      threshold: 0.75
    });
    
    if (result2.success) {
      console.log('✅ ZK proof generation result:');
      console.log(`   Similarity: ${(result2.publicSignals!.similarity * 100).toFixed(2)}%`);
      console.log(`   Passed: ${result2.publicSignals!.passed ? 'YES' : 'NO'}`);
      console.log(`   Circuit assertion failed: ${result2.publicSignals!.circuit_assertion_failed ? 'YES' : 'NO'}`);
      
      if (result2.publicSignals!.circuit_assertion_failed) {
        console.log('🎯 SUCCESS: Circuit assertion failed as expected (embeddings match!)');
      } else {
        console.log('⚠️  Unexpected: Circuit assertion did not fail (embeddings might not match)');
      }
    } else {
      console.error('❌ ZK proof generation failed:', result2.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRealZkProof().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});

