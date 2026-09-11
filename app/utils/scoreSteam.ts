/**
 * Winner-side 2D GPU fluid steam (poke pass).
 *
 * Stam-style stable fluids on a 256² ping-pong RT stack:
 * inject → advect velocity → vorticity → project → buoyancy → advect density → display.
 * Hearth embers in scoreEmbers.ts stay canon; this is a temporary mount swap.
 */

import * as THREE from 'three'
import {
  SCORE_EMBERS_INTRO_DELAY,
  SCORE_EMBERS_INTRO_FADE,
  scoreEmbersIntroFade,
  scoreEmbersWinnerUniform,
  type ScoreEmbersWinner,
} from './scoreEmbers'

export type ScoreSteamWinner = ScoreEmbersWinner

export interface ScoreSteamHandle {
  setWinner: (winner: ScoreSteamWinner) => void
  setTune: (tune: Partial<ScoreSteamTune>) => void
  dispose: () => void
}

/** Height of the fluid grid. Width follows the parent aspect. */
export const SCORE_STEAM_SIM_SIZE = 256
export const SCORE_STEAM_SIM_MAX_WIDTH = 1024
export const SCORE_STEAM_INTRO_DELAY = SCORE_EMBERS_INTRO_DELAY
export const SCORE_STEAM_INTRO_FADE = SCORE_EMBERS_INTRO_FADE
export const SCORE_STEAM_PRESSURE_ITERATIONS = 16

export function scoreSteamWinnerUniform(winner: ScoreSteamWinner) {
  return scoreEmbersWinnerUniform(winner)
}

export function scoreSteamIntroFade(elapsedSec: number) {
  return scoreEmbersIntroFade(elapsedSec)
}

/**
 * Sim UV gutter outside the visible card. The puff is born here;
 * wind carries it onto the banner.
 */
export const SCORE_STEAM_VIEW_MARGIN_X = 0.16
export const SCORE_STEAM_VIEW_MARGIN_Y = 0.22
export const SCORE_STEAM_INJECT_X = 0.05
export const SCORE_STEAM_INJECT_Y = 0.06

/** Seconds between puffs from the background-smoke emitter. */
export const SCORE_STEAM_EMIT_PERIOD = 1.5
/** Plus/minus seconds of random delay around the emit period. */
export const SCORE_STEAM_EMIT_JITTER = 1.05
export const SCORE_STEAM_EMIT_MIN_GAP = 0.05
export const SCORE_STEAM_MAX_EMITTERS = 4

/**
 * Density lifetime in seconds (independent of refresh rate).
 * Remaining fraction at the end of this window is about 12%.
 */
export const SCORE_STEAM_DENSITY_LIFE = 10

/** Sim +x is toward the card center (Dire is mirrored in display). */
export const SCORE_STEAM_WIND_X = 0.075
/** UV-y; the grid is short, so this is stronger than X in UV to read as a lift. */
export const SCORE_STEAM_WIND_Y = 0.095
export const SCORE_STEAM_WIND_WAVER = 0.05
export const SCORE_STEAM_EMIT_VEL_X = 0.085
export const SCORE_STEAM_EMIT_VEL_Y = 0.225
export const SCORE_STEAM_EMIT_DENSITY = 0.15
export const SCORE_STEAM_EMIT_RADIUS = 0.052
export const SCORE_STEAM_BUOYANCY = 0.15
export const SCORE_STEAM_DISPLAY_ALPHA = 0.75

export type ScoreSteamEmitterTune = {
  injectX: number
  injectY: number
  emitPeriod: number
  emitJitter: number
  emitVelX: number
  emitVelY: number
  emitDensity: number
  emitRadius: number
  densityLife: number
  displayAlpha: number
  visible: boolean
}

export type ScoreSteamTune = {
  windX: number
  windY: number
  windWaver: number
  buoyancy: number
  viewMarginX: number
  viewMarginY: number
  emitters: ScoreSteamEmitterTune[]
}

