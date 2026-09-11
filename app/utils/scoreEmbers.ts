/**
 * Winner-side hearth embers.
 *
 * Browser stand-in for Dota 2 / Source 2 particles (Panorama + .vpcf):
 * - Control Point 0 = hearth origin on the winning side
 * - Emitters seed coal / flame / spark pools
 * - Operators: lifetime loop, lift, noise turbulence, alpha + radius curves
 * - Renderer: additive soft sprites (procedural ember falloff)
 *
 * We cannot load Valve .vpcf here; this keeps the same operator model in WebGL.
 */

import * as THREE from 'three'

export type ScoreEmbersWinner = 'radiant' | 'dire'

export interface ScoreEmbersHandle {
  setWinner: (winner: ScoreEmbersWinner) => void
  dispose: () => void
}

/** Particle kind: 0 coal, 1 flame, 2 spark, 3 corner plume (~85° from winner corner). */
export type ScoreEmbersKind = 0 | 1 | 2 | 3

export const SCORE_EMBERS_INTRO_DELAY = 1.72
export const SCORE_EMBERS_INTRO_FADE = 0.9
export const SCORE_EMBERS_COAL_COUNT = 18
export const SCORE_EMBERS_FLAME_COUNT = 24
export const SCORE_EMBERS_SPARK_COUNT = 72
/** Extra emitter: spawns only at the winner-side bottom corner, flies ~85°. */
export const SCORE_EMBERS_CORNER_COUNT = 64
/** Left-column campfire in pre-aspect NDC (−1…1). Mirrored by uWinner. */
export const SCORE_EMBERS_HEARTH_MIN_X = -1.06
export const SCORE_EMBERS_HEARTH_WIDTH = 0.62
export const SCORE_EMBERS_CORNER_Y = -1.08
/** atan2(vy, vx) degrees - 90 is straight up; ~85 leans slightly outward. */
export const SCORE_EMBERS_CORNER_ANGLE_DEG = 85

export function scoreEmbersWinnerUniform(winner: ScoreEmbersWinner) {
  return winner === 'dire' ? 1 : 0
}

/** Map a screen UV.x into winner-local space (0 = winner corner edge). */
export function scoreEmbersLocalUvX(uvX: number, winner: ScoreEmbersWinner) {
  return winner === 'dire' ? 1 - uvX : uvX
}

export function scoreEmbersIntroFade(elapsedSec: number) {
  return Math.min(
    1,
    Math.max(
      0,
      (elapsedSec - SCORE_EMBERS_INTRO_DELAY) / SCORE_EMBERS_INTRO_FADE,
    ),
  )
}

/**
 * Initializer pass: Position Within Box + Velocity Random + Lifetime / Radius.
 * `kind`: 0 coal (bed), 1 flame (body), 2 spark (rising ash).
 * Corner plume (~85° from the winner corner) uses `fillCornerPlume`.
 */
