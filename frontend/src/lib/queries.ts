import { gql } from '@apollo/client';

export const GET_LATEST_VOICE_REGISTRATIONS = gql`
  query GetLatestVoiceRegistrations($first: Int!) {
    voices(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      owner
      walrusUri
      timestamp
      blockNumber
    }
  }
`;

export const GET_AUTHENTICATION_ATTEMPTS = gql`
  query GetAuthenticationAttempts($first: Int!) {
    authenticationAttempts(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      attemptedBy
      targetOwner
      targetVoice
      targetCommitment
      success
      similarity
      threshold
      timestamp
      blockNumber
      transactionHash
      metadata
      isAboveOptimalThreshold
      riskScore
    }
  }
`;

export const GET_VOICES_AND_ATTEMPTS = gql`
  query GetVoicesAndAttempts($first: Int!) {
    voices(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      owner
      walrusUri
      timestamp
      blockNumber
    }
    authenticationAttempts(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      attemptedBy
      targetOwner
      targetVoice
      targetCommitment
      success
      similarity
      threshold
      timestamp
      blockNumber
      transactionHash
      metadata
      isAboveOptimalThreshold
      riskScore
    }
  }
`;
