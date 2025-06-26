"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
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
  numMoons: 20,
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
  const [starDistance, setStarDistance] = useState(10);
  const [starBrightness, setStarBrightness] = useState(200);
  const [timeSpeed, setTimeSpeed] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouse, setLastMouse] = useState<{x: number, y: number} | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraGroupRef = useRef<THREE.Group | null>(null);
  const planetMeshRef = useRef<THREE.Mesh | null>(null);
  const moonsGroupRef = useRef<THREE.Group | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const planetOrbitGroupRef = useRef<THREE.Group | null>(null);
  const starMeshRef = useRef<THREE.Mesh | null>(null);
  const starLightRef = useRef<THREE.PointLight | null>(null);
  const skyGroupRef = useRef<THREE.Group | null>(null);
  const timeRef = useRef(0);
  const noiseRef = useRef(createNoise3D());
  const starDistanceRef = useRef(starDistance);
  const starBrightnessRef = useRef(starBrightness);

  // Update refs when state changes
  starDistanceRef.current = starDistance;
  starBrightnessRef.current = starBrightness;

  const updatePlanetColors = useCallback(() => {
    if (!planetMeshRef.current) return;

    const geometry = planetMeshRef.current.geometry as THREE.SphereGeometry;
    const pos = geometry.attributes.position;
    const colors: number[] = [];
    const time = timeRef.current;
    const noise3D = noiseRef.current;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.sqrt(x * x + y * y + z * z);
      const nx = x / r, ny = y / r, nz = z / r;
      const warp_strength = params.gasTurbulence * 1.5;
      const qx = nx + warp_strength * fbm(nx, ny, nz, noise3D, 3);
      const qy = ny + warp_strength * fbm(nx + 5.2, ny + 1.3, nz, noise3D, 3);
      const qz = nz + warp_strength * fbm(nx, ny + 2.8, nz + 4.1, noise3D, 3);
      const base_noise = fbm(qx * 0.7, qy * 2.0, qz * 0.7 + time, noise3D, 8);
      const detail_noise = fbm(qx * 5.0, qy * 5.0, qz * 5.0 + time, noise3D, 6);
      const fine_detail_noise = fbm(qx * 12.0, qy * 12.0, qz * 12.0 + time, noise3D, 3);
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
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
  }, [params]);

  const timeSpeedRef = useRef(timeSpeed);
  timeSpeedRef.current = timeSpeed;

  const updatePlanetColorsRef = useRef(updatePlanetColors);
  updatePlanetColorsRef.current = updatePlanetColors;

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

    const cameraGroup = new THREE.Group();
    cameraGroupRef.current = cameraGroup;
    scene.add(cameraGroup);
    cameraGroup.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const skyGroup = new THREE.Group();
    skyGroupRef.current = skyGroup;
    scene.add(skyGroup);

    // --- STAR (SUN) ---
    const SUN_RADIUS = 0.25;
    const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS, 64, 64);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xfff7b2 });
    const starMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    starMesh.position.set(starDistanceRef.current, 0, 10);
    skyGroup.add(starMesh);
    starMeshRef.current = starMesh;

    // --- STAR LIGHT ---
    const starLight = new THREE.PointLight(0xfff7b2, starBrightnessRef.current, 100);
    starMesh.add(starLight);
    starLightRef.current = starLight;

    // --- PLANET ORBIT GROUP ---
    const planetOrbitGroup = new THREE.Group();
    planetOrbitGroupRef.current = planetOrbitGroup;
    scene.add(planetOrbitGroup);

    const moonsGroup = new THREE.Group();
    moonsGroupRef.current = moonsGroup;
    planetOrbitGroup.add(moonsGroup);

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

    const starfieldGeometry = new THREE.BufferGeometry();
    starfieldGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starfieldGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    starfieldGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    // DEBUG: Use PointsMaterial instead of ShaderMaterial to check if stars appear
    // const starMaterial = new THREE.ShaderMaterial({ ... });
    const starfieldMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 10,
        sizeAttenuation: true,
        vertexColors: true
    });
    
    const stars = new THREE.Points(starfieldGeometry, starfieldMaterial);
    skyGroup.add(stars);
    starsRef.current = stars;

    let frameId: number;
    let planetOrbitAngle = 0;
    const animate = () => {
      timeRef.current += 0.001 * timeSpeedRef.current;
      
      // --- PLANET ORBIT ---
      planetOrbitAngle += 0.001;
      if (planetOrbitGroupRef.current) {
        const ORBIT_RADIUS = 2;
        planetOrbitGroupRef.current.position.x = Math.cos(planetOrbitAngle) * ORBIT_RADIUS;
        planetOrbitGroupRef.current.position.z = Math.sin(planetOrbitAngle) * ORBIT_RADIUS;
      }
      
      if (cameraGroupRef.current && planetOrbitGroupRef.current) {
        cameraGroupRef.current.position.copy(planetOrbitGroupRef.current.position);
      }

      if (planetMeshRef.current) {
        planetMeshRef.current.rotation.y += 0.0007;
        updatePlanetColorsRef.current();
      }
      if (moonsGroupRef.current) {
        moonsGroupRef.current.children.forEach((orbitPlane, i) => {
            const speed = (0.001 + (i % 3) * 0.0005) * (timeSpeedRef.current * 5);
            orbitPlane.rotation.y += speed;
        });
      }
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0002;
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
        if (!rendererRef.current || !cameraRef.current || !mountRef.current || !starLightRef.current) return;
        const { clientWidth, clientHeight } = mountRef.current;
        rendererRef.current.setSize(clientWidth, clientHeight);
        cameraRef.current.aspect = clientWidth / clientHeight;
        cameraRef.current.updateProjectionMatrix();
        starLightRef.current.intensity = starBrightnessRef.current;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(currentMount);

    return () => {
      cancelAnimationFrame(frameId);
      currentMount.removeChild(renderer.domElement);
      renderer.dispose();
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (starMeshRef.current) {
      starMeshRef.current.position.set(starDistanceRef.current, 0, 10);
    }
    if (starLightRef.current) {
      starLightRef.current.intensity = starBrightnessRef.current;
    }
  }, [starDistance, starBrightness]);

  // Update planet mesh when params change
  useEffect(() => {
    if (!planetOrbitGroupRef.current || !moonsGroupRef.current) return;
    
    noiseRef.current = createNoise3D();
    const noise3D = noiseRef.current;

    // Remove old planet
    if (planetMeshRef.current) {
      planetOrbitGroupRef.current.remove(planetMeshRef.current);
      planetMeshRef.current.geometry.dispose();
      (planetMeshRef.current.material as THREE.Material).dispose();
    }

    const PLANET_RADIUS = 0.7;
    const geometry = new THREE.SphereGeometry(PLANET_RADIUS, 256, 256);
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
    const planet = new THREE.Mesh(geometry, material);
    planetMeshRef.current = planet;
    planetOrbitGroupRef.current.add(planet);

    // --- MOON CREATION ---
    // Remove old moons
    while (moonsGroupRef.current.children.length > 0) {
        const moonOrbit = moonsGroupRef.current.children[0] as THREE.Group;
        const moon = moonOrbit.children[0] as THREE.Mesh;
        moon.geometry.dispose();
        (moon.material as THREE.Material).dispose();
        moonsGroupRef.current.remove(moonOrbit);
    }
    
    // Create new moons
    const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8, metalness: 0.1 });
    for (let i = 0; i < params.numMoons; i++) {
        const moonSize = Math.random() * 0.01 + 0.005;
        const moonDistance = PLANET_RADIUS + 0.2 + Math.random() * 0.4;
        const moonGeometry = new THREE.SphereGeometry(moonSize, 16, 16);
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);

        const orbitPlane = new THREE.Group();
        moon.position.x = moonDistance;
        orbitPlane.add(moon);
        
        orbitPlane.rotation.x = 0;
        orbitPlane.rotation.y = Math.random() * Math.PI * 2;
        orbitPlane.rotation.z = 0;
        
        moonsGroupRef.current.add(orbitPlane);
    }

  }, [params]);

  const handleRandomize = () => {
    const randomPreset = GAS_COLOR_PRESETS[Math.floor(Math.random() * (GAS_COLOR_PRESETS.length -1))];
    setParams({
      gasColorPreset: randomPreset.name,
      gasColors: randomPreset.colors,
      gasTurbulence: Math.random() * 2,
      roughness: Math.random(),
      numMoons: Math.floor(Math.random() * 51),
    });
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    const preset = GAS_COLOR_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setParams(p => ({
        ...p,
        gasColorPreset: preset.name,
        gasColors: preset.colors,
      }));
    }
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...params.gasColors];
    newColors[index] = color;
    setParams(p => ({ ...p, gasColors: newColors, gasColorPreset: 'Custom' }));
  };

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
    if (!isDragging || !lastMouse || !cameraGroupRef.current) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    // Rotate the camera group
    cameraGroupRef.current.rotation.y += dx * 0.01;
    cameraGroupRef.current.rotation.x += dy * 0.01;

    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  // UI for controls
  return (
    <div className="flex h-screen w-screen flex-col md:flex-row bg-black text-white">
      <div
        className="flex-grow relative"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerUp}
      >
        <div ref={mountRef} className="w-full h-full" />
        <div className="absolute top-0 left-0 p-4">
          <Link href="/" className="text-white hover:text-gray-300">
            &larr; Back
          </Link>
        </div>
      </div>
      <div className="w-full md:w-96 bg-gray-800 p-6 flex flex-col gap-6 shadow-lg border-t md:border-t-0 md:border-l border-gray-700">
        <div className="flex items-center justify-between">
            <button
                onClick={handleRandomize}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
                Randomize
            </button>
        </div>

        <div>
          <label htmlFor="gasColorPreset" className="block mb-2 text-sm font-medium">Gas Color Preset</label>
          <select
            id="gasColorPreset"
            value={params.gasColorPreset}
            onChange={handlePresetChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md"
          >
            {GAS_COLOR_PRESETS.map(preset => (
              <option key={preset.name} value={preset.name}>{preset.name}</option>
            ))}
          </select>
        </div>

        {params.gasColorPreset === 'Custom' && (
          <div className="grid grid-cols-2 gap-4">
            {params.gasColors.map((color, index) => (
              <div key={index}>
                <label htmlFor={`color-${index}`} className="block mb-1 text-sm">Color {index + 1}</label>
                <input
                  type="color"
                  id={`color-${index}`}
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label htmlFor="gasTurbulence" className="block mb-1">Gas Turbulence: {params.gasTurbulence}</label>
          <input
            type="range"
            id="gasTurbulence"
            min="0"
            max="1"
            step="0.01"
            value={params.gasTurbulence}
            onChange={(e) => setParams(p => ({ ...p, gasTurbulence: Number(e.target.value) }))}
            className="w-full"
          />
        </div>

        <div>
            <label htmlFor="roughness" className="block mb-1">Roughness: {params.roughness}</label>
            <input
                type="range"
                id="roughness"
                min="0"
                max="1"
                step="0.01"
                value={params.roughness}
                onChange={(e) => setParams(p => ({ ...p, roughness: Number(e.target.value) }))}
                className="w-full"
            />
        </div>
        <div>
            <label htmlFor="numMoons" className="block mb-1">Moons: {params.numMoons}</label>
            <input
                type="range"
                id="numMoons"
                min="0"
                max="50"
                step="1"
                value={params.numMoons}
                onChange={(e) => setParams(p => ({ ...p, numMoons: Number(e.target.value) }))}
                className="w-full"
            />
        </div>
        <div>
          <label htmlFor="starDistance" className="block mb-1">Star Distance: {starDistance}</label>
          <input
            type="range"
            id="starDistance"
            min="0"
            max="20"
            value={starDistance}
            onChange={(e) => setStarDistance(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="starBrightness" className="block mb-1">Star Brightness: {starBrightness}</label>
          <input
            type="range"
            id="starBrightness"
            min="0"
            max="400"
            step="0.5"
            value={starBrightness}
            onChange={(e) => setStarBrightness(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="timeSpeed" className="block mb-1">Time Speed: {timeSpeed}</label>
          <input
            type="range"
            id="timeSpeed"
            min="0"
            max="1"
            step="0.01"
            value={timeSpeed}
            onChange={(e) => setTimeSpeed(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
} 