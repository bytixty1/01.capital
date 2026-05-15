'use client';

import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Soft diagonal silk ribbons — no domain warping, no marbling.
// Three gaussian bands flow top-left → bottom-right with gentle organic sway.
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

  // ── Organic motion ────────────────────────────────────────────────────────────
  // 1. Slow large-scale shape drift (changes over ~30 s — gives the ribbons
  //    their split/rejoin look without chaotic turbulence)
  float drift = sN(vec2(along * 0.30, t * 0.040)) * 0.12 - 0.06;

  // 2. Faster traveling sine waves along the ribbon length — this is the
  //    visible "water current under glass" motion.
  float wave =  sin(along * 1.40 - t * 0.22) * 0.013
              + sin(along * 0.60 - t * 0.15 + 0.8) * 0.008;

  float lw = lateral + drift + wave;  // final swayed lateral position

  // ── Ribbon bands ──────────────────────────────────────────────────────────────
  // Each ribbon = wide dim haze   (indigo glow)
  //             + narrow bright core (milky silk spine)
  // The separation along 'side' keeps them as distinct parallel diagonals.

  // Ribbon A — main diagonal corridor
  float hA = exp(-pow(lw        * 5.8,  2.0));   // haze  σ≈0.17
  float cA = exp(-pow(lw        * 21.0, 2.0));   // core  σ≈0.048

  // Ribbon B — upper-left band (offset +0.30 in side direction)
  float lB = lw - 0.30;
  float hB = exp(-pow(lB * 6.5,  2.0));
  float cB = exp(-pow(lB * 23.0, 2.0));

  // Ribbon C — secondary lower band (faint)
  float lC = lw + 0.24;
  float hC = exp(-pow(lC * 7.5,  2.0));
  float cC = exp(-pow(lC * 26.0, 2.0));

  float haze = hA * 0.065 + hB * 0.044 + hC * 0.022;
  float core = cA * 0.330 + cB * 0.270 + cC * 0.155;
  float I    = clamp(haze + core, 0.0, 1.0);

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
