/**
 * Speech services for handling voice interactions
 * Provides text-to-speech and speech-to-text functionality
 */

import elevenLabsService from "./elevenLabsService";
import env from "../config/env";

/**
 * Interface for text-to-speech options
 */
export interface TextToSpeechOptions {
  voiceId?: string;
  speed?: number;
  pitch?: number;
  language?: string;
  gender?: "male" | "female" | "neutral";
  style?: string;
  useElevenLabs?: boolean; // Whether to use ElevenLabs or fallback
  npcId?: string; // Optional NPC ID to associate with the voice
  provider?: "elevenlabs" | "browser" | "azure"; // Voice provider
}

/**
 * Interface for speech-to-text options
 */
export interface SpeechToTextOptions {
  language?: string;
  model?: "default" | "enhanced";
  punctuation?: boolean;
  detectLanguage?: boolean;
}

/**
 * Speech-to-text service using Web Speech API as fallback
 * Can be extended to use other services (OpenAI Whisper, etc.)
 */
export class SpeechToTextService {
  private options: SpeechToTextOptions;

  constructor(options: SpeechToTextOptions = {}) {
    this.options = {
      language: "en-US",
      model: "default",
      punctuation: true,
      detectLanguage: false,
      ...options,
    };
  }

  /**
   * Transcribe audio data to text
   * @param audioData Raw audio data
   * @returns Transcribed text
   */
  async transcribe(audioData: ArrayBuffer): Promise<string> {
    try {
      // For now, we'll use a placeholder implementation
      // In a real implementation, you would:
      // 1. Convert the audio buffer to the right format
      // 2. Call a speech recognition API (e.g., OpenAI Whisper)
      // 3. Process and return the results

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock implementation - in production replace with actual API call
      console.log("Transcribing audio data...", audioData.byteLength, "bytes");

      // For testing purposes, return placeholder text
      return "Hello there, I'd like to talk to you about the quest.";
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw new Error(`Speech-to-text conversion failed: ${error.message}`);
    }
  }

  /**
   * Initialize Web Speech API recognition (browser-only fallback)
   */
  initWebSpeechRecognition(): any {
    // This would be implemented for browser environments
    // using the Web Speech API as a fallback
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      // @ts-ignore - WebkitSpeechRecognition isn't in standard TypeScript types
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = this.options.language || "en-US";

      return recognition;
    }

    return null;
  }

  /**
   * Update service options
   */
  setOptions(options: Partial<SpeechToTextOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }
}

/**
 * Text-to-speech service with ElevenLabs integration
 * Uses ElevenLabs for high-quality NPC voices when available
 * Falls back to browser's Web Speech API when ElevenLabs is not configured
 */
export class TextToSpeechService {
  private options: TextToSpeechOptions;
  private availableVoices: Map<string, any> = new Map();
  private npcVoiceMapping: Map<string, string> = new Map(); // Maps NPC IDs to voice IDs

