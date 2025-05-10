import { Database } from "./database.types";

export type VoiceProfile = {
  voice_id: string | null;
  pitch: number;
  speed: number;
  tone: string;
};

export type VoiceCache = Database["public"]["Tables"]["voice_cache"]["Row"];

export interface TTSRequest {
  npc_id: string;
  text: string;
  voice_profile: VoiceProfile;
}

export interface TTSResponse {
  audio_url: string;
  cached: boolean;
  dialogue_hash: string;
}

export type TTSProvider = "openai" | "elevenlabs";

export interface TTSSettings {
  provider: TTSProvider;
  apiKey?: string;
  voice_concurrency_limit?: number;
  voice_cache_days?: number;
}

export interface DialogueChoice {
  id: string;
  text: string;
  summary: string;
  tone: string;
  estimated_duration: number;
}

export interface NPCDialogueOptions {
  npc_id: string;
  context: string;
  player_prompt?: string;
  max_choices?: number;
  max_length?: number;
}

// Resource queue for limiting concurrent TTS requests
export interface TTSQueueItem {
  npc_id: string;
  campaign_id: string;
  priority: number;
  text: string;
  voice_profile: VoiceProfile;
  created_at: Date;
  callback: (response: TTSResponse) => void;
  onError: (error: Error) => void;
}

// Wrapper interface for TTS providers
export interface TTSProviderInterface {
  generateSpeech(request: TTSRequest): Promise<TTSResponse>;
  getVoices(): Promise<string[]>;
  getDefaultVoice(): string;
}
