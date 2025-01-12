class VoxCommunisClient {
  constructor(campaignId) {
    this.campaignId = campaignId;
    this.socket = io("/vox");
    this.peerConnections = {};
    this.localStream = null;
    this.voiceDetector = null;
    this.fetchWebRTCConfig();
  }

  async fetchWebRTCConfig() {
    const response = await fetch("/vox/webrtc-config");
    this.rtcConfig = await response.json();
  }

  async joinChannel(channelId) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.localStream = stream;

      // Initialize voice detection
      this.voiceDetector = new VoiceActivityDetector(
        stream,
        () => this.handleSpeakingStateChange(true),
        () => this.handleSpeakingStateChange(false)
      );
      await this.voiceDetector.init();

      // Join channel via API
      await fetch(`/vox/channels/${channelId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      this.initializeSocketHandlers();
    } catch (error) {
      console.error("Error joining channel:", error);
    }
  }

  handleSpeakingStateChange(isSpeaking) {
    this.socket.emit("speaking_state", {
      channel_id: this.channelId,
      is_speaking: isSpeaking,
    });
  }
}