export const SCORE_STEAM_EMITTER_DEFAULTS: ScoreSteamEmitterTune = {
  injectX: SCORE_STEAM_INJECT_X,
  injectY: SCORE_STEAM_INJECT_Y,
  emitPeriod: SCORE_STEAM_EMIT_PERIOD,
  emitJitter: SCORE_STEAM_EMIT_JITTER,
  emitVelX: SCORE_STEAM_EMIT_VEL_X,
  emitVelY: SCORE_STEAM_EMIT_VEL_Y,
  emitDensity: SCORE_STEAM_EMIT_DENSITY,
  emitRadius: SCORE_STEAM_EMIT_RADIUS,
  densityLife: SCORE_STEAM_DENSITY_LIFE,
  displayAlpha: SCORE_STEAM_DISPLAY_ALPHA,
  visible: true,
}

/** Background-smoke emitter pinned for the score card. */
export const SCORE_STEAM_TUNE_DEFAULTS: ScoreSteamTune = {
  windX: SCORE_STEAM_WIND_X,
  windY: SCORE_STEAM_WIND_Y,
  windWaver: SCORE_STEAM_WIND_WAVER,
  buoyancy: SCORE_STEAM_BUOYANCY,
  viewMarginX: SCORE_STEAM_VIEW_MARGIN_X,
  viewMarginY: SCORE_STEAM_VIEW_MARGIN_Y,
  emitters: [{ ...SCORE_STEAM_EMITTER_DEFAULTS }],
}

export function cloneScoreSteamEmitter(
  emitter: ScoreSteamEmitterTune = SCORE_STEAM_EMITTER_DEFAULTS,
): ScoreSteamEmitterTune {
  return { ...emitter }
}

export function cloneScoreSteamTune(
  tune: ScoreSteamTune = SCORE_STEAM_TUNE_DEFAULTS,
): ScoreSteamTune {
  return {
    ...tune,
    emitters: tune.emitters.map((emitter) => cloneScoreSteamEmitter(emitter)),
  }
}

export function normalizeScoreSteamTune(
  input: Partial<ScoreSteamTune> = {},
): ScoreSteamTune {
  const source = input.emitters?.length
    ? input.emitters
    : SCORE_STEAM_TUNE_DEFAULTS.emitters
  const emitters = source.slice(0, SCORE_STEAM_MAX_EMITTERS).map((emitter) => ({
    ...SCORE_STEAM_EMITTER_DEFAULTS,
    ...emitter,
  }))
  if (emitters.length === 0) {
    emitters.push(cloneScoreSteamEmitter())
  }
  return {
    ...SCORE_STEAM_TUNE_DEFAULTS,
    ...input,
    emitters,
  }
}

function roundTuneNumber(value: number) {
  return Number(value.toFixed(4))
}

function packEmitterTune(
  emitter: ScoreSteamEmitterTune,
): ScoreSteamEmitterTune {
  return {
    injectX: roundTuneNumber(emitter.injectX),
    injectY: roundTuneNumber(emitter.injectY),
    emitPeriod: roundTuneNumber(emitter.emitPeriod),
    emitJitter: roundTuneNumber(emitter.emitJitter),
    emitVelX: roundTuneNumber(emitter.emitVelX),
    emitVelY: roundTuneNumber(emitter.emitVelY),
    emitDensity: roundTuneNumber(emitter.emitDensity),
    emitRadius: roundTuneNumber(emitter.emitRadius),
    densityLife: roundTuneNumber(emitter.densityLife),
    displayAlpha: roundTuneNumber(emitter.displayAlpha),
    visible: Boolean(emitter.visible),
  }
}

/** Inject in the off-screen gutter (sim bottom-left). Dire is a display mirror. */
export function scoreSteamInjectUv(_winner?: ScoreSteamWinner): {
  x: number
  y: number
} {
  return { x: SCORE_STEAM_INJECT_X, y: SCORE_STEAM_INJECT_Y }
}

