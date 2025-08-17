import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  VoiceRegistered,
  AuthenticationAttempt as AuthenticationAttemptEvent
} from "../generated/VoiceRegistryMirror/VoiceRegistryMirror"
import { Voice, AuthenticationAttempt, ThresholdAnalytics, SystemAnalytics } from "../generated/schema"

// Constants for calculations
const SCALE_FACTOR = BigInt.fromI32(10000); // For percentage calculations
const ZERO = BigInt.fromI32(0);
const ONE = BigInt.fromI32(1);

export function handleVoiceRegistered(event: VoiceRegistered): void {
  // Create Voice entity
  let voice = new Voice(event.params.commitment.toHexString())
  voice.owner = event.params.owner
  voice.walrusUri = event.params.walrusUri
  voice.timestamp = event.params.timestamp
  voice.blockNumber = event.block.number
  voice.transactionHash = event.transaction.hash
  voice.save()

  // Initialize ThresholdAnalytics for this voice
  let analytics = new ThresholdAnalytics(event.params.commitment.toHexString())
  analytics.voice = voice.id
  analytics.totalAttempts = ZERO
  analytics.successfulAttempts = ZERO
  analytics.failedAttempts = ZERO
  analytics.currentOptimalThreshold = BigInt.fromI32(7500) // Default 75%
  analytics.averageSuccessfulSimilarity = ZERO
  analytics.averageFailedSimilarity = ZERO
  analytics.securityScore = BigInt.fromI32(5000) // Default 50%
  analytics.lastCalculated = event.block.timestamp
  analytics.recommendedThreshold = BigInt.fromI32(7500)
  analytics.save()

  // Update system analytics
  updateSystemAnalytics(event.block.timestamp)
}

export function handleAuthenticationAttempt(event: AuthenticationAttemptEvent): void {
  // Create AuthenticationAttempt entity
  let authAttempt = new AuthenticationAttempt(event.params.attemptId.toString())
  authAttempt.attemptedBy = event.params.attemptedBy
  authAttempt.targetOwner = event.params.targetOwner
  authAttempt.targetVoice = event.params.targetCommitment.toHexString()
  authAttempt.targetCommitment = event.params.targetCommitment
  authAttempt.success = event.params.success
  authAttempt.similarity = event.params.similarity
  authAttempt.threshold = event.params.threshold
  authAttempt.timestamp = event.params.timestamp
  authAttempt.blockNumber = event.block.number
  authAttempt.transactionHash = event.transaction.hash
  authAttempt.metadata = event.params.metadata

  // Calculate analytics fields
  let analytics = ThresholdAnalytics.load(event.params.targetCommitment.toHexString())
  if (analytics != null) {
    // Determine if above optimal threshold
    authAttempt.isAboveOptimalThreshold = event.params.similarity >= analytics.currentOptimalThreshold
    
    // Calculate risk score based on similarity vs threshold patterns
    authAttempt.riskScore = calculateRiskScore(
      event.params.similarity,
      event.params.threshold,
      event.params.success,
      analytics.currentOptimalThreshold
    )
  } else {
    authAttempt.isAboveOptimalThreshold = event.params.similarity >= BigInt.fromI32(7500)
    authAttempt.riskScore = BigInt.fromI32(5000) // Default medium risk
  }

  authAttempt.save()

  // Update ThresholdAnalytics
  updateThresholdAnalytics(event.params.targetCommitment.toHexString(), event)

  // Update system analytics
  updateSystemAnalytics(event.block.timestamp)
}

function updateThresholdAnalytics(voiceId: string, event: AuthenticationAttemptEvent): void {
  let analytics = ThresholdAnalytics.load(voiceId)
  if (analytics == null) {
    // Create new analytics if doesn't exist
    analytics = new ThresholdAnalytics(voiceId)
    analytics.voice = voiceId
    analytics.totalAttempts = ZERO
    analytics.successfulAttempts = ZERO
    analytics.failedAttempts = ZERO
    analytics.averageSuccessfulSimilarity = ZERO
    analytics.averageFailedSimilarity = ZERO
    analytics.currentOptimalThreshold = BigInt.fromI32(7500)
    analytics.securityScore = BigInt.fromI32(5000)
    analytics.recommendedThreshold = BigInt.fromI32(7500)
  }

  // Update counters
  analytics.totalAttempts = analytics.totalAttempts.plus(ONE)
  
  if (event.params.success) {
    analytics.successfulAttempts = analytics.successfulAttempts.plus(ONE)
    
    // Update average successful similarity
    let newCount = analytics.successfulAttempts
    let oldAvg = analytics.averageSuccessfulSimilarity
    analytics.averageSuccessfulSimilarity = oldAvg
      .times(newCount.minus(ONE))
      .plus(event.params.similarity)
      .div(newCount)
  } else {
    analytics.failedAttempts = analytics.failedAttempts.plus(ONE)
    
    // Update average failed similarity
    let newCount = analytics.failedAttempts
    let oldAvg = analytics.averageFailedSimilarity
    analytics.averageFailedSimilarity = oldAvg
      .times(newCount.minus(ONE))
      .plus(event.params.similarity)
      .div(newCount)
  }

  // Recalculate optimal threshold
  analytics.currentOptimalThreshold = calculateOptimalThreshold(analytics)
  
  // Calculate security score
  analytics.securityScore = calculateSecurityScore(analytics)
  
  // Set recommended threshold (could be different from current optimal)
  analytics.recommendedThreshold = calculateRecommendedThreshold(analytics)
  
  analytics.lastCalculated = event.block.timestamp
  analytics.save()
}

