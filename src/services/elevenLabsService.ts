/**
 * ElevenLabs API service for high-quality text-to-speech
 * This service integrates with our NPC voice system
 */

import env from "../config/env";

export interface ElevenLabsVoiceSettings {
  stability: number; // 0-1, higher = more stable but less expressive
  similarity_boost: number; // 0-1, higher = more similar to original voice
  style: number; // 0-1, higher = more style applied
  use_speaker_boost: boolean; // Enhances speech clarity and target speaker similarity
}

export interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  samples?: {
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }[];
  category?: string;
  description?: string;
}

export interface ElevenLabsVoice extends ElevenLabsVoiceResponse {
  settings: ElevenLabsVoiceSettings;
}

export interface ElevenLabsSynthesisOptions {
  voiceId: string;
  model_id?: string;
  optimize_streaming_latency?: number;
  output_format?:
    | "mp3_44100"
    | "pcm_16000"
    | "pcm_22050"
    | "pcm_24000"
    | "pcm_44100";
  settings?: ElevenLabsVoiceSettings;
}

const API_BASE_URL = "https://api.elevenlabs.io/v1";

/**
 * ElevenLabs Service for text-to-speech integration
 */
class ElevenLabsService {
  private apiKey: string;
  private defaultSettings: ElevenLabsVoiceSettings;
  private defaultModel: string;
  private voicesCache: Map<string, ElevenLabsVoice> = new Map();
  private lastCacheUpdate: Date | null = null;
  private cacheTTL = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.apiKey = env.elevenlabs?.apiKey || "";
    this.defaultModel = env.elevenlabs?.defaultModel || "eleven_turbo_v2";
    this.defaultSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
    };
  }

  /**
   * Check if the API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Convert text to speech using ElevenLabs API
   * @param text The text to convert to speech
   * @param options Voice and other options
   * @returns ArrayBuffer of audio data
   */
  async textToSpeech(
    text: string,
    options?: Partial<ElevenLabsSynthesisOptions>
  ): Promise<ArrayBuffer> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    if (!text.trim()) {
      throw new Error("Text cannot be empty");
    }

    const voiceId = options?.voiceId || "premade/adam"; // Default voice
    const model = options?.model_id || this.defaultModel;
    const settings = options?.settings || this.defaultSettings;
    const outputFormat = options?.output_format || "mp3_44100";
    const optimizeLatency = options?.optimize_streaming_latency || 0;

    const url = `${API_BASE_URL}/text-to-speech/${voiceId}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
          Accept: "audio/*",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: settings,
          output_format: outputFormat,
          optimize_streaming_latency: optimizeLatency,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `ElevenLabs API error: ${response.status} ${errorText}`
        );
      }

      // Return the audio as ArrayBuffer
      return await response.arrayBuffer();
    } catch (error) {
      console.error("ElevenLabs text-to-speech error:", error);
      throw error;
    }
  }

  /**
   * Get all available voices from ElevenLabs
   */
  async getVoices(): Promise<ElevenLabsVoice[]> {
    // Check cache first
    if (
      this.lastCacheUpdate &&
      new Date().getTime() - this.lastCacheUpdate.getTime() < this.cacheTTL &&
      this.voicesCache.size > 0
    ) {
      return Array.from(this.voicesCache.values());
    }

    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/voices`, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();

      // Clear and update cache
      this.voicesCache.clear();
      data.voices.forEach((voice: ElevenLabsVoice) => {
        this.voicesCache.set(voice.voice_id, voice);
      });

      this.lastCacheUpdate = new Date();

      return data.voices;
    } catch (error) {
      console.error("Error fetching ElevenLabs voices:", error);
      throw error;
    }
  }

  /**
   * Get a specific voice by ID
   */
  async getVoice(voiceId: string): Promise<ElevenLabsVoice> {
    // Check cache first
    if (this.voicesCache.has(voiceId)) {
      return this.voicesCache.get(voiceId)!;
    }

    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/voices/${voiceId}`, {
        method: "GET",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const voice = await response.json();

      // Update cache
      this.voicesCache.set(voiceId, voice);

      return voice;
    } catch (error) {
      console.error(`Error fetching ElevenLabs voice ${voiceId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new voice clone (requires subscription)
   * @param name Name of the voice
   * @param description Description of the voice
   * @param files Audio files for voice cloning (should contain speech by the target speaker)
   */
  async createVoice(
    name: string,
    description: string,
    files: File[]
  ): Promise<ElevenLabsVoice> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_BASE_URL}/voices/add`, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const newVoice = await response.json();

      // Update cache
      this.voicesCache.set(newVoice.voice_id, newVoice);

      return newVoice;
    } catch (error) {
      console.error("Error creating ElevenLabs voice:", error);
      throw error;
    }
  }

  /**
   * Delete a voice (only user-created voices, not premade ones)
   */
  async deleteVoice(voiceId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const response = await fetch(`${API_BASE_URL}/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Remove from cache
      this.voicesCache.delete(voiceId);

      return true;
    } catch (error) {
      console.error(`Error deleting ElevenLabs voice ${voiceId}:`, error);
      throw error;
    }
  }

  /**
   * Find a voice that matches the NPC's characteristics
   * This is a helper function to find appropriate voices based on NPC data
   */
  async findMatchingVoice(npcData: any): Promise<string> {
    // Get all available voices
    const voices = await this.getVoices();

    // If NPC already has a specific voice_id assigned, use that
    if (npcData.voice_id) {
      return npcData.voice_id;
    }

    // Otherwise try to match based on characteristics
    let bestMatch = "premade/adam"; // Default male voice

    // Simple gender-based matching as fallback
    if (npcData.gender === "female") {
      bestMatch = "premade/rachel"; // Default female voice
    }

    // More sophisticated matching could be implemented here
    // based on NPC personality, age, etc.

    return bestMatch;
  }
}

// Create singleton instance
const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;
