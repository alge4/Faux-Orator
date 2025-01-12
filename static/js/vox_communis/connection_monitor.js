class ConnectionQualityMonitor {
  constructor(peerConnection) {
    this.pc = peerConnection;
    this.stats = {
      packetsLost: 0,
      jitter: 0,
      rtt: 0,
      timestamp: Date.now(),
    };
    this.monitorInterval = null;
  }

  startMonitoring() {
    this.monitorInterval = setInterval(async () => {
      const stats = await this.pc.getStats();
      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "audio") {
          this.updateAudioStats(report);
        }
      });
    }, 2000);
  }

  updateAudioStats(report) {
    const currentStats = {
      packetsLost: report.packetsLost,
      jitter: report.jitter,
      timestamp: report.timestamp,
    };

    // Calculate connection quality score
    const quality = this.calculateQualityScore(currentStats);
    this.emit("quality_update", { quality, stats: currentStats });
  }

  calculateQualityScore(stats) {
    // Implement quality scoring based on packets lost, jitter, and RTT
    const packetLossScore = Math.max(0, 1 - stats.packetsLost / 1000);
    const jitterScore = Math.max(0, 1 - stats.jitter / 100);
    return (packetLossScore + jitterScore) / 2;
  }
}
