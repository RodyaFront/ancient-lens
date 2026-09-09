import * as THREE from 'three'

export type ScoreEmbersWinner = 'radiant' | 'dire'

export interface ScoreEmbersHandle {
  setWinner: (winner: ScoreEmbersWinner) => void
  dispose: () => void
}

export const SCORE_EMBERS_INTRO_DELAY = 1.72
export const SCORE_EMBERS_INTRO_FADE = 0.9
export const SCORE_EMBERS_FLAME_COUNT = 52
export const SCORE_EMBERS_SPARK_COUNT = 70
/** Left-column campfire in pre-aspect NDC (−1…1). */
export const SCORE_EMBERS_HEARTH_MIN_X = -1.06
export const SCORE_EMBERS_HEARTH_WIDTH = 0.62

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
  const flame = kind === 0
  const cols = flame ? 8 : 10
  const rows = Math.max(1, Math.ceil(count / cols))
  for (let index = 0; index < count; index++) {
    const col = index % cols
    const row = Math.floor(index / cols)
    const jitterX = ((index * 17) % 11) / 11
    const jitterY = ((index * 13) % 9) / 9
    const u = (col + jitterX) / cols
    const v = (row + jitterY) / rows
    const write = offset + index
    origins[write * 3] =
      SCORE_EMBERS_HEARTH_MIN_X + u * SCORE_EMBERS_HEARTH_WIDTH
    origins[write * 3 + 1] = -1.08 + v * 0.78
    origins[write * 3 + 2] = 0
    if (flame) {
      velocities[write * 3] = 0.035 + (index % 6) * 0.01
      velocities[write * 3 + 1] = 0.14 + (index % 5) * 0.022
      sizes[write] = 9 + (index % 5) * 1.6
      lives[write] = 2.5 + (index % 6) * 0.32
    } else {
      velocities[write * 3] = 0.045 + (index % 8) * 0.012
      velocities[write * 3 + 1] = 0.18 + (index % 7) * 0.024
      sizes[write] = 5.2 + (index % 5) * 0.9
      lives[write] = 2.9 + (index % 7) * 0.36
    }
    velocities[write * 3 + 2] = 0
    delays[write] = (index * 0.11) % (flame ? 1.6 : 2.2)
    seeds[write] = (index * 11.13 + kind * 4.7) % 20
    kinds[write] = kind
  }
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

  const hearthUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uWinner: { value: scoreEmbersWinnerUniform(winner) },
    uAspect: { value: 1 },
    /** UV origin; (0,0) = winner corner. Tunable via `--hearth-x` / `--hearth-y` on the canvas. */
    uOrigin: { value: new THREE.Vector2(0, 0) },
    /** Radial reach scale. Tunable via `--hearth-scale` on the canvas. */
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

      void main() {
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 team = mix(radiant, dire, uWinner);

        vec2 uv = vUv;
        uv.x = mix(uv.x, 1.0 - uv.x, uWinner);

        // uOrigin is in winner-local UV: (0,0) = winner corner after the flip above.
        vec2 center = uOrigin;
        float scale = max(0.05, uScale);
        vec2 p = (uv - center) * vec2(uAspect, 1.0) / scale;
        float r = length(p);

        float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
        float pulseSoft = pulse * pulse * (3.0 - 2.0 * pulse);
        float reach = 0.85 + pulseSoft * 0.12;
        float skirt = 1.0 - smoothstep(0.0, reach, r);
        skirt = pow(skirt, 1.45);

        float strength = skirt * (0.16 + pulseSoft * 0.06);
        vec3 color = mix(team, gold, 0.25) * strength;
        color *= uFade;
        gl_FragColor = vec4(color, min(1.0, length(color) * 1.35));
      }
    `,
  })

  const hearth = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hearthMaterial)
  hearth.frustumCulled = false
  scene.add(hearth)

  const count = SCORE_EMBERS_FLAME_COUNT + SCORE_EMBERS_SPARK_COUNT
  const origins = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const delays = new Float32Array(count)
  const sizes = new Float32Array(count)
  const seeds = new Float32Array(count)
  const lives = new Float32Array(count)
  const kinds = new Float32Array(count)

  fillHearth(
    0,
    SCORE_EMBERS_FLAME_COUNT,
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
    SCORE_EMBERS_SPARK_COUNT,
    origins,
    velocities,
    delays,
    sizes,
    seeds,
    lives,
    kinds,
    SCORE_EMBERS_FLAME_COUNT,
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
      varying vec2 vUv;

      void main() {
        float t = mod(uTime + aDelay, aLife);
        float age = t / aLife;
        float gust = 0.82 + 0.18 * sin(uTime * 0.45 + aSeed);
        // Soft birth, then linear fade for the rest of the path.
        vLife = smoothstep(0.0, 0.08, age) * (1.0 - age);
        vHot = 1.0 - age;
        vKind = aKind;
        vUv = uv;
        float flip = mix(1.0, -1.0, uWinner);
        vec2 wind = vec2(aVelocity.x * gust, aVelocity.y * gust);
        vec3 world = aOrigin;
        world.x = (aOrigin.x + wind.x * t) * uAspect * flip;
        world.y = aOrigin.y + wind.y * t;
        world.x += sin(uTime * 1.6 + aSeed + t * 2.2) * mix(0.018, 0.01, aKind) * uAspect * flip;
        world.y += sin(uTime * 1.2 + aSeed * 1.4) * mix(0.014, 0.008, aKind);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        // Equal pixel extent on X/Y — never use a single NDC scale (that makes ovals).
        float px = aSize * mix(0.88, 1.08, vHot) * vLife;
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
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - vec2(0.5);
        float d = length(p);
        if (d > 0.5) discard;
        float spark = smoothstep(0.5, 0.16, d);
        float core = smoothstep(0.2, 0.0, d);
        float flicker = 0.86 + 0.14 * sin(uTime * mix(2.4, 5.2, vKind) + vHot * 3.0);
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 white = vec3(1.0, 0.95, 0.74);
        vec3 team = mix(radiant, dire, uWinner);
        vec3 color = mix(team, gold, 0.16 + vHot * 0.28);
        color = mix(color, white, core * mix(0.35, 0.7, vKind));
        color *= spark * flicker * mix(0.4, 0.85, vKind) * (0.5 + vHot * 0.5);
        gl_FragColor = vec4(color, spark * vLife * uFade);
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
