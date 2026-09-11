import * as THREE from 'three'

export type ScoreVfxWinner = 'radiant' | 'dire'

export interface ScoreVfxHandle {
  play: (winner: ScoreVfxWinner) => void
  dispose: () => void
}

export const SCORE_VFX_DURATION_MS = 2200
export const SCORE_VFX_IMPACT_AT = 0.16
export const SCORE_VFX_IMPACT_END = 0.78
const SPARK_COUNT = 56

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function easeOutQuart(value: number) {
  const t = clamp01(value)
  return 1 - (1 - t) ** 4
}

function range(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start))
}

function pulse(elapsed: number, peak: number, width: number) {
  const x = (elapsed - peak) / width
  return Math.exp(-x * x * 2.2)
}

export function scoreVfxWinnerUniform(winner: ScoreVfxWinner) {
  return winner === 'dire' ? 1 : 0
}

export function scoreVfxPunch(elapsedSec: number) {
  return {
    flash: pulse(elapsedSec, 0.12, 0.055),
    scan: easeOutQuart(range(elapsedSec, 0.05, 0.42)),
    impact: range(elapsedSec, SCORE_VFX_IMPACT_AT, SCORE_VFX_IMPACT_END),
    field: easeOutQuart(range(elapsedSec, 0.1, 0.7)),
    fade: 1 - range(elapsedSec, 1.28, 2.2),
  }
}

