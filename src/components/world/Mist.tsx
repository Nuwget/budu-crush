"use client";

import { useEffect, useRef, useState } from "react";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;

// Domain-warped fractal noise in the site's violet palette, bent by the pointer.
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_energy;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= .5; }
  return v;
}

void main(){
  float s = min(u_res.x, u_res.y);
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (gl_FragCoord.xy - .5 * u_res) / s;
  vec2 m = (u_mouse - .5 * u_res) / s;
  vec2 d = p - m;
  float md = length(d);
  p += normalize(d + 1e-4) * .09 * exp(-md * 3.2) * u_energy;

  float t = u_time * .055;
  vec2 q = vec2(fbm(p * 1.7 + t), fbm(p * 1.7 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p * 1.7 + 3. * q + vec2(1.7, 9.2) + 1.4 * t),
                fbm(p * 1.7 + 3. * q + vec2(8.3, 2.8) - 1.1 * t));
  float f = fbm(p * 1.5 + 3.2 * r);

  vec3 night = vec3(.024, .016, .10);
  vec3 deep  = vec3(.20, .08, .50);
  vec3 violet = vec3(.50, .33, .98);
  vec3 magenta = vec3(.91, .47, .78);

  vec3 col = mix(night, deep, smoothstep(.12, .62, f));
  col = mix(col, violet, smoothstep(.5, .95, length(q) * f * 1.5) * .8);
  col += magenta * .2 * pow(smoothstep(.55, 1., r.x), 2.);
  col += violet * .22 * exp(-md * 3.4) * (.5 + .5 * u_energy);

  col *= 1. - dot(uv - .5, uv - .5) * 1.5;
  gl_FragColor = vec4(col, 1.);
}`;

/**
 * Full-screen WebGL backdrop. Renders at reduced resolution and stops when `active` is false.
 * With `still` (reduced motion) it draws a single frozen frame instead of animating.
 */
export function Mist({ active, still = false, fps = 60 }: { active: boolean; still?: boolean; fps?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const fpsRef = useRef(fps);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    activeRef.current = active;
    fpsRef.current = fps;
  }, [active, fps]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power", preserveDrawingBuffer: still });
    if (!gl) {
      setFailed(true);
      return;
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const uEnergy = gl.getUniformLocation(prog, "u_energy");

    const SCALE = 0.5; // half resolution: the field is soft anyway
    const FROZEN_AT = 31; // seconds into the flow, a nicely smoky moment
    let w = 0;
    let h = 0;
    const draw = (seconds: number, mouseX: number, mouseY: number, energy: number) => {
      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, seconds);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uEnergy, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      w = Math.max(2, Math.floor(window.innerWidth * SCALE));
      h = Math.max(2, Math.floor(window.innerHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (still) draw(FROZEN_AT, w * 0.62, h * 0.5, 0.35);
    };
    resize();
    let mx = w / 2;
    let my = h / 2;
    let tx = mx;
    let ty = my;
    let energy = 0;
    let targetEnergy = 0;
    const onMove = (e: PointerEvent) => {
      tx = e.clientX * SCALE;
      ty = (window.innerHeight - e.clientY) * SCALE;
      targetEnergy = 1;
    };

    let raf = 0;
    let last = 0;
    const start = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (gl.isContextLost()) return;
      if (!activeRef.current || document.hidden || now - last < 1000 / fpsRef.current - 2) return;
      last = now;
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;
      energy += (targetEnergy - energy) * 0.05;
      targetEnergy *= 0.985;
      draw(FROZEN_AT + (now - start) / 1000, mx, my, energy);
    };
    if (!still) {
      raf = requestAnimationFrame(frame);
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    // If the browser drops the GL context, stop drawing and show the CSS smoke instead.
    const onLost = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [still]);

  return (
    <>
      {failed && (
        <div aria-hidden="true" className="mist-fallback">
          <i />
          <i />
          <i />
        </div>
      )}
      <canvas ref={ref} aria-hidden="true" className="mist absolute inset-0 h-full w-full" hidden={failed} />
    </>
  );
}