export function fillHearth(
  kind: number,
  count: number,
  origins: Float32Array,
  velocities: Float32Array,
  delays: Float32Array,
  sizes: Float32Array,
  seeds: Float32Array,
  lives: Float32Array,
  kinds: Float32Array,
  offset: number,
) {
  const cols = kind === 2 ? 12 : kind === 1 ? 8 : 6
  const rows = Math.max(1, Math.ceil(count / cols))
  for (let index = 0; index < count; index++) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const jitterX = ((index * 17) % 11) / 11
    const jitterY = ((index * 13) % 9) / 9
    const u = (col + jitterX) / cols
    const v = (row + jitterY) / rows
    const write = offset + index
    // CP0 box: wide bed, denser near the floor for coals.
    const floorBias = kind === 0 ? v * v * 0.55 : v * 0.85
    origins[write * 3] =
      SCORE_EMBERS_HEARTH_MIN_X + u * SCORE_EMBERS_HEARTH_WIDTH
    origins[write * 3 + 1] = -1.08 + floorBias * (kind === 0 ? 0.42 : 0.78)
    origins[write * 3 + 2] = 0

    if (kind === 0) {
      // Coal: short hop, mostly idle smolder on the bed.
      velocities[write * 3] = 0.012 + (index % 5) * 0.004
      velocities[write * 3 + 1] = 0.04 + (index % 4) * 0.01
      sizes[write] = 11 + (index % 5) * 2.1
      lives[write] = 3.2 + (index % 5) * 0.4
      delays[write] = (index * 0.17) % 2.8
    } else if (kind === 1) {
      // Flame body: slower lift, larger soft sprites.
      velocities[write * 3] = 0.03 + (index % 6) * 0.01
      velocities[write * 3 + 1] = 0.12 + (index % 5) * 0.02
      sizes[write] = 10 + (index % 5) * 1.8
      lives[write] = 2.2 + (index % 6) * 0.28
      delays[write] = (index * 0.11) % 1.8
    } else {
      // Spark / ash: faster rise, smaller, longer streak feel via life.
      velocities[write * 3] = 0.05 + (index % 8) * 0.014
      velocities[write * 3 + 1] = 0.2 + (index % 7) * 0.028
      sizes[write] = 4.2 + (index % 5) * 0.85
      lives[write] = 2.6 + (index % 7) * 0.34
      delays[write] = (index * 0.09) % 2.4
    }
    velocities[write * 3 + 2] = 0
    seeds[write] = (index * 11.13 + kind * 4.7) % 20
    kinds[write] = kind
  }
}

/**
 * Corner plume emitter across the winner hearth bed.
 * Speed in velocity.x; angle jitter degrees in velocity.y.
 * Base heading is winner-aware in the shader (Radiant ~85°, Dire ~95°).
 */
export function fillCornerPlume(
  count: number,
  origins: Float32Array,
  velocities: Float32Array,
  delays: Float32Array,
  sizes: Float32Array,
  seeds: Float32Array,
  lives: Float32Array,
  kinds: Float32Array,
  offset: number,
) {
  const cols = 8
  const rows = Math.max(1, Math.ceil(count / cols))
  for (let index = 0; index < count; index++) {
    const write = offset + index
    const col = index % cols
    const row = Math.floor(index / cols)
    const jitterX = ((index * 19) % 10) / 10
    const jitterY = ((index * 23) % 8) / 8
    const u = (col + jitterX) / cols
    const v = (row + jitterY) / rows
    // Same CP0 column as the hearth bed, denser near the floor.
    origins[write * 3] =
      SCORE_EMBERS_HEARTH_MIN_X + u * SCORE_EMBERS_HEARTH_WIDTH
    origins[write * 3 + 1] = SCORE_EMBERS_CORNER_Y + v * v * 0.62
    origins[write * 3 + 2] = 0

    // Speed + per-particle angle jitter (degrees) for spark-like spread.
    const speed = 0.36 + (index % 6) * 0.04
    const angleJitter = ((index % 9) - 4) * 2.8
    velocities[write * 3] = speed
    velocities[write * 3 + 1] = angleJitter
    velocities[write * 3 + 2] = 0

    sizes[write] = 4.5 + (index % 4) * 0.55
    lives[write] = 4.2 + (index % 5) * 0.4
    delays[write] = (index * 0.08) % 2.2
    seeds[write] = (index * 13.7 + 3.1) % 20
    kinds[write] = 3
  }
}

/** Screen-space flight angle for the corner plume (outward lean from vertical). */
export function scoreEmbersCornerScreenAngleDeg(
  winner: ScoreEmbersWinner,
  radiantDeg: number = SCORE_EMBERS_CORNER_ANGLE_DEG,
) {
  // Radiant left: radiantDeg. Dire right: mirrored across vertical (180 - deg).
  return winner === 'radiant' ? radiantDeg : 180 - radiantDeg
}

export function scoreEmbersVelocityAngleDeg(vx: number, vy: number) {
  return (Math.atan2(vy, vx) * 180) / Math.PI
}

