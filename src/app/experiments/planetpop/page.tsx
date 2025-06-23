"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import { STAR_DATA } from "@/lib/stars";
import Link from "next/link";

const GAS_COLOR_PRESETS = [
  { name: "Crimson Giant", colors: ["#c94c4c", "#a63d3d", "#7d2b2b", "#e6a57d", "#ffc8a1"] },
  { name: "Emerald Exoplanet", colors: ["#2a9d8f", "#e9c46a", "#f4a261", "#264653", "#a8dadc"] },
  { name: "Violet Nebula", colors: ["#8e44ad", "#9b59b6", "#34495e", "#e74c3c", "#f1c40f"] },
  { name: "Golden Giant", colors: ["#f1c40f", "#f39c12", "#e67e22", "#fffde7", "#f9e79f"] },
  { name: "Ice Giant", colors: ["#aed6f1", "#eaf2f8", "#d6eaf8", "#ffffff", "#d0d3d4"] },
  { name: "Stormy Blue", colors: ["#34495e", "#2c3e50", "#95a5a6", "#ecf0f1", "#7f8c8d"] },
  { name: "Custom", colors: ["#e0c97f", "#7fd6e0"] },
];

const defaultParams = {
  gasColors: GAS_COLOR_PRESETS[0].colors,
  gasColorPreset: "Crimson Giant",
  gasTurbulence: 0.5,
  roughness: 0.5,
};

function fbm(x: number, y: number, z: number, noise3D: (x:number, y:number, z:number)=>number, octaves: number, persistence: number = 0.5, lacunarity: number = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        total += noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
}

