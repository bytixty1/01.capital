'use client';

import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Soft diagonal silk ribbons — no domain warping, no marbling.
// Three gaussian bands flow top-left → bottom-right with gentle organic sway.
// Longitudinal flow: bright crests translate ~30 s to traverse visible diagonal.
// Breathing pulse: ~18 s period. All periods incommensurate — no visible loop restart.
const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;

float h(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float N(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y);
}
// 2-octave smooth noise only — keeps organic sway gentle, not turbulent
float sN(vec2 p) {
  return N(p) * 0.62 + N(p * 1.9 + vec2(3.1, 1.7)) * 0.38;
}

void main() {
  vec2  uv  = gl_FragCoord.xy / u_res;
  float asp = u_res.x / u_res.y;
  vec2  p   = vec2(uv.x * asp, uv.y);
  float t   = u_time;

  // Flow direction ~25° (WebGL y+ = up → this maps to top-left→bottom-right on screen)
  const float ANG = 0.43;
  vec2 fwd  = vec2( cos(ANG),  sin(ANG));
  vec2 side = vec2(-sin(ANG),  cos(ANG));

  float along   = dot(p, fwd);
  float lateral = dot(p - vec2(asp * 0.5, 0.5), side);

  // ── Per-ribbon independent waves ──────────────────────────────────────────────
  // Each ribbon has different freqs/speeds/phases — they never lockstep.
  // ampX = slow noise value that evolves each ribbon's wave magnitude over time.

  float shared = sN(vec2(along * 0.25, t * 0.035)) * 0.04 - 0.02;

  float ampA = 0.80 + sN(vec2(t * 0.041,        1.1)) * 0.40;
  float waveA = (  sin(along * 2.30 - t * 1.05       ) * 0.085
                 + sin(along * 1.10 - t * 0.73 + 0.7 ) * 0.052
                 + sin(along * 4.50 - t * 1.90 + 1.5 ) * 0.022) * ampA;

  float ampB = 0.80 + sN(vec2(t * 0.037 + 5.1,  3.7)) * 0.40;
  float waveB = (  sin(along * 1.90 - t * 0.88 + 2.3 ) * 0.090
                 + sin(along * 3.10 - t * 1.35 + 1.1 ) * 0.040
                 + sin(along * 0.70 - t * 0.55 + 3.7 ) * 0.060) * ampB;

  float ampC = 0.80 + sN(vec2(t * 0.044 + 2.3,  6.2)) * 0.40;
  float waveC = (  sin(along * 2.80 - t * 1.25 + 4.1 ) * 0.075
                 + sin(along * 1.50 - t * 0.95 + 2.8 ) * 0.055
                 + sin(along * 5.00 - t * 2.10 + 0.5 ) * 0.020) * ampC;

  // Ephemeral ribbons D and E — noise-driven opacity makes stripe count vary ~2..5
  float opD = clamp(sN(vec2(t * 0.058,        8.4)) * 1.4 - 0.25, 0.0, 1.0);
  float opE = clamp(sN(vec2(t * 0.051 + 3.1, 11.7)) * 1.4 - 0.30, 0.0, 1.0);

  float ampD = 0.80 + sN(vec2(t * 0.039 + 7.7,  2.2)) * 0.40;
  float waveD = (  sin(along * 2.10 - t * 0.97 + 3.3 ) * 0.080
                 + sin(along * 1.70 - t * 1.15 + 5.1 ) * 0.045) * ampD;

  float ampE = 0.80 + sN(vec2(t * 0.046 + 1.3,  9.0)) * 0.40;
  float waveE = (  sin(along * 3.30 - t * 1.40 + 1.8 ) * 0.070
                 + sin(along * 0.90 - t * 0.68 + 4.6 ) * 0.055) * ampE;

  // Independent lateral positions per ribbon
  float lwA = lateral        + waveA + shared;
  float lwB = lateral - 0.30 + waveB + shared;
  float lwC = lateral + 0.24 + waveC + shared;
  float lwD = lateral - 0.55 + waveD + shared;
  float lwE = lateral + 0.48 + waveE + shared;

  // ── Gaussian profiles ─────────────────────────────────────────────────────────
  float hA = exp(-pow(lwA * 5.8,  2.0)), cA = exp(-pow(lwA * 21.0, 2.0));
  float hB = exp(-pow(lwB * 6.5,  2.0)), cB = exp(-pow(lwB * 23.0, 2.0));
  float hC = exp(-pow(lwC * 7.5,  2.0)), cC = exp(-pow(lwC * 26.0, 2.0));
  float hD = exp(-pow(lwD * 8.0,  2.0)) * opD, cD = exp(-pow(lwD * 28.0, 2.0)) * opD;
  float hE = exp(-pow(lwE * 9.0,  2.0)) * opE, cE = exp(-pow(lwE * 30.0, 2.0)) * opE;

  // ── Longitudinal brightness per ribbon (different speeds) ─────────────────────
  float flowA = 0.55 + 0.30 * sin(along * 0.80 - t * 0.44      ) + 0.15 * sin(along * 1.60 - t * 0.70 + 1.3);
  float flowB = 0.55 + 0.30 * sin(along * 0.80 - t * 0.38 + 2.1) + 0.15 * sin(along * 1.60 - t * 0.60 + 0.7);
  float flowC = 0.55 + 0.30 * sin(along * 0.90 - t * 0.52 + 4.2) + 0.15 * sin(along * 1.80 - t * 0.80 + 2.9);
  float flowD = 0.55 + 0.35 * sin(along * 1.10 - t * 0.61 + 0.9);
  float flowE = 0.55 + 0.35 * sin(along * 0.70 - t * 0.49 + 3.5);

  float haze = hA*flowA*0.065 + hB*flowB*0.044 + hC*flowC*0.022 + hD*flowD*0.038 + hE*flowE*0.028;
  float core = cA*flowA*0.330 + cB*flowB*0.270 + cC*flowC*0.155 + cD*flowD*0.200 + cE*flowE*0.150;
  float I    = clamp(haze + core, 0.0, 1.0);

  // ── Breathing pulse — global slow intensity oscillation ───────────────────────
  // Primary period ~18 s (0.349 rad/s = 2π/18).
  // Secondary period ~19 s (0.331 rad/s) — incommensurate with primary and flow.
  float breath = 1.00 + 0.15 * sin(t * 0.349)
                      + 0.05 * sin(t * 0.331 + 1.7);
  I = clamp(I * breath, 0.0, 1.0);

  // ── Spatial envelope ──────────────────────────────────────────────────────────
  float topE  = smoothstep(0.10, 0.90, uv.y);
  float leftE = smoothstep(0.80, 0.10, uv.x);
  float entry = mix(0.40, 1.0, topE) * mix(0.70, 1.0, leftE);

  // Hero headline zone: very dark so text reads cleanly against black.
  vec2  rOff  = p - vec2(asp * 0.50, 0.54);
  float rDist = length(rOff / vec2(asp * 0.52, 0.36));
  float rMask = smoothstep(0.30, 1.40, rDist);

  I = clamp(I * entry * mix(0.012, 1.0, rMask), 0.0, 1.0);

  // ── Colour — smoky gray palette, purple as a restrained tint only ─────────────
  // Near-neutral charcoal base → smoky gray haze → silver-lilac body → cool off-white core
  vec3 cBlack  = vec3(0.026, 0.024, 0.032);   // near-neutral dark charcoal
  vec3 cSmoke  = vec3(0.088, 0.084, 0.118);   // smoky gray, faint violet whisper
  vec3 cSilver = vec3(0.310, 0.300, 0.390);   // silver-lilac, very desaturated
  vec3 cWhite  = vec3(0.800, 0.800, 0.840);   // cool gray-white, barely any tint

  vec3 col = cBlack;
  col = mix(col, cSmoke,  smoothstep(0.000, 0.060, I));
  col = mix(col, cSilver, smoothstep(0.045, 0.210, I));
  col = mix(col, cWhite,  smoothstep(0.170, 0.500, I));

  // Fine film grain — light and refined, not dirty
  col += (h(gl_FragCoord.xy + vec2(floor(t * 11.0))) - 0.5) * 0.010;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function MetaballCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const gl = cv.getContext('webgl');
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    // Render at 55% of display DPR — CSS upscaling adds inherent softness
    function resize() {
      if (!cv) return;
      const dpr = Math.min(window.devicePixelRatio, 2) * 0.55;
      cv.width  = Math.round(cv.offsetWidth  * dpr);
      cv.height = Math.round(cv.offsetHeight * dpr);
      gl!.viewport(0, 0, cv.width, cv.height);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    let raf = 0;
    function draw(ts: number) {
      if (!cv) return;
      gl!.uniform2f(uRes, cv.width, cv.height);
      gl!.uniform1f(uTime, ts * 0.001);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        // CSS blur softens the upscaled render — makes ribbons feel silky, not pixelated
        filter: 'blur(2px)',
      }}
    />
  );
}