export function scoreSteamDensityDissipation(
  dt: number,
  life: number = SCORE_STEAM_DENSITY_LIFE,
) {
  const safeLife = Math.max(0.25, life)
  const keepPerSec = Math.pow(0.12, 1 / safeLife)
  return Math.pow(keepPerSec, Math.max(0, dt))
}

export function formatScoreSteamTune(
  tune: ScoreSteamTune = SCORE_STEAM_TUNE_DEFAULTS,
) {
  const normalized = normalizeScoreSteamTune(tune)
  const packed: ScoreSteamTune = {
    windX: roundTuneNumber(normalized.windX),
    windY: roundTuneNumber(normalized.windY),
    windWaver: roundTuneNumber(normalized.windWaver),
    buoyancy: roundTuneNumber(normalized.buoyancy),
    viewMarginX: roundTuneNumber(normalized.viewMarginX),
    viewMarginY: roundTuneNumber(normalized.viewMarginY),
    emitters: normalized.emitters.map(packEmitterTune),
  }
  return `score-steam-tune\n${JSON.stringify(packed, null, 2)}\n`
}

/** Next gap after a puff: period plus/minus jitter. */
export function scoreSteamNextEmitDelay(
  period: number,
  jitter: number,
  rand: number = Math.random(),
) {
  const safePeriod = Math.max(SCORE_STEAM_EMIT_MIN_GAP, period)
  const spread = Math.max(0, jitter)
  const unit = Math.min(1, Math.max(0, rand))
  return Math.max(
    SCORE_STEAM_EMIT_MIN_GAP,
    safePeriod + (unit * 2 - 1) * spread,
  )
}

/** True on the first simulation frame of each emit period. */
export function scoreSteamShouldEmit(
  elapsedSec: number,
  dt: number,
  period: number = SCORE_STEAM_EMIT_PERIOD,
) {
  if (period <= 0 || elapsedSec < 0 || dt <= 0) {
    return false
  }
  return elapsedSec % period < dt
}

/** Fluid RT size so the view matches the parent banner, not a square crop. */
export function scoreSteamSimExtent(aspect: number) {
  const height = SCORE_STEAM_SIM_SIZE
  const safeAspect = Math.min(8, Math.max(0.5, aspect))
  const width = Math.max(
    height,
    Math.min(SCORE_STEAM_SIM_MAX_WIDTH, Math.round(height * safeAspect)),
  )
  return { width, height }
}

/** Map card UV into the visible sim crop (gutter is not shown). */
export function scoreSteamDisplayUv(
  screenX: number,
  screenY: number,
  _aspect: number,
  winner: ScoreSteamWinner,
) {
  const x = winner === 'dire' ? 1 - screenX : screenX
  return {
    x: SCORE_STEAM_VIEW_MARGIN_X + x * (1 - SCORE_STEAM_VIEW_MARGIN_X),
    y: SCORE_STEAM_VIEW_MARGIN_Y + screenY * (1 - SCORE_STEAM_VIEW_MARGIN_Y),
  }
}

type PingPong = {
  read: THREE.WebGLRenderTarget
  write: THREE.WebGLRenderTarget
}

