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
  dispose: () => void
}

export const SCORE_STEAM_SIM_SIZE = 256
export const SCORE_STEAM_INTRO_DELAY = SCORE_EMBERS_INTRO_DELAY
export const SCORE_STEAM_INTRO_FADE = SCORE_EMBERS_INTRO_FADE
export const SCORE_STEAM_PRESSURE_ITERATIONS = 16

export function scoreSteamWinnerUniform(winner: ScoreSteamWinner) {
  return scoreEmbersWinnerUniform(winner)
}

export function scoreSteamIntroFade(elapsedSec: number) {
  return scoreEmbersIntroFade(elapsedSec)
}

/** Inject UV in sim space for the winner bottom corner. */
export function scoreSteamInjectUv(winner: ScoreSteamWinner): {
  x: number
  y: number
} {
  return winner === 'dire' ? { x: 0.92, y: 0.08 } : { x: 0.08, y: 0.08 }
}

type PingPong = {
  read: THREE.WebGLRenderTarget
  write: THREE.WebGLRenderTarget
}

function makeTarget(size: number) {
  return new THREE.WebGLRenderTarget(size, size, {
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

function makePingPong(size: number): PingPong {
  return { read: makeTarget(size), write: makeTarget(size) }
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

export function createScoreSteam(
  canvas: HTMLCanvasElement,
  winner: ScoreSteamWinner,
): ScoreSteamHandle {
  const size = SCORE_STEAM_SIM_SIZE
  const texel = 1 / size

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

  const velocity = makePingPong(size)
  const density = makePingPong(size)
  const pressure = makePingPong(size)
  const divergence = makeTarget(size)
  const curl = makeTarget(size)

  const common = {
    uTexel: { value: new THREE.Vector2(texel, texel) },
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
      uniform vec3 uColor;
      uniform float uRadius;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv - uPoint.xy;
        p.x *= uAspect;
        float falloff = exp(-dot(p, p) / max(1e-5, uRadius));
        vec4 base = texture2D(uTarget, vUv);
        gl_FragColor = base + vec4(uColor * falloff, 0.0);
      }
    `,
    {
      uTarget: { value: null as THREE.Texture | null },
      uAspect: { value: 1 },
      uPoint: { value: new THREE.Vector3() },
      uColor: { value: new THREE.Vector3() },
      uRadius: { value: 0.012 },
    },
  )

  const advectMaterial = passMaterial(
    /* glsl */ `
      uniform sampler2D uVelocity;
      uniform sampler2D uSource;
      uniform float uDt;
      uniform float uDissipation;
      varying vec2 vUv;
      void main() {
        vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * 0.25;
        gl_FragColor = uDissipation * texture2D(uSource, coord);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uSource: { value: null as THREE.Texture | null },
      uDt: { value: 0.016 },
      uDissipation: { value: 0.98 },
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
        gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uCurl: { value: null as THREE.Texture | null },
      uCurlForce: { value: 28 },
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
        float d = texture2D(uDensity, vUv).x;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        float swirl = sin(vUv.y * 18.0 + uTime * 1.4) * cos(vUv.x * 14.0 - uTime * 0.9);
        vel.y += d * uBuoyancy * uDt;
        vel.x += d * swirl * 0.35 * uDt;
        gl_FragColor = vec4(vel, 0.0, 1.0);
      }
    `,
    {
      uVelocity: { value: null as THREE.Texture | null },
      uDensity: { value: null as THREE.Texture | null },
      uBuoyancy: { value: 6.5 },
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
      varying vec2 vUv;

      void main() {
        float d = texture2D(uDensity, vUv).x;
        float filament = pow(max(d, 0.0), 1.35);
        float soft = smoothstep(0.02, 0.55, d);
        vec3 radiant = vec3(0.22, 0.95, 0.55);
        vec3 radiantHot = vec3(0.55, 1.0, 0.82);
        vec3 dire = vec3(0.95, 0.28, 0.18);
        vec3 direHot = vec3(1.0, 0.72, 0.35);
        vec3 cool = mix(radiant, dire, uWinner);
        vec3 hot = mix(radiantHot, direHot, uWinner);
        vec3 color = mix(cool, hot, filament);
        float pulse = 0.85 + 0.15 * sin(uTime * 1.7 + d * 8.0);
        float alpha = soft * (0.35 + filament * 1.4) * uFade * pulse;
        gl_FragColor = vec4(color * alpha, alpha);
      }
    `,
    uniforms: {
      uDensity: { value: null as THREE.Texture | null },
      uFade: { value: 0 },
      uWinner: { value: scoreSteamWinnerUniform(winner) },
      uTime: { value: 0 },
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
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial)
  simScene.add(quad)

  const displayQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    displayMaterial,
  )
  displayScene.add(displayQuad)

  let currentWinner = winner
  let aspect = 1
  let frame = 0
  let disposed = false
  let paused = document.hidden
  const startedAt = performance.now()
  let lastNow = startedAt

  function blit(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget | null,
  ) {
    quad.material = material
    renderer.setRenderTarget(target)
    renderer.render(simScene, camera)
    renderer.setRenderTarget(null)
  }

  function splat(
    target: PingPong,
    point: THREE.Vector3,
    color: THREE.Vector3,
    radius: number,
  ) {
    uni<THREE.Texture | null>(splatMaterial, 'uTarget').value =
      target.read.texture
    uni<number>(splatMaterial, 'uAspect').value = aspect
    uni<THREE.Vector3>(splatMaterial, 'uPoint').value.copy(point)
    uni<THREE.Vector3>(splatMaterial, 'uColor').value.copy(color)
    uni<number>(splatMaterial, 'uRadius').value = radius
    blit(splatMaterial, target.write)
    swapPingPong(target)
  }

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    aspect = width / Math.max(height, 1)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  // Clear sim buffers once.
  renderer.setClearColor(0x000000, 0)
  for (const target of [
    velocity.read,
    velocity.write,
    density.read,
    density.write,
    pressure.read,
    pressure.write,
    divergence,
    curl,
  ]) {
    renderer.setRenderTarget(target)
    renderer.clear()
  }
  renderer.setRenderTarget(null)

  function step(dt: number, elapsed: number) {
    const inject = scoreSteamInjectUv(currentWinner)
    const point = new THREE.Vector3(inject.x, inject.y, 0)
    const inward = currentWinner === 'dire' ? -1 : 1
    const force = new THREE.Vector3(
      0.35 * inward + Math.sin(elapsed * 1.3) * 0.08,
      1.15 + Math.sin(elapsed * 2.1) * 0.12,
      0,
    )
    const dye = new THREE.Vector3(0.9, 0, 0)

    // Continuous plume + soft secondary puff for filament breakup.
    splat(velocity, point, force, 0.018)
    splat(density, point, dye, 0.02)
    const wobble = new THREE.Vector3(
      inject.x + inward * 0.04 * Math.sin(elapsed * 0.7),
      inject.y + 0.05 + 0.02 * Math.cos(elapsed * 1.1),
      0,
    )
    splat(density, wobble, new THREE.Vector3(0.35, 0, 0), 0.012)
    splat(velocity, wobble, new THREE.Vector3(inward * 0.2, 0.55, 0), 0.012)

    uni<THREE.Texture | null>(advectMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(advectMaterial, 'uSource').value =
      velocity.read.texture
    uni<number>(advectMaterial, 'uDt').value = dt
    uni<number>(advectMaterial, 'uDissipation').value = 0.985
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

    uni<THREE.Texture | null>(advectMaterial, 'uVelocity').value =
      velocity.read.texture
    uni<THREE.Texture | null>(advectMaterial, 'uSource').value =
      density.read.texture
    uni<number>(advectMaterial, 'uDt').value = dt
    uni<number>(advectMaterial, 'uDissipation').value = 0.992
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
    const fade = scoreSteamIntroFade(elapsed)

    step(dt, elapsed)

    uni<THREE.Texture | null>(displayMaterial, 'uDensity').value =
      density.read.texture
    uni<number>(displayMaterial, 'uFade').value = fade
    uni<number>(displayMaterial, 'uWinner').value =
      scoreSteamWinnerUniform(currentWinner)
    uni<number>(displayMaterial, 'uTime').value = elapsed
    displayQuad.material = displayMaterial
    renderer.setRenderTarget(null)
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
    for (const target of [
      velocity.read,
      velocity.write,
      density.read,
      density.write,
      pressure.read,
      pressure.write,
      divergence,
      curl,
    ]) {
      target.dispose()
    }
    renderer.dispose()
  }

  return { setWinner, dispose }
}