export function createScoreEmbers(
  canvas: HTMLCanvasElement,
  winner: ScoreEmbersWinner,
): ScoreEmbersHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  // Soft radiance at CP0 - like a child "glow" system under the particle bed.
  const hearthUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uWinner: { value: scoreEmbersWinnerUniform(winner) },
    uAspect: { value: 1 },
    uOrigin: { value: new THREE.Vector2(0, 0) },
    uScale: { value: 4 },
  }

  const hearthMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: hearthUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFade;
      uniform float uWinner;
      uniform float uAspect;
      uniform vec2 uOrigin;
      uniform float uScale;
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
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 team = mix(radiant, dire, uWinner);

        vec2 uv = vUv;
        uv.x = mix(uv.x, 1.0 - uv.x, uWinner);

        vec2 center = uOrigin;
        float scale = max(0.05, uScale);
        vec2 p = (uv - center) * vec2(uAspect, 1.0) / scale;
        // Stretch glow into a hearth plume, not a perfect disc.
        p.y *= 1.35;
        p.x *= 0.85;
        float r = length(p);

        float n = noise(p * 3.2 + vec2(uTime * 0.35, uTime * 0.22));
        float n2 = noise(p * 6.0 - vec2(uTime * 0.55, -uTime * 0.18));
        float pulse = 0.5 + 0.5 * sin(uTime * 0.55 + n * 2.0);
        float pulseSoft = pulse * pulse * (3.0 - 2.0 * pulse);
        float reach = 0.95 + pulseSoft * 0.2 + n * 0.1;
        float skirt = 1.0 - smoothstep(0.0, reach, r);
        skirt = pow(skirt, 1.25);
        skirt *= 0.8 + n * 0.4 + n2 * 0.2;

        float strength = skirt * (0.16 + pulseSoft * 0.08);
        vec3 color = mix(team, gold, 0.12 + n * 0.06) * strength;
        color *= uFade;
        gl_FragColor = vec4(color, min(1.0, length(color) * 1.55));
      }
    `,
  })

  const hearth = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hearthMaterial)
  hearth.frustumCulled = false
  scene.add(hearth)

  const count =
    SCORE_EMBERS_COAL_COUNT +
    SCORE_EMBERS_FLAME_COUNT +
    SCORE_EMBERS_SPARK_COUNT +
    SCORE_EMBERS_CORNER_COUNT
  const origins = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const delays = new Float32Array(count)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const lives = new Float32Array(count)
  const kinds = new Float32Array(count)

  fillHearth(
    0,
    SCORE_EMBERS_COAL_COUNT,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    0,
  )
  fillHearth(
    1,
    SCORE_EMBERS_FLAME_COUNT,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    SCORE_EMBERS_COAL_COUNT,
  )
  fillHearth(
    2,
    SCORE_EMBERS_SPARK_COUNT,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    SCORE_EMBERS_COAL_COUNT + SCORE_EMBERS_FLAME_COUNT,
  )
  fillCornerPlume(
    SCORE_EMBERS_CORNER_COUNT,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    SCORE_EMBERS_COAL_COUNT +
      SCORE_EMBERS_FLAME_COUNT +
      SCORE_EMBERS_SPARK_COUNT,
  )

  const quad = new THREE.PlaneGeometry(1, 1)
  const geometry = new THREE.InstancedBufferGeometry()
  geometry.index = quad.index
  geometry.setAttribute(
    'position',
    quad.getAttribute('position') as THREE.BufferAttribute,
  )
  geometry.setAttribute('uv', quad.getAttribute('uv') as THREE.BufferAttribute)
  geometry.setAttribute(
    'aOrigin',
    new THREE.InstancedBufferAttribute(origins, 3),
  )
  geometry.setAttribute(
    'aVelocity',
    new THREE.InstancedBufferAttribute(velocities, 3),
  )
  geometry.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delays, 1))
  geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sizes, 1))
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  geometry.setAttribute('aLife', new THREE.InstancedBufferAttribute(lives, 1))
  geometry.setAttribute('aKind', new THREE.InstancedBufferAttribute(kinds, 1))
  geometry.instanceCount = count

  const emberUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uWinner: { value: scoreEmbersWinnerUniform(winner) },
    uAspect: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  }

  const cornerAngleRadiant = SCORE_EMBERS_CORNER_ANGLE_DEG.toFixed(1)
  const cornerAngleDire = (180 - SCORE_EMBERS_CORNER_ANGLE_DEG).toFixed(1)

  const emberMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: emberUniforms,
    vertexShader: `
      attribute vec3 aOrigin;
      attribute vec3 aVelocity;
      attribute float aDelay;
      attribute float aSize;
      attribute float aSeed;
      attribute float aLife;
      attribute float aKind;
      uniform float uTime;
      uniform float uWinner;
      uniform float uAspect;
      uniform vec2 uResolution;
      varying float vLife;
      varying float vHot;
      varying float vKind;
      varying float vSeed;
      varying vec2 vUv;

      void main() {
        // Continuous emitter: particles recycle on lifetime (Source loop).
        float t = mod(uTime + aDelay, aLife);
        float age = t / aLife;
        float isCorner = step(2.5, aKind);
        // Bed: soft birth. Corner: stay invisible until mid-path, then reveal.
        float fadeIn = mix(
          smoothstep(0.0, 0.12, age),
          smoothstep(0.42, 0.58, age),
          isCorner
        );
        float fadeOut = mix(
          1.0 - smoothstep(0.55, 1.0, age),
          1.0 - smoothstep(0.78, 1.0, age),
          isCorner
        );
        vLife = fadeIn * fadeOut;
        vHot = 1.0 - age;
        vKind = aKind;
        vSeed = aSeed;
        vUv = uv;

        float flip = mix(1.0, -1.0, uWinner);
        // Movement Basic + Noise force (turbulence toward plume top).
        float gust = 0.78 + 0.22 * sin(uTime * 0.4 + aSeed);
        // Corner shares spark-like turbulence (was muted before).
        float turbAmp = mix(mix(0.012, 0.028, aKind), 0.03, isCorner);
        float turbX = sin(uTime * 1.7 + aSeed + t * 2.4) * turbAmp;
        float turbY = sin(uTime * 1.15 + aSeed * 1.3) * mix(0.008, mix(0.018, 0.022, isCorner), step(0.5, aKind));
        // Extra flutter for corner so flight reads as lively as sparks.
        float flutter = sin(uTime * 3.1 + aSeed * 2.0 + t * 4.2) * 0.016 * isCorner;
        float liftScale = mix(0.35, mix(1.0, mix(1.35, 1.25, isCorner), step(1.5, aKind)), step(0.5, aKind));

        // Corner: Radiant ${cornerAngleRadiant}°, Dire ${cornerAngleDire}° (+ per-particle jitter).
        // Multiply X by uAspect so ortho projection (x / aspect) does not squash the angle.
        float cornerDeg = mix(${cornerAngleRadiant}, ${cornerAngleDire}, uWinner) + aVelocity.y;
        float cornerRad = radians(cornerDeg);
        vec2 cornerDir = vec2(cos(cornerRad), sin(cornerRad));
        float cornerSpeed = aVelocity.x;
        vec2 cornerMoved = cornerDir * cornerSpeed * gust * t * liftScale;

        vec2 bedMoved = aVelocity.xy * gust * t * liftScale;
        vec3 world = aOrigin;
        world.x = mix(
          (aOrigin.x + bedMoved.x + turbX) * uAspect * flip,
          (aOrigin.x * flip + cornerMoved.x + turbX + flutter) * uAspect,
          isCorner
        );
        world.y = aOrigin.y + mix(bedMoved.y, cornerMoved.y, isCorner) + turbY;

        vec4 clip = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        // Radius Scale over life: grow then shrink.
        float radiusCurve = mix(0.75, 1.2, vHot) * mix(1.0, 0.55, smoothstep(0.65, 1.0, age));
        float kindScale = mix(1.15, mix(1.0, 0.72, step(1.5, aKind)), step(0.5, aKind));
        float px = aSize * radiusCurve * kindScale * max(0.15, vLife);
        vec2 ndc = vec2(px / uResolution.x, px / uResolution.y) * 2.0;
        clip.xy += position.xy * ndc;
        gl_Position = clip;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFade;
      uniform float uWinner;
      varying float vLife;
      varying float vHot;
      varying float vKind;
      varying float vSeed;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec2 p = vUv - vec2(0.5);
        float d = length(p);
        if (d > 0.5) discard;

        // Procedural ember sprite (stand-in for .vtex particle texture).
        float n = hash(p * 8.0 + vSeed);
        float n2 = hash(p * 14.0 - vSeed * 0.7 + uTime * 0.05);
        float soft = smoothstep(0.5, 0.08, d);
        float lobe = soft * (0.7 + n * 0.35 + n2 * 0.2);
        float core = smoothstep(0.28, 0.0, d) * (0.85 + n * 0.2);
        float flicker = 0.82 + 0.18 * sin(uTime * mix(1.8, 5.5, vKind) + vHot * 3.2 + vSeed);

        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 white = vec3(1.0, 0.95, 0.74);
        vec3 cool = vec3(0.25, 0.12, 0.06);
        vec3 team = mix(radiant, dire, uWinner);
        float isCorner = step(2.5, vKind);

        // Color over life: white-hot → team/gold → dark coal.
        vec3 color = mix(cool, team, 0.55 + vHot * 0.45);
        color = mix(color, gold, 0.12 + vHot * 0.35);
        color = mix(color, white, core * mix(0.25, 0.75, vKind) * vHot);
        // Sparks stay hotter; coals stay denser and dimmer.
        float kindGain = mix(0.55, mix(0.75, mix(1.05, 1.5, isCorner), step(1.5, vKind)), step(0.5, vKind));
        color *= lobe * flicker * kindGain * (0.45 + vHot * 0.55);

        gl_FragColor = vec4(color, lobe * vLife * uFade * mix(0.85, 1.0, vKind));
      }
    `,
  })

  const embers = new THREE.Mesh(geometry, emberMaterial)
  embers.frustumCulled = false
  scene.add(embers)

  let frame = 0
  let disposed = false
  let paused = document.hidden
  const startedAt = performance.now()

  function syncHearthParams() {
    const style = getComputedStyle(canvas)
    const x = Number.parseFloat(style.getPropertyValue('--hearth-x')) || 0
    const y = Number.parseFloat(style.getPropertyValue('--hearth-y')) || 0
    const scale = Number.parseFloat(style.getPropertyValue('--hearth-scale'))
    hearthUniforms.uOrigin.value.set(x, y)
    hearthUniforms.uScale.value =
      Number.isFinite(scale) && scale > 0 ? scale : 4
  }

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    const aspect = width / height
    camera.left = -aspect
    camera.right = aspect
    camera.updateProjectionMatrix()
    hearthUniforms.uAspect.value = aspect
    emberUniforms.uAspect.value = aspect
    emberUniforms.uResolution.value.set(width, height)
    syncHearthParams()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function tick(now: number) {
    if (disposed) {
      return
    }
    if (paused) {
      frame = 0
      return
    }
    const elapsed = (now - startedAt) / 1000
    const fade = scoreEmbersIntroFade(elapsed)
    syncHearthParams()
    hearthUniforms.uTime.value = elapsed
    hearthUniforms.uFade.value = fade
    emberUniforms.uTime.value = elapsed
    emberUniforms.uFade.value = fade
    renderer.render(scene, camera)
    frame = window.requestAnimationFrame(tick)
  }

  function onVisibility() {
    paused = document.hidden
    if (!paused && !frame && !disposed) {
      frame = window.requestAnimationFrame(tick)
    }
  }

  function setWinner(next: ScoreEmbersWinner) {
    const value = scoreEmbersWinnerUniform(next)
    hearthUniforms.uWinner.value = value
    emberUniforms.uWinner.value = value
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
    hearth.geometry.dispose()
    hearthMaterial.dispose()
    geometry.dispose()
    emberMaterial.dispose()
    renderer.dispose()
  }

  return { setWinner, dispose }
}