function makeTarget(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

function makePingPong(width: number, height: number): PingPong {
  return { read: makeTarget(width, height), write: makeTarget(width, height) }
}

function swapPingPong(pair: PingPong) {
  const previous = pair.read
  pair.read = pair.write
  pair.write = previous
}

const FULLSCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export type ScoreSteamOptions = {
  skipIntro?: boolean
  tune?: Partial<ScoreSteamTune>
}

export function createScoreSteam(
  canvas: HTMLCanvasElement,
  winner: ScoreSteamWinner,
  options: ScoreSteamOptions = {},
): ScoreSteamHandle {
  const skipIntro = Boolean(options.skipIntro)
  const tune = normalizeScoreSteamTune(options.tune)
  const nextEmitAt: number[] = []
  const size = SCORE_STEAM_SIM_SIZE
  let simW = size
  let simH = size

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.autoClear = false
  renderer.outputColorSpace = THREE.SRGBColorSpace

  let velocity = makePingPong(simW, simH)
  let density = makePingPong(simW, simH)
  let pressure = makePingPong(simW, simH)
  let divergence = makeTarget(simW, simH)
  let curl = makeTarget(simW, simH)

  const common = {
    uTexel: { value: new THREE.Vector2(1 / simW, 1 / simH) },
  }

  function passMaterial(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>,
  ) {
    return new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader,
      uniforms: { ...common, ...uniforms },
      depthTest: false,
      depthWrite: false,
    })
  }

  function uni<T>(
    material: THREE.ShaderMaterial,
    name: string,
  ): THREE.IUniform<T> {
    const entry = material.uniforms[name]
    if (!entry) {
      throw new Error(`scoreSteam missing uniform ${name}`)
    }
    return entry as THREE.IUniform<T>
  }

  const splatMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uTarget;
      uniform float uAspect;
      uniform vec3 uPoint;
      uniform vec4 uColor;
      uniform float uRadius;
      uniform float uStretch;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - uPoint.xy;
        p.x *= uAspect * max(uStretch, 0.01);
        float falloff = exp(-dot(p, p) / max(1e-5, uRadius));
        vec4 base = texture2D(uTarget, vUv);
        vec4 next = base + uColor * falloff;
        gl_FragColor = clamp(next, vec4(-3.0), vec4(3.0));
      }
    `,
    {
      uTarget: { value: null as THREE.Texture | null },
      uAspect: { value: 1 },
      uPoint: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Vector4() },
      uRadius: { value: 0.012 },
      uStretch: { value: 1 },
    },
  )

  const advectMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform float uDt;
      uniform vec4 uDissipation;
      uniform vec2 uWind;
      uniform float uWindWaver;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel = clamp(vel, vec2(-3.0), vec2(3.0));
        vec2 carry = vel + uWind;
        carry.x += cos(vUv.y * 6.0 - uTime * 0.7) * uWindWaver * 0.45;
        carry.y += sin(vUv.x * 8.0 + uTime * 0.9) * uWindWaver;
        vec2 coord = vUv - uDt * carry;
        vec4 sourceTexel = texture2D(uSource, clamp(coord, 0.0, 1.0));
        gl_FragColor = clamp(uDissipation * sourceTexel, vec4(-3.0), vec4(3.0));
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uSource: { value: null as THREE.Texture | null },
      uDt: { value: 0.016 },
      uDissipation: { value: new THREE.Vector4(0.98, 0.98, 0.98, 0.98) },
      uWind: { value: new THREE.Vector2(0, 0) },
      uWindWaver: { value: 0 },
      uTime: { value: 0 },
    },
  )

  const curlMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
        float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
        float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
    },
  )

  const vorticityMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uCurl;
      uniform vec2 uTexel;
      uniform float uCurlForce;
      uniform float uDt;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 1e-5;
        force *= uCurlForce * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel = clamp(vel + force * uDt, vec2(-3.0), vec2(3.0));
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uCurl: { value: null as THREE.Texture | null },
      uCurlForce: { value: 11 },
      uDt: { value: 0.016 },
    },
  )

  const divergenceMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
        float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
    },
  )

  const clearMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uTexture;
      uniform float uValue;
      varying vec2 vUv;
      void main() {
        gl_FragColor = uValue * texture2D(uTexture, vUv);
      }
    `,
    {
      uTexture: { value: null as THREE.Texture | null },
      uValue: { value: 0.8 },
    },
  )

  const pressureMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uPressure;
      uniform sampler2D uDivergence;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        float C = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - C) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
      }
    `,
    {
      uPressure: { value: null as THREE.Texture | null },
      uDivergence: { value: null as THREE.Texture | null },
    },
  )

  const gradientMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uPressure;
      uniform sampler2D uVelocity;
      uniform vec2 uTexel;
      varying vec2 vUv;
      void main() {
        float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
        float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
        float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
        float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        vel -= 0.5 * vec2(R - L, T - B);
        vel = clamp(vel, vec2(-3.0), vec2(3.0));
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `,
    {
      uPressure: { value: null as THREE.Texture | null },
      uVelocity: { value: null as THREE.Texture | null },
    },
  )

  const buoyancyMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uDensity;
      uniform float uBuoyancy;
      uniform float uDt;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec4 dye = max(texture2D(uDensity, vUv), vec4(0.0));
        float d = clamp(dye.x + dye.y + dye.z + dye.w, 0.0, 2.0);
        vec2 vel = clamp(texture2D(uVelocity, vUv).xy, vec2(-3.0), vec2(3.0));
        float swirl = sin(vUv.y * 18.0 + uTime * 1.4) * cos(vUv.x * 14.0 - uTime * 0.9);
        vel.y += d * uBuoyancy * uDt;
        vel.x += d * swirl * 0.55 * uDt;
        vel = clamp(vel, vec2(-3.0), vec2(3.0));
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uDensity: { value: null as THREE.Texture | null },
      uBuoyancy: { value: tune.buoyancy },
      uDt: { value: 0.016 },
      uTime: { value: 0 },
    },
  )

  const displayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: FULLSCREEN_VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDensity;
      uniform float uFade;
      uniform float uWinner;
      uniform float uTime;
      uniform float uAspect;
      uniform float uMarginX;
      uniform float uMarginY;
      uniform vec4 uEmitterAlpha;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        float x = mix(vUv.x, 1.0 - vUv.x, uWinner);
        vec2 viewMin = vec2(uMarginX, uMarginY);
        vec2 uv = viewMin + vec2(x, vUv.y) * (1.0 - viewMin);

        vec2 warp = vec2(
          noise(uv * 4.4 + vec2(uTime * 0.12, 0.2)),
          noise(uv * 3.7 + vec2(1.1, uTime * 0.09))
        ) - 0.5;
        vec2 sampleUv = clamp(uv + warp * 0.08, viewMin, vec2(1.0));
        vec4 dye = max(texture2D(uDensity, sampleUv), vec4(0.0));

        float n = noise(uv * 6.5 - vec2(uTime * 0.16, uTime * 0.11));
        float n2 = noise(uv * 12.0 + uTime * 0.07);
        vec4 gated = dye * mix(0.65, 1.0, smoothstep(0.1, 0.5, n));
        vec4 filament = pow(max(gated, vec4(0.0)), vec4(1.05));
        vec4 veil = smoothstep(vec4(0.008), vec4(0.1), gated);
        vec4 layer = (filament * 1.1 + veil * 0.55) * uEmitterAlpha;
        float alpha = (layer.x + layer.y + layer.z + layer.w) * uFade;
        alpha *= 0.75 + 0.25 * n2;
        alpha = clamp(alpha, 0.0, 0.85);
        float heat = clamp(
          filament.x + filament.y + filament.z + filament.w,
          0.0,
          1.0
        );

        vec3 radiant = vec3(0.28, 0.82, 0.52);
        vec3 radiantHot = vec3(0.55, 1.0, 0.78);
        vec3 dire = vec3(0.92, 0.32, 0.22);
        vec3 direHot = vec3(1.0, 0.68, 0.38);
        vec3 color = mix(
          mix(radiant, dire, uWinner),
          mix(radiantHot, direHot, uWinner),
          heat
        );
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
    uniforms: {
      uDensity: { value: null as THREE.Texture | null },
      uFade: { value: 0 },
      uWinner: { value: scoreSteamWinnerUniform(winner) },
      uTime: { value: 0 },
      uAspect: { value: 2.4 },
      uMarginX: { value: tune.viewMarginX },
      uMarginY: { value: tune.viewMarginY },
      uEmitterAlpha: { value: new THREE.Vector4() },
    },
  })

  const materials = [
    splatMaterial,
    advectMaterial,
    curlMaterial,
    vorticityMaterial,
    divergenceMaterial,
    clearMaterial,
    pressureMaterial,
    gradientMaterial,
    buoyancyMaterial,
    displayMaterial,
  ]

  const simScene = new THREE.Scene()
  const displayScene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial)
  quad.frustumCulled = false
  simScene.add(quad)

  const displayQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    displayMaterial,
  )
  displayQuad.frustumCulled = false
  displayScene.add(displayQuad)

  let currentWinner = winner
  let frame = 0
  let disposed = false
  let paused = document.hidden
  const startedAt = performance.now()
  let lastNow = startedAt

  const velocityKeep = new THREE.Vector4(0.975, 0.975, 0.975, 0.975)
  const densityKeep = new THREE.Vector4()
  const emitterAlpha = new THREE.Vector4()
  const emitterDye = new THREE.Vector4()
  const emitVelocity = new THREE.Vector4()

  function emitterValue(
    index: number,
    pick: (emitter: ScoreSteamEmitterTune) => number,
    fallback = 0,
  ) {
    const emitter = tune.emitters[index]
    return emitter ? pick(emitter) : fallback
  }

  function syncEmitterDisplay() {
    emitterAlpha.set(
      emitterValue(0, (emitter) =>
        emitter.visible ? emitter.displayAlpha : 0,
      ),
      emitterValue(1, (emitter) =>
        emitter.visible ? emitter.displayAlpha : 0,
      ),
      emitterValue(2, (emitter) =>
        emitter.visible ? emitter.displayAlpha : 0,
      ),
      emitterValue(3, (emitter) =>
        emitter.visible ? emitter.displayAlpha : 0,
      ),
    )
    uni<THREE.Vector4>(displayMaterial, 'uEmitterAlpha').value.copy(
      emitterAlpha,
    )
  }

  function blit(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ) {
    quad.material = material
    renderer.setRenderTarget(target)
    renderer.render(simScene, camera)
  }

  function splat(
    target: PingPong,
    point: THREE.Vector3,
    color: THREE.Vector4,
    radius: number,
    stretch = 1,
  ) {
    uni<THREE.Texture | null>(splatMaterial, 'uTarget').value =
      target.read.texture
    uni<number>(splatMaterial, 'uAspect').value = simW / simH
    uni<THREE.Vector3>(splatMaterial, 'uPoint').value.copy(point)
    uni<THREE.Vector4>(splatMaterial, 'uColor').value.copy(color)
    uni<number>(splatMaterial, 'uRadius').value = radius
    uni<number>(splatMaterial, 'uStretch').value = stretch
    blit(splatMaterial, target.write)
    swapPingPong(target)
  }

  function simTargets() {
    return [
      velocity.read,
      velocity.write,
      density.read,
      density.write,
      pressure.read,
      pressure.write,
      divergence,
      curl,
    ]
  }

  function clearSim() {
    renderer.setClearColor(0x000000, 0)
    for (const target of simTargets()) {
      renderer.setRenderTarget(target)
      renderer.clear()
    }
    renderer.setRenderTarget(null)
  }

  function allocSim(width: number, height: number) {
    simW = width
    simH = height
    common.uTexel.value.set(1 / width, 1 / height)
    velocity = makePingPong(width, height)
    density = makePingPong(width, height)
    pressure = makePingPong(width, height)
    divergence = makeTarget(width, height)
    curl = makeTarget(width, height)
    clearSim()
  }

  function resize() {
    const parent = canvas.parentElement
    const rect = parent?.getBoundingClientRect()
    const width = Math.max(
      1,
      Math.min(2048, Math.floor(rect?.width || canvas.clientWidth || 1)),
    )
    const height = Math.max(
      1,
      Math.min(2048, Math.floor(rect?.height || canvas.clientHeight || 1)),
    )
    renderer.setSize(width, height, false)
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    const aspect = width / height
    uni<number>(displayMaterial, 'uAspect').value = aspect
    const next = scoreSteamSimExtent(aspect)
    if (next.width !== simW || next.height !== simH) {
      for (const target of simTargets()) {
        target.dispose()
      }
      allocSim(next.width, next.height)
    }
  }

  const observer = new ResizeObserver(resize)
  const resizeRoot = canvas.parentElement ?? canvas
  observer.observe(resizeRoot)
  resize()

  function step(dt: number, elapsed: number) {
    uni<THREE.Texture | null>(advectMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(advectMaterial, 'uSource').value =
      velocity.read.texture
    uni<number>(advectMaterial, 'uDt').value = dt
    uni<THREE.Vector4>(advectMaterial, 'uDissipation').value.copy(velocityKeep)
    uni<THREE.Vector2>(advectMaterial, 'uWind').value.set(0, 0)
    uni<number>(advectMaterial, 'uWindWaver').value = 0
    blit(advectMaterial, velocity.write)
    swapPingPong(velocity)

    uni<THREE.Texture | null>(curlMaterial, 'uVelocity').value =
      velocity.read.texture
    blit(curlMaterial, curl)

    uni<THREE.Texture | null>(vorticityMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(vorticityMaterial, 'uCurl').value = curl.texture
    uni<number>(vorticityMaterial, 'uDt').value = dt
    blit(vorticityMaterial, velocity.write)
    swapPingPong(velocity)

    uni<THREE.Texture | null>(divergenceMaterial, 'uVelocity').value =
      velocity.read.texture
    blit(divergenceMaterial, divergence)

    uni<THREE.Texture | null>(clearMaterial, 'uTexture').value =
      pressure.read.texture
    uni<number>(clearMaterial, 'uValue').value = 0.8
    blit(clearMaterial, pressure.write)
    swapPingPong(pressure)

    for (let index = 0; index < SCORE_STEAM_PRESSURE_ITERATIONS; index++) {
      uni<THREE.Texture | null>(pressureMaterial, 'uPressure').value =
        pressure.read.texture
      uni<THREE.Texture | null>(pressureMaterial, 'uDivergence').value =
        divergence.texture
      blit(pressureMaterial, pressure.write)
      swapPingPong(pressure)
    }

    uni<THREE.Texture | null>(gradientMaterial, 'uPressure').value =
      pressure.read.texture
    uni<THREE.Texture | null>(gradientMaterial, 'uVelocity').value =
      velocity.read.texture
    blit(gradientMaterial, velocity.write)
    swapPingPong(velocity)

    uni<THREE.Texture | null>(buoyancyMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(buoyancyMaterial, 'uDensity').value =
      density.read.texture
    uni<number>(buoyancyMaterial, 'uDt').value = dt
    uni<number>(buoyancyMaterial, 'uTime').value = elapsed
    blit(buoyancyMaterial, velocity.write)
    swapPingPong(velocity)

    // Background-smoke pulse. Between beats the field just drifts.
    const emitClock = skipIntro ? elapsed : elapsed - SCORE_STEAM_INTRO_DELAY
    if (emitClock >= 0) {
      while (nextEmitAt.length < tune.emitters.length) {
        nextEmitAt.push(emitClock)
      }
      if (nextEmitAt.length > tune.emitters.length) {
        nextEmitAt.length = tune.emitters.length
      }
      for (let index = 0; index < tune.emitters.length; index++) {
        const emitter = tune.emitters[index]
        const dueAt = nextEmitAt[index]
        if (!emitter || dueAt === undefined || emitClock + 1e-6 < dueAt) {
          continue
        }
        if (emitter.visible) {
          const point = new THREE.Vector3(emitter.injectX, emitter.injectY, 0)
          emitVelocity.set(emitter.emitVelX, emitter.emitVelY, 0, 0)
          emitterDye.set(0, 0, 0, 0)
          emitterDye.setComponent(Math.min(3, index), emitter.emitDensity)
          splat(velocity, point, emitVelocity, emitter.emitRadius, 1)
          splat(density, point, emitterDye, emitter.emitRadius, 1)
        }
        nextEmitAt[index] =
          emitClock +
          scoreSteamNextEmitDelay(emitter.emitPeriod, emitter.emitJitter)
      }
    }

    uni<THREE.Texture | null>(advectMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(advectMaterial, 'uSource').value =
      density.read.texture
    densityKeep.set(
      scoreSteamDensityDissipation(
        dt,
        emitterValue(
          0,
          (emitter) => emitter.densityLife,
          SCORE_STEAM_DENSITY_LIFE,
        ),
      ),
      scoreSteamDensityDissipation(
        dt,
        emitterValue(
          1,
          (emitter) => emitter.densityLife,
          SCORE_STEAM_DENSITY_LIFE,
        ),
      ),
      scoreSteamDensityDissipation(
        dt,
        emitterValue(
          2,
          (emitter) => emitter.densityLife,
          SCORE_STEAM_DENSITY_LIFE,
        ),
      ),
      scoreSteamDensityDissipation(
        dt,
        emitterValue(
          3,
          (emitter) => emitter.densityLife,
          SCORE_STEAM_DENSITY_LIFE,
        ),
      ),
    )
    uni<number>(advectMaterial, 'uDt').value = dt
    uni<THREE.Vector4>(advectMaterial, 'uDissipation').value.copy(densityKeep)
    uni<THREE.Vector2>(advectMaterial, 'uWind').value.set(
      tune.windX,
      tune.windY,
    )
    uni<number>(advectMaterial, 'uWindWaver').value = tune.windWaver
    uni<number>(advectMaterial, 'uTime').value = elapsed
    blit(advectMaterial, density.write)
    swapPingPong(density)
  }

  function tick(now: number) {
    if (disposed) {
      return
    }
    if (paused) {
      frame = 0
      return
    }
    const elapsed = (now - startedAt) / 1000
    const dt = Math.min(0.033, Math.max(0.008, (now - lastNow) / 1000))
    lastNow = now
    const fade = skipIntro ? 1 : scoreSteamIntroFade(elapsed)

    step(dt, elapsed)

    uni<THREE.Texture | null>(displayMaterial, 'uDensity').value =
      density.read.texture
    uni<number>(displayMaterial, 'uFade').value = fade
    syncEmitterDisplay()
    uni<number>(displayMaterial, 'uWinner').value =
      scoreSteamWinnerUniform(currentWinner)
    uni<number>(displayMaterial, 'uTime').value = elapsed
    displayQuad.material = displayMaterial
    renderer.setRenderTarget(null)
    renderer.setClearColor(0x000000, 0)
    renderer.clear()
    renderer.render(displayScene, camera)

    frame = window.requestAnimationFrame(tick)
  }

  function onVisibility() {
    paused = document.hidden
    if (!paused && !frame && !disposed) {
      lastNow = performance.now()
      frame = window.requestAnimationFrame(tick)
    }
  }

  function setWinner(next: ScoreSteamWinner) {
    currentWinner = next
    uni<number>(displayMaterial, 'uWinner').value =
      scoreSteamWinnerUniform(next)
  }

  function setTune(next: Partial<ScoreSteamTune>) {
    const normalized = normalizeScoreSteamTune({
      ...tune,
      ...next,
      emitters: next.emitters ?? tune.emitters,
    })
    Object.assign(tune, normalized)
    uni<number>(buoyancyMaterial, 'uBuoyancy').value = tune.buoyancy
    uni<number>(displayMaterial, 'uMarginX').value = tune.viewMarginX
    uni<number>(displayMaterial, 'uMarginY').value = tune.viewMarginY
    syncEmitterDisplay()
  }

  document.addEventListener('visibilitychange', onVisibility)
  frame = window.requestAnimationFrame(tick)

  function dispose() {
    disposed = true
    if (frame) {
      window.cancelAnimationFrame(frame)
    }
    document.removeEventListener('visibilitychange', onVisibility)
    observer.disconnect()
    for (const material of materials) {
      material.dispose()
    }
    quad.geometry.dispose()
    displayQuad.geometry.dispose()
    for (const target of simTargets()) {
      target.dispose()
    }
    renderer.dispose()
  }

  return { setWinner, setTune, dispose }
}
