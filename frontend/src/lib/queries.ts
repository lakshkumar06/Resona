import { gql } from '@apollo/client';

export const GET_LATEST_VOICE_REGISTRATIONS = gql`
  query GetLatestVoiceRegistrations($first: Int!) {
    voiceRegistereds(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      commitment
      owner
      walrusUri
      timestamp
      blockNumber
    }
  }
`;
