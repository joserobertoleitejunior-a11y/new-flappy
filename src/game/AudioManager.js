import { getMuted, setMuted } from "./Storage.js";

// Efeitos e música 100% sintetizados via Web Audio API — sem arquivo de
// áudio pra baixar (nada trava o primeiro load, spec §9.1 "lazy loading").
// O AudioContext só é criado dentro de um gesto do usuário (unlock()),
// respeitando a política de autoplay dos navegadores mobile.
const MUSIC_BPM = 96;
const MUSIC_NOTES = [392, 440, 494, 392, 349, 392, 440, 349]; // melodia curta em loop (G4 A4 B4 G4 F4 G4 A4 F4)
const MUSIC_BEAT_SECONDS = 60 / MUSIC_BPM;

export class AudioManager {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.muted = getMuted();
    this.unlocked = false;
  }

  /** Chame dentro de um clique/toque real do usuário — cria o AudioContext. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return; // sem suporte a Web Audio — jogo segue mudo, sem quebrar

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.context.destination);

    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.18;
    this.musicGain.connect(this.masterGain);

    this._startMusicLoop();
  }

  setMuted(muted) {
    this.muted = muted;
    setMuted(muted);
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  playFlap() {
    this._blip({ freqStart: 380, freqEnd: 620, duration: 0.09, type: "triangle", gain: 0.22 });
  }

  playPoint() {
    this._blip({ freqStart: 660, freqEnd: 880, duration: 0.14, type: "sine", gain: 0.28 });
  }

  playCollision() {
    this._blip({ freqStart: 220, freqEnd: 60, duration: 0.28, type: "sawtooth", gain: 0.32 });
  }

  playDive() {
    this._blip({ freqStart: 500, freqEnd: 120, duration: 0.22, type: "sawtooth", gain: 0.26 });
  }

  _blip({ freqStart, freqEnd, duration, type, gain }) {
    if (!this.context) return;
    const now = this.context.currentTime;

    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), now + duration);

    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(gain, now + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(envelope);
    envelope.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  async _startMusicLoop() {
    try {
      const buffer = await this._renderMusicBuffer();
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this.musicGain);
      source.start();
      this.musicSource = source;
    } catch {
      // renderização offline falhou (navegador sem suporte) — só fica sem música de fundo
    }
  }

  /** Renderiza offline um loop curto de melodia suave, sem baixar nenhum asset. */
  _renderMusicBuffer() {
    const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const sampleRate = this.context.sampleRate;
    const duration = MUSIC_NOTES.length * MUSIC_BEAT_SECONDS;
    const offlineCtx = new OfflineCtx(2, Math.ceil(duration * sampleRate), sampleRate);

    MUSIC_NOTES.forEach((freq, i) => {
      const start = i * MUSIC_BEAT_SECONDS;
      const osc = offlineCtx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;

      const gain = offlineCtx.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.5, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + MUSIC_BEAT_SECONDS * 0.9);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(start);
      osc.stop(start + MUSIC_BEAT_SECONDS);
    });

    return offlineCtx.startRendering();
  }
}
