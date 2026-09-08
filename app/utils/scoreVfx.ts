import * as THREE from 'three'

export type ScoreVfxWinner = 'radiant' | 'dire'

export interface ScoreVfxHandle {
  play: (winner: ScoreVfxWinner) => void
  dispose: () => void
}

const DURATION_MS = 2500

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function easeOutCubic(value: number) {
  const t = clamp01(value)
  return 1 - (1 - t) ** 3
}

function range(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start))
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
    uField: { value: 0 },
    uScan: { value: 0 },
    uImpact: { value: 0 },
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
      uniform float uField;
      uniform float uScan;
      uniform float uImpact;
      uniform float uFade;
      varying vec2 vUv;

      void main() {
        vec3 radiant = vec3(0.612, 0.843, 0.478);
        vec3 dire = vec3(0.941, 0.529, 0.455);
        vec3 gold = vec3(0.882, 0.780, 0.506);
        vec3 win = mix(radiant, dire, uWinner);
        vec2 uv = vUv;
        vec3 color = vec3(0.0);

        float vertical = 1.0 - smoothstep(0.18, 0.72, abs(uv.y - 0.5) * 2.0);
        float radiantMask = smoothstep(0.82, 0.22, uv.x) * vertical * uField;
        float direMask = smoothstep(0.18, 0.78, uv.x) * vertical * uField;
        color += radiant * radiantMask * 0.62;
        color += dire * direMask * 0.62;

        float core = exp(-length((uv - vec2(0.5)) * vec2(1.7, 2.4)) * 3.2) * uField;
        color += win * core * 0.55;
        color += gold * core * 0.18;

        vec2 centered = uv - vec2(0.5);
        float angle = 0.192;
        vec2 axis = vec2(cos(angle), sin(angle));
        float scanPos = mix(-0.72, 0.72, uScan);
        float scan = exp(-pow((dot(centered, axis) - scanPos) * 52.0, 2.0));
        float scanGate = smoothstep(0.0, 0.08, uScan) * (1.0 - smoothstep(0.86, 1.0, uScan));
        color += (vec3(1.0) * 0.72 + gold * 0.55) * scan * scanGate;

        float dist = length(centered);
        float ring = abs(dist - uImpact * 0.62);
        float impact = exp(-ring * 36.0) * (1.0 - uImpact);
        color += (vec3(1.0) * 0.65 + gold + win * 0.25) * impact * 1.15;

        color *= uFade;
        gl_FragColor = vec4(color, min(1.0, length(color) * 1.15));
      }
    `,
  })

  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial)
  overlay.frustumCulled = false
  scene.add(overlay)

  let frame = 0
  let playing = false
  let startedAt = 0
  let disposed = false

  function resize() {
    const width = canvas.clientWidth || 1
    const height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  function tick(now: number) {
    if (disposed) {
      return
    }

    const elapsed = (now - startedAt) / 1000
    overlayUniforms.uField.value = easeOutCubic(range(elapsed, 0, 1.25))
    overlayUniforms.uScan.value = easeOutCubic(range(elapsed, 0.18, 0.9))
    overlayUniforms.uImpact.value = easeOutCubic(range(elapsed, 0.24, 1.06))
    overlayUniforms.uFade.value = 1 - range(elapsed, 1.65, 2.5)

    renderer.render(scene, camera)

    if (playing && now - startedAt < DURATION_MS) {
      frame = window.requestAnimationFrame(tick)
      return
    }

    playing = false
    overlayUniforms.uFade.value = 0
    renderer.render(scene, camera)
    frame = 0
  }

  function play(winner: ScoreVfxWinner) {
    if (disposed) {
      return
    }

    overlayUniforms.uWinner.value = winner === 'dire' ? 1 : 0
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
    renderer.dispose()
  }

  return { play, dispose }
}
