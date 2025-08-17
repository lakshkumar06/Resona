import { apolloClient } from '../lib/apollo-client';
import { GET_LATEST_VOICE_REGISTRATIONS } from '../lib/queries';

export interface SubgraphTestResult {
  success: boolean;
  message: string;
  registrationCount: number;
  registrations: any[];
  error?: string;
}

export interface BlobHealthCheck {
  totalRegistrations: number;
  availableBlobs: number;
  deletedBlobs: number;
  invalidBlobs: number;
  details: {
    available: any[];
    deleted: any[];
    invalid: any[];
  };
}

export async function testSubgraphConnection(): Promise<SubgraphTestResult> {
  try {
    console.log('Testing subgraph connection...');
    
    const result = await apolloClient.query({
      query: GET_LATEST_VOICE_REGISTRATIONS,
      variables: { first: 100 },
      fetchPolicy: 'no-cache', // Don't use cache for testing
    });
    
    if (result.error) {
      return {
        success: false,
        message: 'Subgraph query failed',
        registrationCount: 0,
        registrations: [],
        error: result.error.message
      };
    }
    
    const registrations = result.data?.voices || [];
    
    if (registrations.length === 0) {
      return {
        success: true,
        message: 'Subgraph connected but no voice registrations found',
        registrationCount: 0,
        registrations: []
      };
    }
    
    return {
      success: true,
      message: `Successfully connected to subgraph. Found ${registrations.length} voice registrations.`,
      registrationCount: registrations.length,
      registrations: registrations
    };
    
  } catch (error: any) {
    console.error('Subgraph test failed:', error);
    return {
      success: false,
      message: 'Failed to connect to subgraph',
      registrationCount: 0,
      registrations: [],
      error: error.message || 'Unknown error'
    };
  }
}

export async function checkBlobHealth(registrations: any[]): Promise<BlobHealthCheck> {
  const { readFingerprintByBlobId } = await import('./walrus');
  
  const available: any[] = [];
  const deleted: any[] = [];
  const invalid: any[] = [];
  
  for (const registration of registrations) {
    try {
      const walrusUri = registration.walrusUri;
      let blobId = walrusUri;
      
      // Handle different URI formats
      if (walrusUri.includes('://')) {
        blobId = walrusUri.split('/').pop() || walrusUri;
      }
      
      // Check if blob ID is valid
      if (!blobId || blobId.length < 10) {
        invalid.push({
          registration: registration.id,
          blobId,
          reason: 'Invalid format',
          owner: registration.owner
        });
        continue;
      }
      
      try {
        const fingerprint = await readFingerprintByBlobId(blobId);
        if (fingerprint && fingerprint.embedding && fingerprint.embedding.length > 0) {
          available.push({
            registration: registration.id,
            blobId,
            owner: registration.owner,
            embeddingDimensions: fingerprint.embedding.length
          });
        } else {
          deleted.push({
            registration: registration.id,
            blobId,
            reason: 'No embedding data',
            owner: registration.owner
          });
        }
      } catch (blobError: any) {
        if (blobError.message && blobError.message.includes('not found')) {
          deleted.push({
            registration: registration.id,
            blobId,
            reason: 'Blob not found in Walrus',
            owner: registration.owner
          });
        } else {
          deleted.push({
            registration: registration.id,
            blobId,
            reason: `Error: ${blobError.message || 'Unknown error'}`,
            owner: registration.owner
          });
        }
      }
    } catch (error: any) {
      invalid.push({
        registration: registration.id,
        blobId: 'unknown',
        reason: `Processing error: ${error.message}`,
        owner: registration.owner
      });
    }
  }
  
  return {
    totalRegistrations: registrations.length,
    availableBlobs: available.length,
    deletedBlobs: deleted.length,
    invalidBlobs: invalid.length,
    details: {
      available,
      deleted,
      invalid
    }
  };
}

export async function getSubgraphRegistrations(first: number = 100): Promise<any[]> {
  try {
    const result = await apolloClient.query({
      query: GET_LATEST_VOICE_REGISTRATIONS,
      variables: { first },
      fetchPolicy: 'cache-and-network',
    });
    
    return result.data?.voices || [];
  } catch (error) {
    console.error('Failed to get subgraph registrations:', error);
    return [];
  }
}
