export interface VoiceRegistration {
  id: string;
  commitment: string;
  owner: string;
  walrusUri: string;
  timestamp: string;
  blockNumber: string;
}

export interface AuthenticationAttempt {
  id: string;
  attemptedBy: string;
  targetOwner: string;
  targetVoice: string;
  targetCommitment: string;
  success: boolean;
  similarity: string;
  threshold: string;
  timestamp: string;
  blockNumber: string;
  transactionHash: string;
  metadata: string;
  isAboveOptimalThreshold: boolean;
  riskScore: string;
}

export interface VoiceRegistrationsData {
  voices: VoiceRegistration[];
}

export interface AuthenticationAttemptsData {
  authenticationAttempts: AuthenticationAttempt[];
}

export interface VoicesAndAttemptsData {
  voices: VoiceRegistration[];
  authenticationAttempts: AuthenticationAttempt[];
}

export interface VoiceRegistrationsVariables {
  first: number;
}

export interface AuthenticationAttemptsVariables {
  first: number;
}

export interface VoicesAndAttemptsVariables {
  first: number;
}
