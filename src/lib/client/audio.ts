"use client";

/**
 * Every sound here is synthesised with the Web Audio API, so there are no audio files to
 * download and nothing to fail on a jammed network.
 */
let ac: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** Must run inside a user gesture (a tap) before any sound can play on mobile. */
export function unlockAudio(): boolean {
  if (typeof window === "undefined") return false;
  const AC =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;
  if (!ac) {
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 5;
    comp.attack.value = 0.002;
    comp.release.value = 0.25;
    out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(comp).connect(ac.destination);
    const len = Math.floor(ac.sampleRate * 0.06);
    noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") void ac.resume();
  return true;
}

function envGain(t: number, peak: number, decay: number, attack = 0.004): GainNode {
  const g = ac!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  g.connect(out!);
  return g;
}

/** The drum skin: a sine that drops in pitch, plus an inharmonic overtone for the boom. */
function skin(t: number, freq: number, decay: number, peak: number) {
  for (const [ratio, amp, dec] of [
    [1, 1, 1],
    [1.59, 0.35, 0.5],
  ] as const) {
    const o = ac!.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq * ratio * 2.1, t);
    o.frequency.exponentialRampToValueAtTime(freq * ratio, t + 0.028);
    o.frequency.exponentialRampToValueAtTime(freq * ratio * 0.8, t + decay * dec);
    o.connect(envGain(t, peak * amp, decay * dec));
    o.start(t);
    o.stop(t + decay * dec + 0.03);
  }
}

/** The cane stick hitting the skin. */
function stick(t: number, freq: number, peak: number) {
  const src = ac!.createBufferSource();
  src.buffer = noise;
  const bp = ac!.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 1.1;
  src.connect(bp).connect(envGain(t, peak, 0.045, 0.001));
  src.start(t);
  src.stop(t + 0.06);
}

/** Kansar, the bell-metal plate that rides along with the dhak. */
function kansar(t: number, peak: number) {
  for (const [f, amp, dec] of [
    [612, 1, 0.55],
    [1093, 0.7, 0.42],
    [1587, 0.5, 0.32],
    [2311, 0.35, 0.24],
  ] as const) {
    const o = ac!.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(envGain(t, peak * amp, dec, 0.002));
    o.start(t);
    o.stop(t + dec + 0.03);
  }
}

/**
 * "Dyang kurakur": the dhak bol every Bengali can hum. One heavy stroke on the bass skin,
 * three quick strokes on the treble, repeated.
 */
export function playDhak(rounds = 2): number {
  if (!unlockAudio() || !ac) return 0;
  const t0 = ac.currentTime + 0.05;
  const beat = 0.14;
  let t = t0;
  for (let r = 0; r < rounds; r++) {
    skin(t, 92, 0.6, 0.95);
    stick(t, 2400, 0.32);
    kansar(t, 0.1);
    skin(t + beat * 2, 150, 0.14, 0.5);
    stick(t + beat * 2, 3200, 0.24);
    skin(t + beat * 3, 162, 0.12, 0.45);
    stick(t + beat * 3, 3400, 0.2);
    skin(t + beat * 4, 140, 0.24, 0.62);
    stick(t + beat * 4, 3000, 0.24);
    t += beat * 6;
  }
  skin(t, 86, 1, 1);
  stick(t, 2200, 0.38);
  kansar(t, 0.15);
  return (t - t0 + 1) * 1000;
}

/** The shankh (conch) that closes a walk. */
export function playShankh(duration = 2.4) {
  if (!unlockAudio() || !ac) return;
  const t = ac.currentTime + 0.05;
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(300, t);
  o.frequency.linearRampToValueAtTime(330, t + 0.45);
  const lfo = ac.createOscillator();
  lfo.frequency.value = 5.2;
  const depth = ac.createGain();
  depth.gain.value = 3.5;
  lfo.connect(depth).connect(o.frequency);
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1500;
  lp.Q.value = 2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.3);
  g.gain.setValueAtTime(0.32, t + duration - 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  o.connect(lp).connect(g).connect(out!);
  o.start(t);
  lfo.start(t);
  o.stop(t + duration + 0.05);
  lfo.stop(t + duration + 0.05);
}

export function speak(text: string, lang: "en" | "bn" = "en") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  const voices = synth.getVoices();
  const wanted = lang === "bn" ? ["bn-IN", "bn-BD", "bn"] : ["en-IN", "en-GB", "en"];
  const voice = wanted.map((w) => voices.find((v) => v.lang.replace("_", "-").startsWith(w))).find(Boolean);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = wanted[0];
  }
  synth.cancel();
  synth.speak(u);
}

export function buzz(pattern: number[] = [180, 80, 180, 80, 360]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

/** Drum first, then the spoken line once the last stroke has rung out. */
export function arrivalCue(opts: { dhak: boolean; voice: boolean; text: string; lang?: "en" | "bn" }) {
  buzz();
  const wait = opts.dhak ? playDhak(2) : 0;
  if (opts.voice) setTimeout(() => speak(opts.text, opts.lang), Math.max(0, wait - 400));
}
