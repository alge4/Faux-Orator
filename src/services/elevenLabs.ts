import axios from "axios";
import { env } from "@/env.mjs";
import { logError } from "@/lib/utils";
import { z } from "zod";

// Define ElevenLabs voice interface
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
  gender?: "male" | "female" | "other";
  age?: string;
  accent?: string;
  labels?: Record<string, string>;
}

// Define text-to-speech options
export interface TextToSpeechOptions {
  voice_id: string;
  model_id?: string;
  voice_settings?: {
    stability?: number; // 0-1
    similarity_boost?: number; // 0-1
    style?: number; // 0-1, speaking style strength
    use_speaker_boost?: boolean; // Enhances voice clarity and target speaker similarity
  };
  output_format?: "mp3" | "wav" | "pcm" | "mulaw";
  optimize_streaming_latency?: number; // 0-4
}

// ElevenLabs API wrapper
class ElevenLabsService {
  private apiKey: string;
  private apiUrl: string = "https://api.elevenlabs.io/v1";
  private voices: ElevenLabsVoice[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.apiKey = env.ELEVENLABS_API_KEY || "";
    if (!this.apiKey) {
      console.warn(
        "ElevenLabs API key not found. Text-to-speech functionality will be limited."
      );
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized || !this.isAvailable) {
      return this.isInitialized;
    }

    try {
      await this.fetchVoices();
      this.isInitialized = true;
      return true;
    } catch (error) {
      logError("Failed to initialize ElevenLabs service", error);
      return false;
    }
  }

  async fetchVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isAvailable) {
      return [];
    }

    try {
      const response = await axios.get(`${this.apiUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
      });

      this.voices = response.data.voices || [];
      return this.voices;
    } catch (error) {
      logError("Failed to fetch ElevenLabs voices", error);
      return [];
    }
  }

  async getVoices(): Promise<ElevenLabsVoice[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.voices.length === 0) {
      await this.fetchVoices();
    }

    return this.voices;
  }

  async findVoiceByName(name: string): Promise<ElevenLabsVoice | undefined> {
    const voices = await this.getVoices();
    return voices.find(
      (voice) => voice.name.toLowerCase() === name.toLowerCase()
    );
  }

  async findVoiceById(id: string): Promise<ElevenLabsVoice | undefined> {
    const voices = await this.getVoices();
    return voices.find((voice) => voice.voice_id === id);
  }

  async getVoicesFilteredBy(filters: {
    gender?: "male" | "female" | "other";
    accent?: string;
    age?: string;
    category?: string;
  }): Promise<ElevenLabsVoice[]> {
    const voices = await this.getVoices();

    return voices.filter((voice) => {
      let match = true;

      if (filters.gender && voice.gender) {
        match = match && voice.gender === filters.gender;
      }

      if (filters.accent && voice.accent) {
        match =
          match &&
          voice.accent.toLowerCase().includes(filters.accent.toLowerCase());
      }

      if (filters.age && voice.age) {
        match =
          match && voice.age.toLowerCase().includes(filters.age.toLowerCase());
      }

      if (filters.category && voice.category) {
        match =
          match &&
          voice.category.toLowerCase().includes(filters.category.toLowerCase());
      }

      return match;
    });
  }

  async generateSpeech(
    text: string,
    options: TextToSpeechOptions
  ): Promise<ArrayBuffer | null> {
    if (!this.isAvailable) {
      throw new Error("ElevenLabs API key not configured");
    }

    if (!text || text.trim() === "") {
      throw new Error("Text cannot be empty");
    }

    try {
      const defaultOptions: Partial<TextToSpeechOptions> = {
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
        output_format: "mp3",
        optimize_streaming_latency: 1,
      };

      const mergedOptions = { ...defaultOptions, ...options };

      const response = await axios.post(
        `${this.apiUrl}/text-to-speech/${mergedOptions.voice_id}`,
        {
          text,
          model_id: mergedOptions.model_id,
          voice_settings: mergedOptions.voice_settings,
          output_format: mergedOptions.output_format,
          optimize_streaming_latency: mergedOptions.optimize_streaming_latency,
        },
        {
          headers: {
            "xi-api-key": this.apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          responseType: "arraybuffer",
        }
      );

      return response.data;
    } catch (error) {
      logError("Failed to generate speech with ElevenLabs", error);
      return null;
    }
  }

  async getFinalAudioUrl(audioData: ArrayBuffer): Promise<string> {
    // Convert ArrayBuffer to Blob
    const blob = new Blob([audioData], { type: "audio/mpeg" });

    // Create a URL for the blob
    return URL.createObjectURL(blob);
  }
}

// Export singleton instance
export const elevenLabsService = new ElevenLabsService();
