import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 44100;

function synth(tones) {
  const total = Math.max(...tones.map(t => t.delay + t.dur)) + 0.05;
  const n = Math.ceil(total * RATE);
  const buf = new Float64Array(n);
  for (const { freq, dur, type, delay } of tones) {
    const start = Math.floor(delay * RATE);
    const len = Math.floor(dur * RATE);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      // Matches WebAudio: gain 0.15 → exponentialRampToValueAtTime(0.001) over dur
      const gain = 0.15 * Math.pow(0.001 / 0.15, i / len);
      const phase = Math.sin(2 * Math.PI * freq * t);
      const wave = type === 'square' ? Math.sign(phase) : phase;
      buf[start + i] += wave * gain;
    }
  }
  return buf;
}

function toWav(samples) {
  const n = samples.length;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(s * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);      // PCM
  header.writeUInt16LE(1, 22);      // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const sounds = {
  coin: [
    { freq: 880, dur: 0.1, type: 'square', delay: 0 },
    { freq: 1175, dur: 0.1, type: 'square', delay: 0.08 },
    { freq: 1397, dur: 0.15, type: 'square', delay: 0.16 },
  ],
  settle: [
    { freq: 523, dur: 0.15, type: 'square', delay: 0 },
    { freq: 659, dur: 0.15, type: 'square', delay: 0.15 },
    { freq: 784, dur: 0.15, type: 'square', delay: 0.3 },
    { freq: 1047, dur: 0.3, type: 'square', delay: 0.45 },
  ],
  delete: [
    { freq: 400, dur: 0.1, type: 'sine', delay: 0 },
    { freq: 250, dur: 0.15, type: 'sine', delay: 0.08 },
  ],
};

mkdirSync('assets/sounds', { recursive: true });
for (const [name, tones] of Object.entries(sounds)) {
  writeFileSync(`assets/sounds/${name}.wav`, toWav(synth(tones)));
  console.log(`wrote assets/sounds/${name}.wav`);
}
