"use client";

/**
 * SOULDAWN — DawnShader.
 * Деликатный GLSL-фон «рассветный туман/зерно».
 * Использует WebGL canvas с простым фрагментным шейдером.
 * Автоматически отключается если WebGL недоступен (фоллбэк на CSS-градиент).
 * Производительность: один проход шейдера на кадр, нет тяжёлых вычислений.
 */
import { useEffect, useRef } from "react";

const VERT = `
  attribute vec2 a_pos;
  void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Фрагментный шейдер: fractal noise + янтарный рассветный градиент снизу
const FRAG = `
  precision mediump float;
  uniform vec2  u_res;
  uniform float u_time;

  // Быстрый hash
  float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  // Билинейный шум
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i),           hash(i + vec2(1,0)), u.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
      u.y
    );
  }

  // Fractal Brownian Motion (3 октавы — баланс качество/производительность)
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2  s = vec2(1.0);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p  = p * 2.1 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_res;
    // Переворачиваем Y: (0,0) — низ, (1,1) — верх
    uv.y = 1.0 - uv.y;

    // Медленное движение шума
    vec2 p = uv * 3.5 + vec2(u_time * 0.04, u_time * 0.025);
    float n = fbm(p);
    // Добавляем второй слой для глубины
    float n2 = fbm(p * 1.8 + vec2(n * 1.2));
    float fog = mix(n, n2, 0.4);

    // Янтарный рассвет снизу (высота влияет на интенсивность)
    float dawn = pow(1.0 - uv.y, 2.2) * 0.55;

    // Цвета: графит → янтарь
    vec3 dark   = vec3(0.031, 0.031, 0.039); // #08080A
    vec3 amber  = vec3(0.910, 0.722, 0.478); // #E8B87A
    vec3 warm   = vec3(0.831, 0.569, 0.361); // #D4915C

    vec3 col = dark;
    col = mix(col, amber, dawn * fog * 0.7);
    col = mix(col, warm,  dawn * (1.0 - fog) * 0.35);

    // Тонкое плёночное зерно
    float grain = hash(uv * u_res * 0.5 + u_time * 13.7) * 0.035;
    col += grain;

    // Виньетка по краям
    float vign = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y);
    vign = pow(vign * 16.0, 0.35);
    col *= vign;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[DawnShader] compile error:", gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function DawnShader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return; // Фоллбэк: CSS-градиент виден через HeroSection

    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[DawnShader] link error:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Полноэкранный квад
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, 1,1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes  = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    let raf: number;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width  = Math.floor(canvas.offsetWidth  * dpr);
      canvas.height = Math.floor(canvas.offsetHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const render = (now: number) => {
      const t = (now - start) * 0.001;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(prog);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 w-full h-full"
      style={{ display: "block" }}
    />
  );
}