export default function PlanetPop() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState(defaultParams);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{x: number, y: number} | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);

  // One-time scene setup
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 4000);
    camera.position.z = 3;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(5, 2, 2);
    scene.add(directionalLight);

    const sceneGroup = new THREE.Group();
    sceneGroupRef.current = sceneGroup;
    scene.add(sceneGroup);

    // Create starfield from local data
    const starVertices = [];
    const starColors = [];
    const starSizes = [];
    const tempColor = new THREE.Color();

    for (const star of STAR_DATA) {
        const distance = 1000;
        const raRad = star.ra * Math.PI / 12;
        const decRad = star.dec * Math.PI / 180;
        const x = distance * Math.cos(decRad) * Math.cos(raRad);
        const y = distance * Math.sin(decRad);
        const z = distance * Math.cos(decRad) * Math.sin(raRad);
        starVertices.push(x, y, z);
        const colorIndex = star.ci ?? 0.5;
        tempColor.setHSL(0.6 - (colorIndex * 0.2), 1.0, 0.9);
        starColors.push(tempColor.r, tempColor.g, tempColor.b);
        const size = Math.max(0.1, (6.5 - star.mag) * 0.15);
        starSizes.push(size);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    // DEBUG: Use PointsMaterial instead of ShaderMaterial to check if stars appear
    // const starMaterial = new THREE.ShaderMaterial({ ... });
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 10,
        sizeAttenuation: true,
    });
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    sceneGroup.add(stars);
    starsRef.current = stars;

    let frameId: number;
    const animate = () => {
      if (planetMeshRef.current) {
        planetMeshRef.current.rotation.y += 0.0007;
      }
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0002;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      currentMount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update planet mesh when params change
  useEffect(() => {
    if (!sceneGroupRef.current) return;

    // Remove old planet
    if (planetMeshRef.current) {
      sceneGroupRef.current.remove(planetMeshRef.current);
      planetMeshRef.current.geometry.dispose();
      (planetMeshRef.current.material as THREE.Material).dispose();
    }

    const PLANET_RADIUS = 0.7;
    const geometry = new THREE.SphereGeometry(PLANET_RADIUS, 256, 256);
    const noise3D = createNoise3D();
    const pos = geometry.attributes.position;
    const colors: number[] = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + y * y + z * z);
      const nx = x / r, ny = y / r, nz = z / r;
      pos.setXYZ(i, nx * PLANET_RADIUS, ny * PLANET_RADIUS, nz * PLANET_RADIUS);
      const warp_strength = params.gasTurbulence * 1.5;
      const qx = nx + warp_strength * fbm(nx, ny, nz, noise3D, 3);
      const qy = ny + warp_strength * fbm(nx + 5.2, ny + 1.3, nz, noise3D, 3);
      const qz = nz + warp_strength * fbm(nx, ny + 2.8, nz + 4.1, noise3D, 3);
      const base_noise = fbm(qx * 0.7, qy * 2.0, qz * 0.7, noise3D, 8);
      const detail_noise = fbm(qx * 5.0, qy * 5.0, qz * 5.0, noise3D, 6);
      const fine_detail_noise = fbm(qx * 12.0, qy * 12.0, qz * 12.0, noise3D, 3);
      let pattern = (base_noise * 0.65 + detail_noise * 0.25 + fine_detail_noise * 0.1 + 1.0) / 2.0;
      pattern = Math.max(0, Math.min(1, pattern));
      const palette = params.gasColors;
      const n = palette.length;
      const scaled = pattern * (n - 1);
      const idx = Math.floor(scaled);
      const t = scaled - idx;
      const colorA = new THREE.Color(palette[idx]);
      const colorB = new THREE.Color(palette[Math.min(idx + 1, n - 1)]);
      const r_c = colorA.r * (1 - t) + colorB.r * t;
      const g_c = colorA.g * (1 - t) + colorB.g * t;
      const b_c = colorA.b * (1 - t) + colorB.b * t;
      colors.push(r_c, g_c, b_c);
    }
    pos.needsUpdate = true;
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      color: params.gasColors[0],
      roughness: params.roughness,
      metalness: 0.1,
      vertexColors: true,
    });
    const newPlanetMesh = new THREE.Mesh(geometry, material);
    planetMeshRef.current = newPlanetMesh;
    sceneGroupRef.current.add(newPlanetMesh);

  }, [params]);

  // Mouse drag to rotate
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };
  const handlePointerUp = () => {
    setIsDragging(false);
    setLastMouse(null);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !lastMouse || !sceneGroupRef.current) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    // Rotate the entire scene group
    sceneGroupRef.current.rotation.y += dx * 0.01;
    sceneGroupRef.current.rotation.x += dy * 0.01;
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  // UI for controls
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-mono">
      <header className="bg-gray-800 p-4 flex items-center shadow-md flex-shrink-0">
        <Link href="/" className="text-white hover:text-gray-300 mr-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold">Planet Pop</h1>
      </header>
      <div className="flex flex-col md:flex-row flex-grow">
        <div className="flex-1 flex items-center justify-center relative">
          <div
            ref={mountRef}
            className="w-[min(90vw,600px)] h-[min(90vw,600px)] bg-black rounded-lg shadow-lg cursor-grab"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerUp}
          />
        </div>
        <div className="w-full md:w-96 bg-gray-800 p-6 flex flex-col gap-6 shadow-lg border-t md:border-t-0 md:border-l border-gray-700">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Gas Color Scheme</span>
              <select
                className="bg-gray-700 p-2 rounded"
                value={params.gasColorPreset}
                onChange={e => {
                  const preset = GAS_COLOR_PRESETS.find(p => p.name === e.target.value);
                  if (preset) {
                    setParams(p => ({
                      ...p,
                      gasColorPreset: preset.name,
                      gasColors: preset.colors,
                    }));
                  }
                }}
              >
                {GAS_COLOR_PRESETS.map(preset => (
                  <option key={preset.name} value={preset.name}>{preset.name}</option>
                ))}
              </select>
            </label>
            {params.gasColorPreset === "Custom" && (
              <>
                <span className="font-semibold">Custom Gas Colors</span>
                {params.gasColors.map((color, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1">
                    <input
                      type="color"
                      value={color}
                      onChange={e => {
                        const newColors = [...params.gasColors];
                        newColors[i] = e.target.value;
                        setParams(p => ({ ...p, gasColors: newColors }));
                      }}
                      className="w-12 h-8 p-0 border-none bg-transparent"
                    />
                    {params.gasColors.length > 2 && (
                      <button
                        className="text-red-400 text-xs px-2 py-1 border border-red-400 rounded"
                        onClick={() => {
                          const newColors = params.gasColors.filter((_, idx) => idx !== i);
                          setParams(p => ({ ...p, gasColors: newColors }));
                        }}
                      >Remove</button>
                    )}
                  </div>
                ))}
                {params.gasColors.length < 6 && (
                  <button
                    className="text-green-400 text-xs px-2 py-1 border border-green-400 rounded mt-1"
                    onClick={() => {
                      setParams(p => ({ ...p, gasColors: [...p.gasColors, "#ffffff"] }));
                    }}
                  >Add Color</button>
                )}
              </>
            )}
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Turbulence</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.01}
                value={params.gasTurbulence}
                onChange={e => setParams(p => ({ ...p, gasTurbulence: parseFloat(e.target.value) }))}
              />
              <span className="text-xs">{params.gasTurbulence}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Roughness</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={params.roughness}
                onChange={e => setParams(p => ({ ...p, roughness: parseFloat(e.target.value) }))}
              />
              <span className="text-xs">{params.roughness}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
} 