function calculateOptimalThreshold(analytics: ThresholdAnalytics): BigInt {
  // If no failed attempts, use conservative approach
  if (analytics.failedAttempts.equals(ZERO)) {
    if (analytics.successfulAttempts.gt(ZERO)) {
      // Set threshold slightly below lowest successful similarity
      return analytics.averageSuccessfulSimilarity.minus(BigInt.fromI32(500)) // -5%
    }
    return BigInt.fromI32(7500) // Default 75%
  }

  // If no successful attempts, increase threshold
  if (analytics.successfulAttempts.equals(ZERO)) {
    return analytics.averageFailedSimilarity.plus(BigInt.fromI32(1000)) // +10%
  }

  // Find optimal point between successful and failed attempts
  let gap = analytics.averageSuccessfulSimilarity.minus(analytics.averageFailedSimilarity)
  
  if (gap.gt(BigInt.fromI32(1000))) { // If gap > 10%
    // Set threshold in the middle of the gap
    return analytics.averageFailedSimilarity.plus(gap.div(BigInt.fromI32(2)))
  } else {
    // Gap is small, be conservative and favor security
    return analytics.averageSuccessfulSimilarity.minus(BigInt.fromI32(200)) // -2%
  }
}

function calculateSecurityScore(analytics: ThresholdAnalytics): BigInt {
  if (analytics.totalAttempts.equals(ZERO)) {
    return BigInt.fromI32(5000) // Neutral score for no data
  }

  // Base score on success rate
  let successRate = analytics.successfulAttempts.times(SCALE_FACTOR).div(analytics.totalAttempts)
  
  // High success rate (>90%) might indicate threshold too low
  if (successRate.gt(BigInt.fromI32(9000))) {
    return BigInt.fromI32(3000) // Lower security score
  }
  
  // Low success rate (<50%) might indicate attacks or threshold too high
  if (successRate.lt(BigInt.fromI32(5000))) {
    return BigInt.fromI32(7000) // Higher security concern
  }
  
  // Moderate success rate (50-90%) is generally good
  return BigInt.fromI32(8000) // Good security score
}

function calculateRecommendedThreshold(analytics: ThresholdAnalytics): BigInt {
  let optimal = analytics.currentOptimalThreshold
  let security = analytics.securityScore
  
  // If security score is low, recommend higher threshold
  if (security.lt(BigInt.fromI32(4000))) {
    return optimal.plus(BigInt.fromI32(500)) // +5%
  }
  
  // If security score is high and we have enough data, use optimal
  if (security.gt(BigInt.fromI32(7000)) && analytics.totalAttempts.gt(BigInt.fromI32(10))) {
    return optimal
  }
  
  // Default: slightly higher than optimal for safety
  return optimal.plus(BigInt.fromI32(200)) // +2%
}

function calculateRiskScore(
  similarity: BigInt,
  threshold: BigInt,
  success: boolean,
  optimalThreshold: BigInt
): BigInt {
  // Start with baseline risk
  let risk = BigInt.fromI32(5000) // 50% baseline
  
  if (success) {
    // Successful attempts have lower base risk
    risk = BigInt.fromI32(2000) // 20%
    
    // But if similarity is very close to threshold, increase risk
    let margin = similarity.minus(threshold)
    if (margin.lt(BigInt.fromI32(500))) { // <5% margin
      risk = risk.plus(BigInt.fromI32(3000)) // +30%
    }
  } else {
    // Failed attempts - higher base risk
    risk = BigInt.fromI32(7000) // 70%
    
    // If similarity is close to threshold, even higher risk
    let margin = threshold.minus(similarity)
    if (margin.lt(BigInt.fromI32(1000))) { // <10% below threshold
      risk = risk.plus(BigInt.fromI32(2000)) // +20%
    }
  }
  
  // Cap at maximum
  if (risk.gt(SCALE_FACTOR)) {
    risk = SCALE_FACTOR
  }
  
  return risk
}

function updateSystemAnalytics(timestamp: BigInt): void {
  let system = SystemAnalytics.load("SYSTEM")
  if (system == null) {
    system = new SystemAnalytics("SYSTEM")
    system.totalVoices = ZERO
    system.totalAttempts = ZERO
    system.globalSuccessRate = ZERO
    system.systemOptimalThreshold = BigInt.fromI32(7500)
    system.systemSecurityScore = BigInt.fromI32(5000)
  }

  // Recalculate system-wide statistics
  // Note: In a real implementation, you'd iterate through all voices
  // For now, we'll update incrementally

  system.lastUpdated = timestamp
  system.save()
}