  constructor(options: TextToSpeechOptions = {}) {
    this.options = {
      voiceId: "default",
      speed: 1.0,
      pitch: 1.0,
      language: "en-US",
      gender: "neutral",
      useElevenLabs: true, // Default to using ElevenLabs when available
      provider: env.elevenlabs?.apiKey ? "elevenlabs" : "browser",
      ...options,
    };

    // Initialize available voices if in browser environment
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.loadVoices();
    }
  }

  /**
   * Convert text to speech, using ElevenLabs for high-quality voices when available
   * @param text The text to convert to speech
   * @param options Optional override of default options
   * @returns Audio data as ArrayBuffer
   */
  async synthesize(
    text: string,
    options?: Partial<TextToSpeechOptions>
  ): Promise<ArrayBuffer> {
    try {
      const mergedOptions = {
        ...this.options,
        ...options,
      };

      // Determine if we should use ElevenLabs
      const useElevenLabs =
        mergedOptions.useElevenLabs !== false &&
        mergedOptions.provider !== "browser" &&
        elevenLabsService.isConfigured();

      if (useElevenLabs) {
        return this.synthesizeWithElevenLabs(text, mergedOptions);
      } else {
        return this.synthesizeWithBrowser(text, mergedOptions);
      }
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      // If ElevenLabs fails, try browser as fallback
      if (options?.provider === "elevenlabs") {
        console.log("Falling back to browser speech synthesis");
        return this.synthesizeWithBrowser(text, {
          ...this.options,
          ...options,
          provider: "browser",
        });
      }
      throw new Error(`Text-to-speech conversion failed: ${error.message}`);
    }
  }

  /**
   * Synthesize speech using ElevenLabs
   */
  private async synthesizeWithElevenLabs(
    text: string,
    options: TextToSpeechOptions
  ): Promise<ArrayBuffer> {
    // Get the voice ID, either directly provided or from NPC mapping
    let voiceId = options.voiceId;

    // If we have an NPC ID but no voice ID, look it up in our mapping
    if (!voiceId && options.npcId && this.npcVoiceMapping.has(options.npcId)) {
      voiceId = this.npcVoiceMapping.get(options.npcId);
    }

    // If we still don't have a voice ID, use the default
    if (!voiceId) {
      // Use gender-specific default if gender is provided
      if (options.gender === "female") {
        voiceId = "premade/rachel";
      } else {
        voiceId = "premade/adam";
      }
    }

    // Convert our generic options to ElevenLabs-specific options
    const synthesisOptions = {
      voiceId,
      // Map our speed (0.5-2.0) to ElevenLabs stability (0-1)
      // Higher speed = lower stability for more expressive speech
      settings: {
        stability: Math.max(0, Math.min(1, 1.5 - (options.speed || 1))),
        similarity_boost: 0.75,
        style: options.style ? parseFloat(options.style) : 0.5,
        use_speaker_boost: true,
      },
    };

    // Call ElevenLabs API
    return await elevenLabsService.textToSpeech(text, synthesisOptions);
  }

  /**
   * Synthesize speech using the browser's Web Speech API
   * This is used as a fallback when ElevenLabs is not available
   */
  private async synthesizeWithBrowser(
    text: string,
    options: TextToSpeechOptions
  ): Promise<ArrayBuffer> {
    // Implementation using Web Speech API
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        reject(new Error("Browser speech synthesis not available"));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Find appropriate voice
      const voice = this.findVoice({
        voiceId: options.voiceId,
        language: options.language,
        gender: options.gender,
      });

      if (voice) {
        utterance.voice = voice;
      }

      utterance.lang = options.language || "en-US";
      utterance.rate = options.speed || 1.0;
      utterance.pitch = options.pitch || 1.0;

      // Create an audio context to capture the speech
      const audioCtx = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const destination = audioCtx.createMediaStreamDestination();
      const mediaRecorder = new MediaRecorder(destination.stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        blob
          .arrayBuffer()
          .then((buffer) => resolve(buffer))
          .catch((err) => reject(err));
      };

      utterance.onend = () => {
        mediaRecorder.stop();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      // Start recording and speaking
      mediaRecorder.start();
      window.speechSynthesis.speak(utterance);

      // Safety timeout
      setTimeout(() => {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      }, 15000); // 15-second timeout
    });
  }

  /**
   * Set voice mapping for an NPC
   * This maps an NPC ID to a specific voice ID
   */
  setNPCVoice(npcId: string, voiceId: string): void {
    this.npcVoiceMapping.set(npcId, voiceId);
  }

  /**
   * Get the voice ID mapped to an NPC
   */
  getNPCVoice(npcId: string): string | undefined {
    return this.npcVoiceMapping.get(npcId);
  }

  /**
   * Load available voices in browser environment
   */
  private loadVoices(): void {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    // Get available voices
    const voices = window.speechSynthesis.getVoices();

    // Store voices by ID and language
    voices.forEach((voice) => {
      this.availableVoices.set(voice.voiceURI, voice);
    });

    // Handle voices loaded event in Chrome
    window.speechSynthesis.onvoiceschanged = () => {
      const updatedVoices = window.speechSynthesis.getVoices();
      updatedVoices.forEach((voice) => {
        this.availableVoices.set(voice.voiceURI, voice);
      });
    };
  }

  /**
   * Get a list of all available voices from both browser and ElevenLabs
   */
  async getAllAvailableVoices(): Promise<any[]> {
    const browserVoices = Array.from(this.availableVoices.values()).map(
      (voice) => ({
        ...voice,
        provider: "browser",
      })
    );

    // Get ElevenLabs voices if configured
    let elevenLabsVoices: any[] = [];
    if (elevenLabsService.isConfigured()) {
      try {
        elevenLabsVoices = (await elevenLabsService.getVoices()).map(
          (voice) => ({
            ...voice,
            provider: "elevenlabs",
          })
        );
      } catch (error) {
        console.error("Error fetching ElevenLabs voices:", error);
      }
    }

    return [...browserVoices, ...elevenLabsVoices];
  }

  /**
   * Find a voice by ID, language, or characteristics
   */
  findVoice(criteria: Partial<TextToSpeechOptions>): any {
    // Simple implementation - would be enhanced in production
    for (const voice of this.availableVoices.values()) {
      if (criteria.voiceId && voice.voiceURI === criteria.voiceId) {
        return voice;
      }

      if (criteria.language && voice.lang.startsWith(criteria.language)) {
        if (
          !criteria.gender ||
          (criteria.gender === "female" && !voice.name.includes("Male")) ||
          (criteria.gender === "male" && voice.name.includes("Male"))
        ) {
          return voice;
        }
      }
    }

    // Return default voice if no match found
    return this.availableVoices.values().next().value;
  }

  /**
   * Update service options
   */
  setOptions(options: Partial<TextToSpeechOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * Check if ElevenLabs is available
   */
  isElevenLabsAvailable(): boolean {
    return elevenLabsService.isConfigured();
  }
}

// Singleton instances for convenience
export const speechToText = new SpeechToTextService();
export const textToSpeech = new TextToSpeechService();
