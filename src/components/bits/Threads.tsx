// Adapted from React Bits Threads (reactbits.dev).
import { useEffect, useRef } from 'react';

interface ThreadsProps {
  lineCount?: number;
  amplitude?: number;
  distance?: number;
  thickness?: number;
  softness?: number;
  speed?: number;
  waves?: number;
  split?: number;
  fray?: number;
  angle?: number;
  origin?: [number, number];
  seed?: number;
  parting?: number;
  taper?: number;
  opacity?: number;
}

type Settings = Required<ThreadsProps>;

const VERTEX = `#version 300 es
precision highp float;
in vec2 aPoint;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uFrame;
uniform float uAmplitude;
uniform float uDistance;
uniform float uCount;
uniform float uThickness;
uniform float uSoftness;
uniform float uWaves;
uniform float uSplit;
uniform float uFray;
uniform float uSeed;
uniform vec2 uTurn;
uniform vec2 uOrigin;
uniform vec4 uPart;
uniform float uTaper;
out float vEdge;
out float vBand;
out float vDraw;
out float vAlpha;

float Perlin2D(vec2 P) {
  vec2 Pi = floor(P);
  vec4 Pf_Pfmin1 = P.xyxy - vec4(Pi, Pi + 1.0);
  vec4 Pt = vec4(Pi.xy, Pi.xy + 1.0);
  Pt = Pt - floor(Pt * (1.0 / 71.0)) * 71.0;
  Pt += vec2(26.0, 161.0).xyxy;
  Pt *= Pt;
  Pt = Pt.xzxz * Pt.yyww;
  vec4 hash_x = fract(Pt * (1.0 / 951.135664));
  vec4 hash_y = fract(Pt * (1.0 / 642.949883));
  vec4 grad_x = hash_x - 0.49999;
  vec4 grad_y = hash_y - 0.49999;
  vec4 grad_results = inversesqrt(grad_x * grad_x + grad_y * grad_y) * (grad_x * Pf_Pfmin1.xzxz + grad_y * Pf_Pfmin1.yyww);
  grad_results *= 1.4142135623730950;
  vec2 blend = Pf_Pfmin1.xy * Pf_Pfmin1.xy * Pf_Pfmin1.xy * (Pf_Pfmin1.xy * (Pf_Pfmin1.xy * 6.0 - 15.0) + 10.0);
  vec4 blend2 = vec4(blend, vec2(1.0 - blend));
  return dot(grad_results, blend2.zxzx * blend2.wwyy);
}

void main() {
  float perc = float(gl_InstanceID) / uCount;
  float x = aPoint.x;
  float pixel = 1.0 / max(uResolution.x, uResolution.y);
  float splitPoint = uSplit + perc * uFray;
  float amplitudeNormal = smoothstep(splitPoint, max(0.7, splitPoint + 0.2), x);
  float finalAmplitude = amplitudeNormal * 0.5 * uAmplitude;
  float timeScaled = uTime / 10.0;
  float blur = smoothstep(splitPoint, splitPoint + 0.05, x) * perc;
  float xnoise = mix(
    Perlin2D(vec2(timeScaled * 2.5 + uSeed, (x * uWaves + perc) * 2.5)),
    Perlin2D(vec2(timeScaled * 3.5 + uSeed, (x * uWaves + timeScaled) * 3.5)) / 1.5,
    x * 0.3
  );
  float y = 0.5 + (perc - 0.5) * uDistance + xnoise / 2.0 * finalAmplitude;
  vec2 local = vec2((x - 0.5) * uFrame.x, (y - 0.5) * uFrame.y);
  if (uPart.z > 0.0) {
    vec2 delta = local - uPart.xy;
    float reach = uPart.w;
    float pull = exp(-dot(delta, delta) / (reach * reach));
    local.y += delta.y * pull * uPart.z;
  }
  float width = 7.0 * uThickness * pixel * (1.0 - perc);
  float band = (width / 2.0 + 10.0 * uSoftness * pixel * blur) * uFrame.y;
  float draw = max(band, 1.0);
  local.y += aPoint.y * draw;
  vec2 turned = vec2(local.x * uTurn.x - local.y * uTurn.y, local.x * uTurn.y + local.y * uTurn.x);
  gl_Position = vec4((turned + uOrigin) / (uResolution * 0.5), 0.0, 1.0);
  vEdge = aPoint.y * draw;
  vBand = band;
  vDraw = draw;
  vAlpha = 1.0 - smoothstep(0.0, 1.0, pow(perc, 0.3)) * uTaper;
}`;

