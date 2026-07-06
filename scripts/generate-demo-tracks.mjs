// Synthesizes royalty-free demo loops into public/demo-tracks/ as 16-bit WAVs.
// Pure math — no third-party audio, no licensing.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo-tracks');
mkdirSync(outDir, { recursive: true });

function synth({ bpm, bars, bassNotes, hatEvery, name }) {
  const beat = 60 / bpm;
  const seconds = bars * 4 * beat;
  const n = Math.floor(seconds * SR);
  const out = new Float32Array(n);

  const kick = (t) => {
    if (t < 0 || t > 0.28) return 0;
    const f = 150 * Math.exp(-t * 18) + 48;
    return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 11) * 0.9;
  };
  const hat = (t) => (t < 0 || t > 0.05 ? 0 : (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.25);
  const bass = (t, freq) => {
    if (t < 0 || t > beat * 0.45) return 0;
    const saw = 2 * ((t * freq) % 1) - 1;
    return saw * Math.exp(-t * 6) * 0.3;
  };

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const beatIdx = Math.floor(t / beat);
    const tInBeat = t - beatIdx * beat;
    let v = kick(tInBeat); // four-on-the-floor

    // hats: offbeat (or every hatEvery fraction of a beat)
    const hatT = (t + beat / 2) % (beat * hatEvery);
    v += hat(hatT);

    // bass: one note per beat from the pattern
    const note = bassNotes[beatIdx % bassNotes.length];
    v += bass(tInBeat, note);

    out[i] = Math.tanh(v * 1.2); // soft clip
  }

  // fade edges to keep the loop click-free
  const fade = Math.floor(0.005 * SR);
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }

  writeFileSync(join(outDir, name), toWav(out));
  console.log(`✓ ${name} — ${bpm} BPM, ${seconds.toFixed(1)}s`);
}

function toWav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }
  return buf;
}

// A: 120 BPM, darker bassline
synth({ bpm: 120, bars: 16, bassNotes: [55, 55, 65.4, 49], hatEvery: 1, name: 'neon-drive-120.wav' });
// B: 128 BPM, brighter, driving 8th hats
synth({ bpm: 128, bars: 16, bassNotes: [61.7, 61.7, 73.4, 82.4], hatEvery: 0.5, name: 'pulse-grid-128.wav' });
