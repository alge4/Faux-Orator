import { AgentContext } from "../ai-agents/BaseAgent";
import { NPCAgentFactory } from "../ai-agents/NPCAgentFactory";
import { supabase } from "../services/supabase";
import elevenLabsService from "../services/elevenLabsService";
import { TextToSpeechOptions } from "../services/speechServices";

/**
 * Interface for voice-to-text conversion service
 */
interface SpeechToTextService {
  transcribe(audioData: ArrayBuffer): Promise<string>;
}

/**
 * Interface for text-to-speech conversion service
 */
interface TextToSpeechService {
  synthesize(text: string, options?: any): Promise<ArrayBuffer>;
  isElevenLabsAvailable(): boolean;
  getNPCVoice(npcId: string): string | undefined;
  setNPCVoice(npcId: string, voiceId: string): void;
  getAllAvailableVoices(): any[];
}

/**
 * Options for the NPCVoiceHandler
 */
export interface NPCVoiceHandlerOptions {
  speechToTextService?: SpeechToTextService;
  textToSpeechService?: TextToSpeechService;
  autoLoadVoiceProfiles?: boolean;
  defaultVoiceConfig?: any;
  preferElevenLabs?: boolean; // Whether to prefer ElevenLabs over browser speech
}

/**
 * Voice handler for NPC interactions
 * Processes voice input from players and generates voiced responses from NPCs
 * Integrates with ElevenLabs for high-quality voices when available
 */
export class NPCVoiceHandler {
  private npcAgentFactory: NPCAgentFactory;
  private speechToTextService: SpeechToTextService;
  private textToSpeechService: TextToSpeechService;
  private voiceProfiles: Map<string, any> = new Map();
  private defaultVoiceConfig: any;
  private preferElevenLabs: boolean;

  constructor(
    context: AgentContext,
    speechToTextService: SpeechToTextService,
    textToSpeechService: TextToSpeechService,
    options: NPCVoiceHandlerOptions = {}
  ) {
    this.npcAgentFactory = new NPCAgentFactory(context);
    this.speechToTextService = speechToTextService;
    this.textToSpeechService = textToSpeechService;
    this.preferElevenLabs = options.preferElevenLabs !== false;
    this.defaultVoiceConfig = options.defaultVoiceConfig || {
      voiceId: "default",
      speed: 1.0,
      pitch: 1.0,
      provider:
        this.preferElevenLabs &&
        this.textToSpeechService.isElevenLabsAvailable()
          ? "elevenlabs"
          : "browser",
    };

    // Load voice profiles if requested
    if (options.autoLoadVoiceProfiles) {
      this.loadVoiceProfiles();
    }
  }

  /**
   * Handle voice input from a player directed at a specific NPC
   * @param audioData The raw audio data from the player
   * @param targetNpcId The ID of the NPC being addressed
   * @param contextNote Optional context about the current situation
   * @returns Audio response from the NPC
   */
  async handleVoiceInput(
    audioData: ArrayBuffer,
    targetNpcId: string,
    contextNote?: string
  ): Promise<{
    audioResponse: ArrayBuffer;
    textResponse: string;
    npcInfo: any;
  }> {
    try {
      // Convert audio to text
      const transcribedText = await this.speechToTextService.transcribe(
        audioData
      );

      // Get or create NPC agent
      const npcAgent = await this.npcAgentFactory.createNPCAgent(targetNpcId);

      // Get NPC response
      const response = await npcAgent.respondToVoiceInput(
        transcribedText,
        contextNote
      );

      // Extract response content
      const responseText = response.data.content;

      // Get voice configuration for the NPC
      const npcData = npcAgent.getNPCData();

      // Determine voice settings
      const voiceSettings = await this.determineVoiceSettings(npcData);

      // Convert response to speech
      const audioResponse = await this.textToSpeechService.synthesize(
        responseText,
        voiceSettings
      );

      return {
        audioResponse,
        textResponse: responseText,
        npcInfo: npcData,
      };
    } catch (error) {
      console.error("Error handling voice input:", error);
      throw error;
    }
  }

  /**
   * Process text input without voice (useful for testing or text-only interfaces)
   * @param textInput The text input from the player
   * @param targetNpcId The ID of the NPC being addressed
   * @param contextNote Optional context about the current situation
   * @returns Text response from the NPC
   */
  async handleTextInput(
    textInput: string,
    targetNpcId: string,
    contextNote?: string
  ): Promise<{
    textResponse: string;
    npcInfo: any;
  }> {
    try {
      // Get or create NPC agent
      const npcAgent = await this.npcAgentFactory.createNPCAgent(targetNpcId);

      // Get NPC response
      const response = await npcAgent.respondToVoiceInput(
        textInput,
        contextNote
      );

      // Extract response content
      const responseText = response.data.content;

      return {
        textResponse: responseText,
        npcInfo: npcAgent.getNPCData(),
      };
    } catch (error) {
      console.error("Error handling text input:", error);
      throw error;
    }
  }

  /**
   * Get a list of all currently active NPC agents
   */
  getActiveNPCAgents() {
    return this.npcAgentFactory.getActiveNPCAgents();
  }

