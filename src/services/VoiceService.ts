import { createClient } from "@supabase/supabase-js";
import CryptoJS from "crypto-js";
import {
  DialogueChoice,
  NPCDialogueOptions,
  TTSProvider,
  TTSProviderInterface,
  TTSQueueItem,
  TTSRequest,
  TTSResponse,
  VoiceProfile,
} from "../types/voice";
import { supabase } from "../supabase/client";

class VoiceService {
  private ttsQueue: TTSQueueItem[] = [];
  private processing: boolean = false;
  private maxConcurrentRequests: number = 3;
  private activeRequests: number = 0;
  private defaultCacheDays: number = 30;
  private provider: TTSProviderInterface | null = null;

  constructor() {
    // Initialize the queue processor
    this.processQueue = this.processQueue.bind(this);
    this.setTTSProvider = this.setTTSProvider.bind(this);
  }

  public setTTSProvider(provider: TTSProviderInterface): void {
    this.provider = provider;
  }

  public setConcurrencyLimit(limit: number): void {
    this.maxConcurrentRequests = limit;
  }

  public setCacheDays(days: number): void {
    this.defaultCacheDays = days;
  }

  /**
   * Generate a speech audio for an NPC
   */
  public async generateSpeech(
    npcId: string,
    text: string,
    campaignId: string
  ): Promise<TTSResponse> {
    try {
      // Get NPC information
      const { data: npc, error: npcError } = await supabase
        .from("npcs")
        .select("voice_profile")
        .eq("id", npcId)
        .single();

      if (npcError || !npc) {
        throw new Error(
          `Error fetching NPC: ${npcError?.message || "NPC not found"}`
        );
      }

      // Get campaign settings
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .select("voice_concurrency_limit, voice_cache_days")
        .eq("id", campaignId)
        .single();

      if (campaignError) {
        console.warn(`Using default voice settings: ${campaignError.message}`);
      } else if (campaign) {
        if (campaign.voice_concurrency_limit) {
          this.maxConcurrentRequests = campaign.voice_concurrency_limit;
        }
        if (campaign.voice_cache_days) {
          this.defaultCacheDays = campaign.voice_cache_days;
        }
      }

      // Generate dialogue hash to check cache
      const dialogueHash = this.generateDialogueHash(npcId, text);

      // Check cache first
      const { data: cachedAudio, error: cacheError } = await supabase
        .from("voice_cache")
        .select("audio_url")
        .eq("npc_id", npcId)
        .eq("dialogue_hash", dialogueHash)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!cacheError && cachedAudio) {
        return {
          audio_url: cachedAudio.audio_url,
          cached: true,
          dialogue_hash: dialogueHash,
        };
      }

      // If not in cache, add to processing queue
      return new Promise((resolve, reject) => {
        this.ttsQueue.push({
          npc_id: npcId,
          campaign_id: campaignId,
          priority: 1, // Default priority
          text,
          voice_profile: npc.voice_profile as VoiceProfile,
          created_at: new Date(),
          callback: resolve,
          onError: reject,
        });

        // Start queue processing if not already running
        if (!this.processing) {
          this.processQueue();
        }
      });
    } catch (error) {
      console.error("Error in generateSpeech:", error);
      throw error;
    }
  }

  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (
      this.ttsQueue.length === 0 ||
      this.activeRequests >= this.maxConcurrentRequests
    ) {
      this.processing = false;
      return;
    }

    this.processing = true;

    // Sort queue by priority
    this.ttsQueue.sort((a, b) => b.priority - a.priority);

    // Process requests up to the concurrency limit
    while (
      this.ttsQueue.length > 0 &&
      this.activeRequests < this.maxConcurrentRequests
    ) {
      const request = this.ttsQueue.shift();
      if (!request) continue;

      this.activeRequests++;

      try {
        if (!this.provider) {
          throw new Error("TTS provider not set");
        }

        // Generate speech using the provider
        const result = await this.provider.generateSpeech({
          npc_id: request.npc_id,
          text: request.text,
          voice_profile: request.voice_profile,
        });

        // Save to cache
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + this.defaultCacheDays);

        await supabase.from("voice_cache").upsert({
          npc_id: request.npc_id,
          dialogue_hash: result.dialogue_hash,
          audio_url: result.audio_url,
          expires_at: expiresAt.toISOString(),
        });

        // Resolve the promise
        request.callback(result);
      } catch (error) {
        console.error("Error processing TTS request:", error);
        request.onError(error as Error);
      } finally {
        this.activeRequests--;
      }
    }

    // Continue processing if more items in queue
    if (this.ttsQueue.length > 0) {
      setTimeout(this.processQueue, 100);
    } else {
      this.processing = false;
    }
  }

  /**
   * Generate NPC dialogue choices
   */
  public async generateDialogueChoices(
    options: NPCDialogueOptions
  ): Promise<DialogueChoice[]> {
    // This would connect to an AI agent to generate appropriate dialogue options
    // For now, return mock data
    const mockChoices: DialogueChoice[] = [
      {
        id: "1",
        text: "This is a sample dialogue option 1.",
        summary: "Friendly greeting",
        tone: "friendly",
        estimated_duration: 3,
      },
      {
        id: "2",
        text: "This is a sample dialogue option 2.",
        summary: "Suspicious question",
        tone: "suspicious",
        estimated_duration: 4,
      },
      {
        id: "3",
        text: "This is a sample dialogue option 3.",
        summary: "Aggressive threat",
        tone: "aggressive",
        estimated_duration: 5,
      },
    ];

    return mockChoices.slice(0, options.max_choices || 3);
  }

  /**
   * Generate a hash for dialogue caching
   */
  private generateDialogueHash(npcId: string, text: string): string {
    return CryptoJS.SHA256(`${npcId}:${text}`).toString(CryptoJS.enc.Hex);
  }
}

export const voiceService = new VoiceService();