export function createScoreVfx(canvas: HTMLCanvasElement): ScoreVfxHandle {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  camera.position.z = 1

  const overlayUniforms = {
    uWinner: { value: 0 },
    uAspect: { value: 1 },
    uFlash: { value: 0 },
    uScan: { value: 0 },
    uImpact: { value: 0 },
    uField: { value: 0 },
    uFade: { value: 0 },
  }

  const overlayMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: overlayUniforms,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uWinner;
      uniform float uAspect;
      uniform float uFlash;
      uniform float uScan;
      uniform float uImpact;
      uniform float uField;
      uniform float uFade;
      varying vec2 vUv;

      void main() {
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.94, 0.82, 0.48);
        vec3 white = vec3(1.0, 0.97, 0.88);
        vec3 win = mix(radiant, dire, uWinner);
        vec3 lose = mix(dire, radiant, uWinner);
        vec2 uv = vUv;
        vec2 centered = uv - vec2(0.5);
        float band = 1.0 - smoothstep(0.12, 0.78, abs(uv.y - 0.5) * 2.0);
        vec3 color = vec3(0.0);

        float winnerAxis = mix(1.0 - uv.x, uv.x, uWinner);
        float loserAxis = 1.0 - winnerAxis;
        color += win * pow(winnerAxis, 1.15) * band * uField * 0.95;
        color += lose * pow(loserAxis, 1.45) * band * uField * 0.22;
        color += gold * pow(winnerAxis, 2.2) * band * uField * 0.28;

        float flashCore = exp(-length(centered * vec2(1.05, 2.35)) * 2.2);
        color += white * flashCore * uFlash * 2.35;
        color += win * flashCore * uFlash * 0.85;

        float x = mix(uv.x, 1.0 - uv.x, uWinner);
        float scanPos = mix(-0.12, 1.12, uScan);
        float slash = exp(-pow((x - scanPos) * 16.0, 2.0));
        float trail = smoothstep(scanPos + 0.05, scanPos - 0.5, x)
          * (1.0 - smoothstep(scanPos - 0.58, scanPos, x));
        float scanGate = smoothstep(0.0, 0.04, uScan) * (1.0 - smoothstep(0.78, 1.0, uScan));
        color += (white * 1.35 + gold * 0.8) * slash * scanGate * band;
        color += win * trail * scanGate * 0.72;

        float ang = atan(centered.y, centered.x * uAspect);
        float rays = pow(abs(sin(ang * 5.0)), 18.0);
        float rayGate = uImpact * (1.0 - uImpact) * 2.4;
        color += (white * 0.45 + gold * 0.4) * rays * rayGate * band;

        color *= uFade;
        gl_FragColor = vec4(color, min(1.0, length(color) * 1.05));
      }
    `,
  })

  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial)
  overlay.frustumCulled = false
  scene.add(overlay)

  const origins = new Float32Array(SPARK_COUNT * 3)
  const velocities = new Float32Array(SPARK_COUNT * 3)
  const delays = new Float32Array(SPARK_COUNT)
  const sizes = new Float32Array(SPARK_COUNT)
  const lives = new Float32Array(SPARK_COUNT)
  const tones = new Float32Array(SPARK_COUNT)

  for (let index = 0; index < SPARK_COUNT; index++) {
    const angle = (index / SPARK_COUNT) * Math.PI * 2 + (index % 5) * 0.11
    const spread = 0.02 + (index % 6) * 0.006
    origins[index * 3] = Math.cos(angle) * spread
    origins[index * 3 + 1] = Math.sin(angle) * spread * 0.55
    origins[index * 3 + 2] = 0
    const speed = 0.34 + (index % 7) * 0.05
    velocities[index * 3] = Math.cos(angle) * speed
    velocities[index * 3 + 1] = Math.sin(angle) * speed * 0.62
    velocities[index * 3 + 2] = 0
    delays[index] = SCORE_VFX_IMPACT_AT + (index % 10) * 0.01
    sizes[index] = 8 + (index % 5) * 1.8
    lives[index] = 0.5 + (index % 6) * 0.07
    tones[index] = index % 3 === 0 ? 1 : 0
  }

  const quad = new THREE.PlaneGeometry(1, 1)
  const sparkGeometry = new THREE.InstancedBufferGeometry()
  sparkGeometry.index = quad.index
  sparkGeometry.setAttribute(
    'position',
    quad.getAttribute('position') as THREE.BufferAttribute,
  )
  sparkGeometry.setAttribute(
    'uv',
    quad.getAttribute('uv') as THREE.BufferAttribute,
  )
  sparkGeometry.setAttribute(
    'aOrigin',
    new THREE.InstancedBufferAttribute(origins, 3),
  )
  sparkGeometry.setAttribute(
    'aVelocity',
    new THREE.InstancedBufferAttribute(velocities, 3),
  )
  sparkGeometry.setAttribute(
    'aDelay',
    new THREE.InstancedBufferAttribute(delays, 1),
  )
  sparkGeometry.setAttribute(
    'aSize',
    new THREE.InstancedBufferAttribute(sizes, 1),
  )
  sparkGeometry.setAttribute(
    'aLife',
    new THREE.InstancedBufferAttribute(lives, 1),
  )
  sparkGeometry.setAttribute(
    'aTone',
    new THREE.InstancedBufferAttribute(tones, 1),
  )
  sparkGeometry.instanceCount = SPARK_COUNT

  const sparkUniforms = {
    uTime: { value: 0 },
    uWinner: { value: 0 },
    uFade: { value: 0 },
    uAspect: { value: 1 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  }

  const sparkMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: sparkUniforms,
    vertexShader: `
      attribute vec3 aOrigin;
      attribute vec3 aVelocity;
      attribute float aDelay;
      attribute float aSize;
      attribute float aLife;
      attribute float aTone;
      uniform float uTime;
      uniform float uAspect;
      uniform vec2 uResolution;
      varying float vLife;
      varying float vTone;
      varying vec2 vUv;

      void main() {
        float t = max(0.0, uTime - aDelay);
        float age = t / aLife;
        vLife = step(0.0, t) * smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(0.4, 1.0, age));
        vTone = aTone;
        vUv = uv;
        vec3 world = aOrigin;
        world.x = (aOrigin.x + aVelocity.x * t) * uAspect;
        world.y = aOrigin.y + aVelocity.y * t;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        vec2 ndc = (aSize * (0.75 + vLife * 0.4)) / uResolution * 2.0;
        clip.xy += position.xy * ndc;
        gl_Position = clip;
      }
    `,
    fragmentShader: `
      uniform float uWinner;
      uniform float uFade;
      varying float vLife;
      varying float vTone;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - vec2(0.5);
        float d = length(p);
        if (d > 0.5) discard;
        float spark = smoothstep(0.5, 0.14, d);
        float core = smoothstep(0.18, 0.0, d);
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.94, 0.82, 0.48);
        vec3 white = vec3(1.0, 0.96, 0.8);
        vec3 win = mix(radiant, dire, uWinner);
        vec3 color = mix(win, gold, vTone);
        color = mix(color, white, core);
        gl_FragColor = vec4(color * spark, spark * vLife * uFade);
      }
    `,
  })

  const sparks = new THREE.Mesh(sparkGeometry, sparkMaterial)
  sparks.frustumCulled = false
  scene.add(sparks)

  let frame = 0
  let playing = false
  let startedAt = 0
  let disposed = false

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    const aspect = width / height
    camera.left = -aspect
    camera.right = aspect
    camera.updateProjectionMatrix()
    overlayUniforms.uAspect.value = aspect
    sparkUniforms.uAspect.value = aspect
    sparkUniforms.uResolution.value.set(width, height)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function tick(now: number) {
    if (disposed) {
      return
    }

    const elapsed = (now - startedAt) / 1000
    const punch = scoreVfxPunch(elapsed)
    overlayUniforms.uFlash.value = punch.flash
    overlayUniforms.uScan.value = punch.scan
    overlayUniforms.uImpact.value = punch.impact
    overlayUniforms.uField.value = punch.field
    overlayUniforms.uFade.value = punch.fade
    sparkUniforms.uTime.value = elapsed
    sparkUniforms.uFade.value = overlayUniforms.uFade.value

    renderer.render(scene, camera)

    if (playing && now - startedAt < SCORE_VFX_DURATION_MS) {
      frame = window.requestAnimationFrame(tick)
      return
    }

    playing = false
    overlayUniforms.uFade.value = 0
    sparkUniforms.uFade.value = 0
    renderer.render(scene, camera)
    frame = 0
  }

  function play(winner: ScoreVfxWinner) {
    if (disposed) {
      return
    }

    overlayUniforms.uWinner.value = scoreVfxWinnerUniform(winner)
    sparkUniforms.uWinner.value = overlayUniforms.uWinner.value
    startedAt = performance.now()
    playing = true
    if (!frame) {
      frame = window.requestAnimationFrame(tick)
    }
  }

  function dispose() {
    disposed = true
    playing = false
    if (frame) {
      window.cancelAnimationFrame(frame)
    }
    observer.disconnect()
    overlay.geometry.dispose()
    overlayMaterial.dispose()
    sparkGeometry.dispose()
    sparkMaterial.dispose()
    renderer.dispose()
  }

  return { play, dispose }
}
