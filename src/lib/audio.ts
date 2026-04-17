export class AudioStreamer {
  private audioContext: AudioContext;
  private nextTime: number = 0;
  private isPlaying: boolean = false;
  private scheduledNodes: AudioBufferSourceNode[] = [];

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  addPCM16(base64Data: string) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    if (!this.isPlaying) {
      this.isPlaying = true;
      // Increased initial delay to 0.15s for better buffering/smoothness
      this.nextTime = this.audioContext.currentTime + 0.15;
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert PCM16 to Float32
    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Ensure we don't schedule in the past
    const startTime = Math.max(this.nextTime, this.audioContext.currentTime);
    source.start(startTime);
    this.nextTime = startTime + audioBuffer.duration;

    this.scheduledNodes.push(source);
    source.onended = () => {
      this.scheduledNodes = this.scheduledNodes.filter(n => n !== source);
      if (this.scheduledNodes.length === 0) {
        this.isPlaying = false;
      }
    };
  }

  stop() {
    this.scheduledNodes.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {
        // Node might have already stopped
      }
    });
    this.scheduledNodes = [];
    this.isPlaying = false;
    this.nextTime = 0;
  }
}

export class AudioRecorder {
  private audioContext: AudioContext;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private onData: (base64Data: string) => void;

  constructor(onData: (base64Data: string) => void) {
    // Force 16000Hz for Live API input
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.onData = onData;
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("API audio non supportée. Change de navigateur, bouffon.");
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    
    // Use ScriptProcessorNode for simplicity, though deprecated, it works well for raw PCM extraction
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Convert Float32 to PCM16
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        let s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Convert to base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      this.onData(btoa(binary));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
