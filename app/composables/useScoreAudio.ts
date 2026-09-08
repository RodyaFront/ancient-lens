let scoreAudioContext: AudioContext | null = null

export function useScoreAudio() {
  function reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function unlock() {
    if (import.meta.server || reducedMotion()) {
      return
    }

    try {
      const Context = window.AudioContext || window.webkitAudioContext
      if (!Context) {
        return
      }
      if (!scoreAudioContext) {
        scoreAudioContext = new Context()
      }
      void scoreAudioContext.resume()
    } catch {
      // Audio is optional.
    }
  }

  function play(winner: 'radiant' | 'dire') {
    if (
      !scoreAudioContext ||
      scoreAudioContext.state !== 'running' ||
      reducedMotion()
    ) {
      return
    }

    const ctx = scoreAudioContext
    const t = ctx.currentTime
    const master = ctx.createGain()
    master.gain.setValueAtTime(0.0001, t)
    master.gain.exponentialRampToValueAtTime(0.32, t + 0.28)
    master.gain.exponentialRampToValueAtTime(0.0001, t + 1.15)
    master.connect(ctx.destination)

    const boom = ctx.createOscillator()
    const boomGain = ctx.createGain()
    boom.type = 'sine'
    boom.frequency.setValueAtTime(winner === 'radiant' ? 74 : 68, t + 0.18)
    boom.frequency.exponentialRampToValueAtTime(34, t + 0.92)
    boomGain.gain.setValueAtTime(0.0001, t)
    boomGain.gain.exponentialRampToValueAtTime(0.9, t + 0.24)
    boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.05)
    boom.connect(boomGain).connect(master)
    boom.start(t)
    boom.stop(t + 1.1)

    const crack = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * 0.24),
      ctx.sampleRate,
    )
    const data = crack.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    }
    const noise = ctx.createBufferSource()
    const filterNode = ctx.createBiquadFilter()
    const noiseGain = ctx.createGain()
    noise.buffer = crack
    filterNode.type = 'bandpass'
    filterNode.frequency.value = winner === 'radiant' ? 980 : 720
    filterNode.Q.value = 0.8
    noiseGain.gain.setValueAtTime(0.0001, t + 0.19)
    noiseGain.gain.exponentialRampToValueAtTime(0.75, t + 0.24)
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48)
    noise.connect(filterNode).connect(noiseGain).connect(master)
    noise.start(t + 0.19)
    noise.stop(t + 0.49)

    const ring = ctx.createOscillator()
    const ringGain = ctx.createGain()
    ring.type = 'triangle'
    ring.frequency.setValueAtTime(winner === 'radiant' ? 392 : 311, t + 0.25)
    ring.frequency.exponentialRampToValueAtTime(
      winner === 'radiant' ? 196 : 155,
      t + 0.9,
    )
    ringGain.gain.setValueAtTime(0.0001, t + 0.22)
    ringGain.gain.exponentialRampToValueAtTime(0.18, t + 0.31)
    ringGain.gain.exponentialRampToValueAtTime(0.0001, t + 1)
    ring.connect(ringGain).connect(master)
    ring.start(t + 0.22)
    ring.stop(t + 1.02)
  }

  return { unlock, play, reducedMotion }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext
  }
}
