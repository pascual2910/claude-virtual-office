export type SoundType = 'task-completed' | 'agent-idle' | 'message-received';

const MUTE_KEY = 'vo-muted';
let muted = typeof localStorage !== 'undefined'
  ? localStorage.getItem(MUTE_KEY) === 'true'
  : false;
let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(MUTE_KEY, String(value));
  }
}

export function playSound(type: SoundType): void {
  if (muted) return;
  const ctx = getContext();

  switch (type) {
    case 'task-completed':
      // Cheerful ascending 3-note ding
      playTone(ctx, 523.25, 0.12, 0.3);
      setTimeout(() => playTone(ctx, 659.25, 0.12, 0.3), 120);
      setTimeout(() => playTone(ctx, 783.99, 0.18, 0.3), 240);
      break;
    case 'agent-idle':
      // Soft single chime
      playTone(ctx, 440, 0.3, 0.15);
      break;
    case 'message-received':
      // Two-tone notification
      playTone(ctx, 587.33, 0.1, 0.25);
      setTimeout(() => playTone(ctx, 698.46, 0.15, 0.25), 100);
      break;
  }
}

function playTone(
  ctx: AudioContext,
  frequency: number,
  duration: number,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}
