class WebRTCClient {
  constructor(config) {
    this.config = config;
    this.maxRetries = 3;
    this.retryDelay = 2000;
    this.connections = new Map();
    this.connectionStates = new Map();
  }

  async createPeerConnection(userId, retryCount = 0) {
    try {
      const pc = new RTCPeerConnection(this.config);
      this.setupConnectionHandlers(pc, userId);
      this.connections.set(userId, pc);
      return pc;
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.warn(
          `Retrying peer connection for ${userId}, attempt ${retryCount + 1}`
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.createPeerConnection(userId, retryCount + 1);
      }
      throw new Error(
        `Failed to create peer connection after ${this.maxRetries} attempts`
      );
    }
  }

  setupConnectionHandlers(pc, userId) {
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      this.connectionStates.set(userId, state);

      if (state === "failed") {
        this.handleConnectionFailure(userId);
      } else if (state === "disconnected") {
        this.handleDisconnection(userId);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed") {
        this.reconnect(userId);
      }
    };
  }

  async reconnect(userId) {
    const oldConnection = this.connections.get(userId);
    if (oldConnection) {
      oldConnection.close();
      this.connections.delete(userId);
    }

    try {
      await this.createPeerConnection(userId);
      this.emit("reconnected", { userId });
    } catch (error) {
      this.emit("reconnection_failed", { userId, error });
    }
  }
}
