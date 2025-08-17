export interface VoiceRegistration {
  id: string;
  commitment: string;
  owner: string;
  walrusUri: string;
  timestamp: string;
  blockNumber: string;
}

export interface VoiceRegistrationsData {
  voiceRegistereds: VoiceRegistration[];
}

export interface VoiceRegistrationsVariables {
  first: number;
}