// Lines blend straight into the transparent canvas, so the page background is the only ground.
const FRAGMENT = `#version 300 es
precision highp float;
in float vEdge;
in float vBand;
in float vDraw;
in float vAlpha;
uniform vec3 uColor;
uniform float uOpacity;
out vec4 outColor;
void main() {
  float coverage = (1.0 - smoothstep(0.0, vDraw, abs(vEdge))) * (vBand / vDraw) * vAlpha * uOpacity;
  outColor = vec4(uColor * coverage, coverage);
}`;

// Width is set in device pixels, so up to 2x keeps the traces hairline; the cap bounds huge screens.
const MAX_DPR = 2;
const MAX_RENDER_DIM = 2880;
const FRAME_RATIO = 0.62;

const UNIFORMS = [
  'uTime',
  'uResolution',
  'uFrame',
  'uAmplitude',
  'uDistance',
  'uCount',
  'uThickness',
  'uSoftness',
  'uWaves',
  'uSplit',
  'uFray',
  'uSeed',
  'uTurn',
  'uOrigin',
  'uPart',
  'uTaper',
  'uColor',
  'uOpacity'
] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
};

const link = (gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) => {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
};

const loseContext = (gl: WebGL2RenderingContext) => gl.getExtension('WEBGL_lose_context')?.loseContext();

// The ink is the page's strongest text colour, resolved to rgb through a 1px canvas so any CSS colour syntax works.
const readInk = (probe: CanvasRenderingContext2D | null) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--strong').trim();
  if (!probe || !value) return [0.5, 0.5, 0.5];
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#808080';
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
};

