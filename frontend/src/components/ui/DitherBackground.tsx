"use client";
import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColorBg; 
  uniform vec3 uColorAcc; 
  varying vec2 vUv;

  float bayer8x8(vec2 uv) {
    vec2 p = floor(mod(uv, 8.0));
    int x = int(p.x);
    int y = int(p.y);
    const int m[64] = int[64](
       0, 32,  8, 40,  2, 34, 10, 42,
      48, 16, 56, 24, 50, 18, 58, 26,
      12, 44,  4, 36, 14, 46,  6, 38,
      60, 28, 52, 20, 62, 30, 54, 22,
       3, 35, 11, 43,  1, 33,  9, 41,
      51, 19, 59, 27, 49, 17, 57, 25,
      15, 47,  7, 39, 13, 45,  5, 37,
      63, 31, 55, 23, 61, 29, 53, 21
    );
    return float(m[y * 8 + x]) / 64.0;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) { // Higher detail
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    p.x *= uResolution.x / uResolution.y;

    float t = uTime * 0.03; // Slower movement
    
    // Create organic movement using FBM
    float q = fbm(p * 1.2 + vec2(t, t * 0.5));
    float r = fbm(p * 1.5 + q + vec2(-t * 0.3, t * 0.2) + vec2(1.7, 9.2));
    float v = fbm(p * 1.0 + r + t * 0.1);

    // Increase contrast and map to a broader range to ensure visibility
    v = smoothstep(0.2, 0.8, v); 
    v = pow(v, 1.2);

    // Add mouse repulsion-like effect (central pulse)
    float dist = length(p);
    v *= (0.5 + 0.5 * sin(t * 0.5));
    v += 0.15 * (1.0 - smoothstep(0.0, 2.0, dist));

    // Pixellate the coordinates for the dither grid (3px cells)
    vec2 ditherCoord = vUv * uResolution / 3.0; 
    float limit = bayer8x8(ditherCoord);
    
    // Threshold with a small offset to ensure the bayer matrix is used effectively
    float dithered = (v * 0.95 + 0.05) > limit ? 1.0 : 0.0;
    
    // Choose colors that POP
    vec3 color = mix(uColorBg, uColorAcc, dithered);
    
    // Vignette for depth
    color *= smoothstep(2.0, 0.6, dist);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const SmokePlane = () => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uColorBg: { value: new THREE.Color("#000000") },
      uColorAcc: { value: new THREE.Color("#ff0066") }, // Brighter Pink for visibility
    }),
    [size]
  );

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      material.uniforms.uResolution.value.set(size.width, size.height);

      // Sync with global CSS accent color
      const accent = getComputedStyle(document.documentElement).getPropertyValue("--accent-color").trim();
      if (accent) {
        material.uniforms.uColorAcc.value.set(accent);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export const DitherBackground = () => {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden", background: "#000" }}>
      <Canvas
        gl={{ antialias: false, stencil: false, alpha: false }}
        camera={{ position: [0, 0, 1] }}
        dpr={[1, 1]}
      >
        <SmokePlane />
      </Canvas>
      {/* Texture noise overlay */}
      <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')",
          pointerEvents: "none",
          zIndex: 1
      }} />
    </div>
  );
};
