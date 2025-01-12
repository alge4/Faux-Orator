class VoiceActivityDetector {
  constructor(stream, onSpeaking, onSilent, threshold = -45, interval = 100) {
    this.audioContext = new AudioContext();
    this.stream = stream;
    this.onSpeaking = onSpeaking;
    this.onSilent = onSilent;
    this.threshold = threshold;
    this.interval = interval;
    this.speaking = false;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const source = this.audioContext.createMediaStreamSource(this.stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.1;

    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    const checkVolume = () => {
      analyser.getFloatFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      if (average > this.threshold && !this.speaking) {
        this.speaking = true;
        this.onSpeaking();
      } else if (average <= this.threshold && this.speaking) {
        this.speaking = false;
        this.onSilent();
      }
    };

    this.intervalId = setInterval(checkVolume, this.interval);
    this.initialized = true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
