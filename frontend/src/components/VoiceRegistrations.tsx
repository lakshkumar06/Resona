import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_LATEST_VOICE_REGISTRATIONS } from '../lib/queries.ts';
import type { VoiceRegistration, VoiceRegistrationsData, VoiceRegistrationsVariables } from '../types/subgraph.ts';

const VoiceRegistrations: React.FC = () => {
  const { loading, error, data, refetch } = useQuery<VoiceRegistrationsData, VoiceRegistrationsVariables>(
    GET_LATEST_VOICE_REGISTRATIONS,
    {
      variables: { first: 10 },
      pollInterval: 10000, // Poll every 10 seconds for live updates
    }
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading voice registrations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md pt-40">
        <div className="flex">
          <div className="text-red-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading voice registrations
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.message}
            </div>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const voiceRegistrations = data?.voices || [];

  const formatTimestamp = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const truncateCommitment = (commitment: string) => {
    return `${commitment.slice(0, 10)}...${commitment.slice(-8)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Latest Voice Registrations</h2>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Refresh
        </button>
      </div>

      {voiceRegistrations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No voice registrations found.
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {voiceRegistrations.map((registration: VoiceRegistration) => (
              <li key={registration.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          Owner: {truncateAddress(registration.owner)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          Commitment: {truncateCommitment(registration.id)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          Walrus URI: {registration.walrusUri}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm text-gray-900">
                      {formatTimestamp(registration.timestamp)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Block #{registration.blockNumber}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default VoiceRegistrations;
