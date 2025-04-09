import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ILocalAudioTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

class VoiceChatService {
  private client: IAgoraRTCClient;
  private localAudioTrack: ILocalAudioTrack | null = null;
  private isInitialized = false;
  private channelName: string | null = null;

  constructor() {
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on(
      "user-published",
      async (user: IAgoraRTCRemoteUser, mediaType: "audio" | "video") => {
        if (mediaType === "audio") {
          await this.client.subscribe(user, mediaType);
          user.audioTrack?.play();
        }
      }
    );

    this.client.on("user-unpublished", (user: IAgoraRTCRemoteUser) => {
      console.log("User left:", user.uid);
    });
  }

  async initialize(channelName: string, uid: string): Promise<void> {
    if (!import.meta.env.VITE_AGORA_APP_ID) {
      throw new Error("Agora App ID not found");
    }

    try {
      await this.client.join(
        import.meta.env.VITE_AGORA_APP_ID,
        channelName,
        null,
        uid
      );

      this.channelName = channelName;
      this.isInitialized = true;
      console.log("Joined channel:", channelName);
    } catch (error) {
      console.error("Error joining channel:", error);
      throw error;
    }
  }

  async startVoiceChat(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Voice chat not initialized");
    }

    try {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await this.client.publish(this.localAudioTrack);
      console.log("Local audio track published");
    } catch (error) {
      console.error("Error starting voice chat:", error);
      throw error;
    }
  }

  async stopVoiceChat(): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }
    await this.client.leave();
    this.isInitialized = false;
    this.channelName = null;
    console.log("Left channel");
  }

  // Method to play AI-generated audio
  async playAIAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Voice chat not initialized");
    }

    try {
      const audioTrack = await AgoraRTC.createBufferSourceAudioTrack({
        source: audioBuffer,
      });
      await this.client.publish(audioTrack);

      // Clean up after playback
      audioTrack.on("ended", () => {
        audioTrack.stop();
        audioTrack.close();
      });

      await audioTrack.play();
    } catch (error) {
      console.error("Error playing AI audio:", error);
      throw error;
    }
  }

  // Utility method to check if voice chat is active
  isActive(): boolean {
    return this.isInitialized;
  }

  // Get current channel name
  getCurrentChannel(): string | null {
    return this.channelName;
  }
}

export const voiceChatService = new VoiceChatService();