const start = (container: HTMLDivElement, canvas: HTMLCanvasElement, read: () => Settings) => {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false
  });
  if (!gl) return null;
  const program = link(gl, VERTEX, FRAGMENT);
  if (!program) {
    loseContext(gl);
    return null;
  }

  const uniforms = Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)])) as Record<
    (typeof UNIFORMS)[number],
    WebGLUniformLocation | null
  >;
  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const pointLocation = gl.getAttribLocation(program, 'aPoint');
  gl.enableVertexAttribArray(pointLocation);
  gl.vertexAttribPointer(pointLocation, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const root = document.documentElement;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = !still && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const state = {
    time: 0,
    width: 1,
    segments: 0,
    ink: readInk(probe),
    pointer: [0, 0],
    targetPointer: [0, 0],
    presence: 0,
    inside: false
  };
  let raf = 0;
  let last = 0;
  let visible = true;
  let alive = true;
  let shown = false;

  const buildStrip = (segments: number) => {
    if (segments === state.segments) return;
    state.segments = segments;
    const points = new Float32Array((segments + 1) * 4);
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      points.set([u, -1, u, 1], i * 4);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  };

  const render = () => {
    const s = read();
    const w = canvas.width;
    const h = canvas.height;
    const radians = (s.angle * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    // The pivot sits off centre so the threads can keep clear of the text; the strip grows to still reach both edges.
    const ox = (s.origin[0] - 0.5) * w;
    const oy = (0.5 - s.origin[1]) * h;
    const length = Math.abs(w * cos) + Math.abs(h * sin) + 2 * Math.abs(ox * cos + oy * sin);
    const across = Math.abs(w * sin) + Math.abs(h * cos);
    // On a portrait screen the cross axis would stretch the waves tall over the text, so it keeps the landscape
    // proportion. The threads then pack closer, so strokes give back only part of the lost width to stay as quiet.
    const cross = Math.min(across, length * FRAME_RATIO);
    const stroke = Math.sqrt(across / cross);
    const scale = w / state.width;
    const px = state.pointer[0] * scale - ox;
    const py = state.pointer[1] * scale - oy;
    const count = clamp(Math.round(s.lineCount), 1, 400);

    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform1f(uniforms.uTime, state.time);
    gl.uniform2f(uniforms.uResolution, w, h);
    gl.uniform2f(uniforms.uFrame, length, cross);
    gl.uniform1f(uniforms.uAmplitude, s.amplitude);
    gl.uniform1f(uniforms.uDistance, s.distance);
    gl.uniform1f(uniforms.uCount, count);
    gl.uniform1f(uniforms.uThickness, Math.max(0, s.thickness) * stroke);
    gl.uniform1f(uniforms.uSoftness, Math.max(0, s.softness) * stroke);
    gl.uniform1f(uniforms.uWaves, Math.max(0, s.waves));
    gl.uniform1f(uniforms.uSplit, clamp(s.split, 0, 1));
    gl.uniform1f(uniforms.uFray, clamp(s.fray, 0, 1));
    gl.uniform1f(uniforms.uSeed, s.seed * 13.37);
    gl.uniform2f(uniforms.uTurn, cos, sin);
    gl.uniform2f(uniforms.uOrigin, ox, oy);
    gl.uniform4f(
      uniforms.uPart,
      px * cos + py * sin,
      -px * sin + py * cos,
      clamp(s.parting, 0, 1) * state.presence * 2,
      Math.min(w, h) * 0.16
    );
    gl.uniform1f(uniforms.uTaper, clamp(s.taper, 0, 1));
    gl.uniform3f(uniforms.uColor, state.ink[0], state.ink[1], state.ink[2]);
    gl.uniform1f(uniforms.uOpacity, clamp(s.opacity, 0, 1));
    gl.bindVertexArray(vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (state.segments + 1) * 2, count);
    gl.bindVertexArray(null);

    if (!shown) {
      shown = true;
      canvas.style.opacity = '1';
    }
  };

  const frame = (now: number) => {
    raf = 0;
    if (!alive || !visible || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    state.time += dt * read().speed;
    const glide = 1 - Math.exp(-dt * 10);
    state.pointer[0] += (state.targetPointer[0] - state.pointer[0]) * glide;
    state.pointer[1] += (state.targetPointer[1] - state.pointer[1]) * glide;
    state.presence += ((state.inside ? 1 : 0) - state.presence) * (1 - Math.exp(-dt * 4));
    render();
    raf = requestAnimationFrame(frame);
  };

  const wake = () => {
    if (!still && !raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const base = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const longest = Math.max(width, height) * base;
    const dpr = longest > MAX_RENDER_DIM ? (base * MAX_RENDER_DIM) / longest : base;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    if (pixelWidth === canvas.width && pixelHeight === canvas.height && width === state.width) return;
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    state.width = width;
    buildStrip(clamp(Math.round(width / 3), 96, 640));
    // Resizing clears the canvas, so redraw before the next paint even while the loop is paused.
    render();
  };

  // Map window coordinates into the field: the layer sits behind the text and never receives events itself.
  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const inside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
    if (inside) {
      state.targetPointer = [x - rect.width / 2, rect.height / 2 - y];
      if (!state.inside && state.presence < 0.01) state.pointer = [...state.targetPointer];
    }
    state.inside = inside;
  };

  const onPointerLeave = () => {
    state.inside = false;
  };

  const onVisibility = () => wake();

  const theme = new MutationObserver(() => {
    state.ink = readInk(probe);
    if (!raf) render();
  });
  theme.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting);
    if (visible) wake();
  });
  if (!still) {
    intersection.observe(container);
    document.addEventListener('visibilitychange', onVisibility);
  }
  if (hover) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('pointerleave', onPointerLeave);
  }
  resize();
  wake();

  return {
    wake: () => {
      if (!raf) render();
    },
    stop: () => {
      alive = false;
      cancelAnimationFrame(raf);
      theme.disconnect();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerleave', onPointerLeave);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      loseContext(gl);
    }
  };
};

const Threads = ({
  lineCount = 20,
  amplitude = 1,
  distance = 0.2,
  thickness = 0.3,
  softness = 0.15,
  speed = 0.18,
  waves = 0.9,
  split = 0.04,
  fray = 0.5,
  angle = -14,
  origin = [0.62, 0.22],
  seed = 0,
  parting = 0.2,
  taper = 0.8,
  opacity = 0.5
}: ThreadsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const settings: Settings = {
    lineCount,
    amplitude,
    distance,
    thickness,
    softness,
    speed,
    waves,
    split,
    fray,
    angle,
    origin,
    seed,
    parting,
    taper,
    opacity
  };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;
    let field: ReturnType<typeof start> = null;
    // The field is decoration: it waits until the page has settled before it costs anything.
    const begin = () => {
      field = start(container, canvas, () => settingsRef.current);
      wakeRef.current = field?.wake ?? null;
    };
    const idle = 'requestIdleCallback' in window;
    const handle = idle ? window.requestIdleCallback(begin, { timeout: 3000 }) : window.setTimeout(begin, 300);
    return () => {
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      wakeRef.current = null;
      field?.stop();
    };
  }, []);

  useEffect(() => {
    wakeRef.current?.();
  });

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: 'block', width: '100%', height: '100%', opacity: 0, transition: 'opacity 1.6s var(--ease)' }}
      />
    </div>
  );
};

export default Threads;
