import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

// Agora client options
const options = {
  appId: import.meta.env.VITE_AGORA_APP_ID,
  channel: import.meta.env.VITE_AGORA_CHANNEL_NAME || "Main",
  token: import.meta.env.VITE_AGORA_TEMP_TOKEN || null,
};

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private isAudioEnabled = true;
  private isVideoEnabled = false;

  // Event handlers
  private onUserJoinedCallback: ((user: IAgoraRTCRemoteUser) => void) | null =
    null;
  private onUserLeftCallback: ((user: IAgoraRTCRemoteUser) => void) | null =
    null;
  private onConnectionStateChangeCallback:
    | ((curState: string, prevState: string) => void)
    | null = null;

  constructor() {
    this.client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.client) return;

    this.client.on("user-joined", (user) => {
      console.log("User joined:", user.uid);
      if (this.onUserJoinedCallback) this.onUserJoinedCallback(user);
    });

    this.client.on("user-left", (user) => {
      console.log("User left:", user.uid);
      if (this.onUserLeftCallback) this.onUserLeftCallback(user);
    });

    this.client.on("user-published", async (user, mediaType) => {
      await this.client?.subscribe(user, mediaType);
      console.log("User published:", user.uid, mediaType);

      if (mediaType === "audio") {
        user.audioTrack?.play();
      }
    });

    this.client.on("connection-state-change", (curState, prevState) => {
      console.log("Connection state changed:", prevState, "->", curState);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(curState, prevState);
      }
    });
  }

  // Set event handlers
  public onUserJoined(callback: (user: IAgoraRTCRemoteUser) => void) {
    this.onUserJoinedCallback = callback;
  }

  public onUserLeft(callback: (user: IAgoraRTCRemoteUser) => void) {
    this.onUserLeftCallback = callback;
  }

  public onConnectionStateChange(
    callback: (curState: string, prevState: string) => void
  ) {
    this.onConnectionStateChangeCallback = callback;
  }

  // Join the channel and create local tracks
  public async join(userId?: string): Promise<void> {
    if (!this.client) return;

    try {
      // Generate a random uid if not provided
      const uid = userId || Math.floor(Math.random() * 1000000);

      // Join the channel
      await this.client.join(
        options.appId,
        options.channel,
        options.token,
        uid
      );
      console.log("Joined channel successfully:", options.channel);

      // Create and publish the audio track
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      await this.client.publish([this.localAudioTrack]);

      // Only create video track if video is enabled
      if (this.isVideoEnabled) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        await this.client.publish([this.localVideoTrack]);
      }

      console.log("Published local tracks successfully");
    } catch (error) {
      console.error("Error joining channel:", error);
      throw error;
    }
  }

  // Leave the channel and release resources
  public async leave(): Promise<void> {
    if (this.localAudioTrack) {
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }

    if (this.localVideoTrack) {
      this.localVideoTrack.close();
      this.localVideoTrack = null;
    }

    await this.client?.leave();
    console.log("Left channel successfully");
  }

  // Toggle microphone
  public async toggleMic(): Promise<boolean> {
    if (!this.localAudioTrack) return false;

    if (this.isAudioEnabled) {
      await this.localAudioTrack.setEnabled(false);
    } else {
      await this.localAudioTrack.setEnabled(true);
    }

    this.isAudioEnabled = !this.isAudioEnabled;
    return this.isAudioEnabled;
  }

  // Toggle camera
  public async toggleCamera(): Promise<boolean> {
    if (this.isVideoEnabled && this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(false);
      this.isVideoEnabled = false;
    } else {
      if (!this.localVideoTrack) {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack();
        await this.client?.publish([this.localVideoTrack]);
      } else {
        await this.localVideoTrack.setEnabled(true);
      }
      this.isVideoEnabled = true;
    }

    return this.isVideoEnabled;
  }

  // Get connection state
  public getConnectionState(): string {
    return this.client?.connectionState || "DISCONNECTED";
  }

  // Get local audio track for UI control
  public getLocalAudioTrack(): IMicrophoneAudioTrack | null {
    return this.localAudioTrack;
  }

  // Get local video track for UI rendering
  public getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }
}

export default new AgoraService();
