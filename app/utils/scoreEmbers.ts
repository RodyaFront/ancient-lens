import * as THREE from 'three'

export interface ScoreEmbersHandle {
  dispose: () => void
}

const INTRO_DELAY = 1.72
const INTRO_FADE = 0.9
const FLAME_PER_SIDE = 28
const SPARK_PER_SIDE = 40

function fillHearth(
  kind: number,
  countPerSide: number,
  origins: Float32Array,
  velocities: Float32Array,
  delays: Float32Array,
  sizes: Float32Array,
  sides: Float32Array,
  seeds: Float32Array,
  lives: Float32Array,
  kinds: Float32Array,
  offset: number,
) {
  const flame = kind === 0
  for (let index = 0; index < countPerSide * 2; index++) {
    const slot = index % countPerSide
    const radiant = index < countPerSide
    const cols = flame ? 8 : 9
    const col = slot % cols
    const row = Math.floor(slot / cols)
    const jitterX = ((slot * 17) % 11) / 11
    const jitterY = ((slot * 13) % 9) / 9
    const u = (col + jitterX) / cols
    const v = (row + jitterY) / Math.max(1, Math.ceil(countPerSide / cols))
    const write = offset + index
    const inward = radiant ? 1 : -1
    origins[write * 3] = inward * (-1.14 + u * 0.38)
    origins[write * 3 + 1] = -1.22 + v * 0.42
    origins[write * 3 + 2] = 0
    if (flame) {
      velocities[write * 3] = inward * (0.04 + (slot % 6) * 0.01)
      velocities[write * 3 + 1] = 0.12 + (slot % 5) * 0.018
      sizes[write] = 8 + (slot % 5) * 1.4
      lives[write] = 2.4 + (slot % 6) * 0.35
    } else {
      velocities[write * 3] = inward * (0.055 + (slot % 8) * 0.01)
      velocities[write * 3 + 1] = 0.13 + (slot % 7) * 0.016
      sizes[write] = 5 + (slot % 5) * 0.8
      lives[write] = 2.9 + (slot % 7) * 0.4
    }
    velocities[write * 3 + 2] = 0
    delays[write] = (slot * 0.11) % (flame ? 1.4 : 2.1)
    sides[write] = radiant ? 0 : 1
    seeds[write] = (slot * 11.13 + kind * 4.7) % 20
    kinds[write] = kind
  }
}

export function createScoreEmbers(
  canvas: HTMLCanvasElement,
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
    uAspect: { value: 1 },
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
      uniform float uAspect;
      varying vec2 vUv;

      void main() {
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 color = vec3(0.0);
        float flicker =
          0.84 +
          0.16 * sin(uTime * 3.2) * sin(uTime * 1.7 + 1.7);

        vec2 left = vUv - vec2(0.0, 0.04);
        left.x *= uAspect;
        float leftShape = exp(-length(left) * 5.4);
        float leftNoise = 0.7 + 0.3 * sin(vUv.y * 22.0 - uTime * 2.4 + vUv.x * 14.0);
        color += (radiant * 0.8 + gold * 0.2) * leftShape * leftNoise * flicker;

        vec2 right = vUv - vec2(1.0, 0.04);
        right.x *= uAspect;
        float rightShape = exp(-length(right) * 5.4);
        float rightNoise = 0.7 + 0.3 * sin(vUv.y * 20.0 - uTime * 2.2 - vUv.x * 13.0);
        color += (dire * 0.8 + gold * 0.18) * rightShape * rightNoise * flicker;

        color *= uFade;
        gl_FragColor = vec4(color, min(1.0, length(color)));
      }
    `,
  })

  const hearth = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), hearthMaterial)
  hearth.frustumCulled = false
  scene.add(hearth)

  const count = (FLAME_PER_SIDE + SPARK_PER_SIDE) * 2
  const origins = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const delays = new Float32Array(count)
  const sizes = new Float32Array(count)
  const sides = new Float32Array(count)
  const seeds = new Float32Array(count)
  const lives = new Float32Array(count)
  const kinds = new Float32Array(count)

  fillHearth(
    0,
    FLAME_PER_SIDE,
    origins,
    velocities,
    delays,
    sizes,
    sides,
    seeds,
    lives,
    kinds,
    0,
  )
  fillHearth(
    1,
    SPARK_PER_SIDE,
    origins,
    velocities,
    delays,
    sizes,
    sides,
    seeds,
    lives,
    kinds,
    FLAME_PER_SIDE * 2,
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
  geometry.setAttribute('aSide', new THREE.InstancedBufferAttribute(sides, 1))
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
  geometry.setAttribute('aLife', new THREE.InstancedBufferAttribute(lives, 1))
  geometry.setAttribute('aKind', new THREE.InstancedBufferAttribute(kinds, 1))
  geometry.instanceCount = count

  const emberUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
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
      attribute float aSide;
      attribute float aSeed;
      attribute float aLife;
      attribute float aKind;
      uniform float uTime;
      uniform float uAspect;
      uniform vec2 uResolution;
      varying float vLife;
      varying float vSide;
      varying float vHot;
      varying float vKind;
      varying vec2 vUv;

      void main() {
        float t = mod(uTime + aDelay, aLife);
        float age = t / aLife;
        float gust = 0.82 + 0.18 * sin(uTime * 0.45 + aSide * 2.2 + aSeed);
        vLife = smoothstep(0.0, 0.16, age) * (1.0 - smoothstep(0.62, 1.0, age));
        vSide = aSide;
        vHot = 1.0 - age;
        vKind = aKind;
        vUv = uv;
        vec2 wind = vec2(aVelocity.x * gust, aVelocity.y * gust);
        vec3 world = aOrigin;
        world.x = (aOrigin.x + wind.x * t) * uAspect;
        world.y = aOrigin.y + wind.y * t;
        world.x += sin(uTime * 1.6 + aSeed + t * 2.2) * mix(0.016, 0.008, aKind) * uAspect;
        world.y += sin(uTime * 1.2 + aSeed * 1.4) * mix(0.012, 0.006, aKind);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        vec2 ndc = (aSize * mix(0.82, 1.05, vHot) * vLife) / uResolution * 2.0;
        clip.xy += position.xy * ndc;
        gl_Position = clip;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uFade;
      varying float vLife;
      varying float vSide;
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
        vec3 team = mix(radiant, dire, vSide);
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

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    const aspect = width / height
    camera.left = -aspect
    camera.right = aspect
    camera.updateProjectionMatrix()
    emberUniforms.uAspect.value = aspect
    emberUniforms.uResolution.value.set(width, height)
    hearthUniforms.uAspect.value = aspect
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function introFade(elapsed: number) {
    return Math.min(1, Math.max(0, (elapsed - INTRO_DELAY) / INTRO_FADE))
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
    const fade = introFade(elapsed)
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

  return { dispose }
}