  /**
   * Determine the optimal voice settings for an NPC
   * Tries to find the best voice match based on NPC characteristics
   */
  private async determineVoiceSettings(
    npcData: any
  ): Promise<TextToSpeechOptions> {
    // Start with default settings
    const settings: TextToSpeechOptions = {
      ...this.defaultVoiceConfig,
      npcId: npcData.id,
    };

    // Check if we already have a voice mapping in the text-to-speech service
    const mappedVoice = this.textToSpeechService.getNPCVoice(npcData.id);
    if (mappedVoice) {
      settings.voiceId = mappedVoice;
      return settings;
    }

    // Check if NPC has a voice profile in our map
    if (this.voiceProfiles.has(npcData.id)) {
      const profile = this.voiceProfiles.get(npcData.id);
      settings.voiceId = profile.voice_id;
      settings.provider = profile.provider;

      // Apply custom settings if available
      if (profile.settings) {
        settings.speed = profile.settings.speed;
        settings.pitch = profile.settings.pitch;
        settings.style = profile.settings.style;
      }

      return settings;
    }

    // Try to find a matching voice from ElevenLabs
    if (
      this.preferElevenLabs &&
      this.textToSpeechService.isElevenLabsAvailable()
    ) {
      try {
        // Find a matching voice based on NPC characteristics
        const voiceId = await elevenLabsService.findMatchingVoice(npcData);
        if (voiceId) {
          settings.voiceId = voiceId;
          settings.provider = "elevenlabs";

          // Save this mapping for future use
          this.textToSpeechService.setNPCVoice(npcData.id, voiceId);

          return settings;
        }
      } catch (error) {
        console.error("Error finding matching ElevenLabs voice:", error);
      }
    }

    // Set appropriate gender based on NPC data
    if (
      npcData.gender === "female" ||
      (npcData.appearance &&
        (npcData.appearance.toLowerCase().includes("woman") ||
          npcData.appearance.toLowerCase().includes("female") ||
          npcData.appearance.toLowerCase().includes("girl")))
    ) {
      settings.gender = "female";
    } else if (
      npcData.gender === "male" ||
      (npcData.appearance &&
        (npcData.appearance.toLowerCase().includes("man") ||
          npcData.appearance.toLowerCase().includes("male") ||
          npcData.appearance.toLowerCase().includes("boy")))
    ) {
      settings.gender = "male";
    }

    // Adjust speed based on NPC personality
    if (npcData.personality) {
      const personality = npcData.personality.toLowerCase();

      if (
        personality.includes("fast") ||
        personality.includes("energetic") ||
        personality.includes("excited")
      ) {
        settings.speed = 1.3;
      } else if (
        personality.includes("slow") ||
        personality.includes("methodical") ||
        personality.includes("cautious")
      ) {
        settings.speed = 0.8;
      }

      // Adjust pitch based on personality and characteristics
      if (
        personality.includes("high") ||
        personality.includes("shrill") ||
        personality.includes("young")
      ) {
        settings.pitch = 1.2;
      } else if (
        personality.includes("deep") ||
        personality.includes("low") ||
        personality.includes("old") ||
        personality.includes("gruff")
      ) {
        settings.pitch = 0.8;
      }
    }

    return settings;
  }

  /**
   * Load voice profiles for all NPCs in the database
   */
  async loadVoiceProfiles(): Promise<void> {
    try {
      const { data, error } = await supabase.from("voice_profiles").select(`
          id,
          npc_id,
          provider,
          voice_id,
          settings
        `);

      if (error) {
        console.error(`Failed to load voice profiles: ${error.message}`);
        return;
      }

      if (data) {
        data.forEach((profile) => {
          this.voiceProfiles.set(profile.npc_id, profile);

          // Also register with the text-to-speech service
          this.textToSpeechService.setNPCVoice(
            profile.npc_id,
            profile.voice_id
          );
        });
        console.log(`Loaded ${data.length} voice profiles`);
      }
    } catch (error) {
      console.error("Error loading voice profiles:", error);
    }
  }

  /**
   * Save a voice profile for an NPC
   */
  async saveVoiceProfile(
    npcId: string,
    voiceId: string,
    provider: "elevenlabs" | "browser" = "elevenlabs",
    settings?: any
  ): Promise<boolean> {
    try {
      const profile = {
        npc_id: npcId,
        provider,
        voice_id: voiceId,
        settings: settings || null,
      };

      const { data, error } = await supabase
        .from("voice_profiles")
        .upsert(profile)
        .select();

      if (error) {
        console.error(`Failed to save voice profile: ${error.message}`);
        return false;
      }

      // Update local cache
      if (data && data.length > 0) {
        this.voiceProfiles.set(npcId, data[0]);
        // Also register with the text-to-speech service
        this.textToSpeechService.setNPCVoice(npcId, voiceId);
      }

      return true;
    } catch (error) {
      console.error("Error saving voice profile:", error);
      return false;
    }
  }

  /**
   * Release resources for a specific NPC agent
   */
  releaseNPCAgent(npcId: string): boolean {
    return this.npcAgentFactory.releaseAgent(npcId);
  }

  /**
   * Release all NPC agents
   */
  releaseAllNPCAgents(): void {
    this.npcAgentFactory.releaseAllAgents();
  }

  /**
   * Get voice profile for a specific NPC
   */
  getVoiceProfile(npcId: string): any {
    return this.voiceProfiles.get(npcId) || this.defaultVoiceConfig;
  }

  /**
   * Get all available voices from both browser and ElevenLabs
   */
  async getAllAvailableVoices(): Promise<any[]> {
    return this.textToSpeechService.getAllAvailableVoices();
  }
}
