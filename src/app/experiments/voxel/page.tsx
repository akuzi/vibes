"use client";

import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import Link from "next/link";
import Image from "next/image";
// @ts-expect-error - Papa Parse types are not available in the current setup
import Papa, { ParseResult } from 'papaparse';

const colorScale = [
  { elevation: 1, color: '#97d3ce' },    // light cyan
  { elevation: 35, color: '#6b7eea' },   // blue-violet
  { elevation: 82, color: '#b07ecb' },   // purple
  { elevation: 125, color: '#c97eb2' },  // magenta
  { elevation: 168, color: '#e07e7e' },  // red-pink
  { elevation: 214, color: '#f29b6c' },  // orange
  { elevation: 261, color: '#f7c46c' },  // light orange
  { elevation: 316, color: '#f7e96c' },  // yellow
  { elevation: 380, color: '#c6f76c' },  // yellow-green
  { elevation: 445, color: '#7cf76c' },  // green
  { elevation: 544, color: '#6cf7a2' },  // light green
  { elevation: 3461, color: '#e6f7c6' }  // very pale green
];

function getBandIndex(elevation: number) {
  for (let i = 0; i < colorScale.length - 1; i++) {
    if (elevation < colorScale[i + 1].elevation) {
      return i;
    }
  }
  return colorScale.length - 1;
}

export default function VoxelExperiment() {
  const mountRef = useRef<HTMLDivElement>(null);
  const isFlyingRef = useRef(false);
  const [elevationData, setElevationData] = useState<number[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const planeRef = useRef<THREE.Mesh | null>(null);
  
  const keysRef = useRef<Set<string>>(new Set());
  const isPointerLockedRef = useRef(false);
  const lastCameraUpdateRef = useRef<number>(0);

  // Load CSV elevation data
  useEffect(() => {
    const loadCSV = async () => {
      setIsLoading(true);
      const response = await fetch('/australia_elevation.csv');
      const csvText = await response.text();
      Papa.parse<string[]>(csvText, {
        complete: (results: ParseResult<string[]>) => {
          const data = results.data as string[][];
          const elevation = data.map(row => row.map(Number));
          setElevationData(elevation);
          setIsLoading(false);
        }
      });
    };
    loadCSV();
  }, []);

  // Setup scene
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount || isLoading) return;

    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 70, 50);
    camera.lookAt(0, 0, 0); // Look at the center
    camera.rotation.x = -Math.PI / 3;
    cameraRef.current = camera;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // Ground plane
    const planeGeometry = new THREE.PlaneGeometry(300, 300);
    const planeMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x90EE90,
      transparent: true,
      opacity: 0.3
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    scene.add(plane);
    planeRef.current = plane;

    // Voxel group
    const voxelGroup = new THREE.Group();
    voxelGroupRef.current = voxelGroup;
    scene.add(voxelGroup);

    // Create voxel meshes from elevation data with stacking and color bands
    const maxVoxelsToRender = 100000; // Increased limit for more map coverage
    let renderedVoxels = 0;
    for (let y = 6; y < elevationData.length; y++) {
      const row = elevationData[y];
      for (let x = 0; x < row.length; x++) {
        const elevation = row[x];
        const bandIndex = getBandIndex(elevation);
        for (let band = 0; band <= bandIndex; band++) {
          if (renderedVoxels >= maxVoxelsToRender) break;
          const color = colorScale[band].color;
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const material = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9 });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(
            x - (row.length / 2), // Center the grid
            band + 0.5, // Stack vertically by band
            y - (elevationData.length / 2)
          );
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          voxelGroup.add(mesh);
          renderedVoxels++;
        }
        if (renderedVoxels >= maxVoxelsToRender) break;
      }
      if (renderedVoxels >= maxVoxelsToRender) break;
    }

    // Pointer lock controls
    const handlePointerLockChange = () => {
      isPointerLockedRef.current = document.pointerLockElement === renderer.domElement;
      console.log('Pointer lock changed:', isPointerLockedRef.current);
    };

    const handlePointerLockError = () => {
      console.log('Pointer lock failed');
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('pointerlockerror', handlePointerLockError);

    // Mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      if (isPointerLockedRef.current) {
        const sensitivity = 0.002;
        camera.rotation.y -= event.movementX * sensitivity;
        camera.rotation.x -= event.movementY * sensitivity;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    // Keyboard controls
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('KeyDown event:', event.code, 'target:', event.target);
      keysRef.current.add(event.code);
      console.log('Key pressed:', event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('KeyUp event:', event.code, 'target:', event.target);
      keysRef.current.delete(event.code);
    };

    // Add listeners to both document and window to ensure they work
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Click to start flying
    const handleClick = () => {
      if (!isPointerLockedRef.current) {
        renderer.domElement.requestPointerLock();
        isFlyingRef.current = true;
        console.log('Flying mode activated');
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Debug: log isFlying state periodically
      if (Math.random() < 0.01) { // Log ~1% of the time
        console.log('Animation loop - isFlying:', isFlyingRef.current, 'keys:', Array.from(keysRef.current));
      }

      // Movement controls - work even without pointer lock for testing
      if (isFlyingRef.current) {
        const moveSpeed = 5; // Increased multiplier to make movement more noticeable
        let moved = false;
        
        // Debug key states
        if (keysRef.current.size > 0) {
          console.log('Active keys:', Array.from(keysRef.current));
        }
        
        // Simple direct movement for testing
        if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) {
          camera.position.z -= moveSpeed;
          moved = true;
          console.log('Moving forward, new Z:', camera.position.z);
        }
        if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) {
          camera.position.z += moveSpeed;
          moved = true;
          console.log('Moving backward, new Z:', camera.position.z);
        }
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) {
          camera.position.x -= moveSpeed;
          moved = true;
          console.log('Moving left, new X:', camera.position.x);
        }
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) {
          camera.position.x += moveSpeed;
          moved = true;
          console.log('Moving right, new X:', camera.position.x);
        }
        if (keysRef.current.has('Space')) {
          camera.position.y += moveSpeed;
          moved = true;
          console.log('Moving up, new Y:', camera.position.y);
        }
        if (keysRef.current.has('ShiftLeft')) {
          camera.position.y -= moveSpeed;
          moved = true;
          console.log('Moving down, new Y:', camera.position.y);
        }
        
        if (moved) {
          console.log('Camera moved to:', camera.position);
        }
      } else {
        // Debug: log when not flying
        if (keysRef.current.size > 0) {
          console.log('Keys pressed but not flying. isFlying:', isFlyingRef.current);
        }
      }

      maybeUpdateCameraPosition(camera);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const width = currentMount.clientWidth;
      const height = currentMount.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('pointerlockerror', handlePointerLockError);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.domElement.removeEventListener('click', handleClick);
      
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      
      renderer.dispose();
    };
  }, [elevationData, isLoading]);

  function maybeUpdateCameraPosition(camera: THREE.PerspectiveCamera) {
    const now = Date.now();
    if (now - lastCameraUpdateRef.current > 200) {
      console.log('Camera position updated:', camera.position);
      lastCameraUpdateRef.current = now;
    }
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-green-700">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-green-400 hover:text-green-300 mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
        </div>
        <h1 className="text-2xl font-mono text-green-400">Voxel World</h1>
        <div className="w-10"></div>
      </div>

      {/* Controls Panel at the bottom left */}
      <div className="fixed bottom-4 left-4 z-10 bg-gray-900 border border-green-700 rounded-lg p-2 text-green-400 font-mono text-xs w-56">
        <h3 className="text-base mb-2 font-bold text-yellow-400 font-mono">Controls</h3>
        <div className="space-y-1">
          <div>WASD / Arrow Keys - Move</div>
          <div>Space - Up</div>
          <div>Shift - Down</div>
          <div>Mouse - Look around</div>
        </div>
      </div>

      {/* 3D Scene */}
      <div 
        ref={mountRef} 
        className="flex-1 cursor-crosshair relative" 
        tabIndex={0}
        onFocus={() => console.log('3D scene focused')}
        onBlur={() => console.log('3D scene lost focus')}
      >
        {/* Australia Image Overlay */}
        <div className="absolute top-4 right-4 z-10">
          <Image src="/australia.png" alt="Australia" className="h-32 w-auto opacity-80" width={128} height={128} />
        </div>
      </div>

      {/* Elevation Key panel at the bottom right (more compact) */}
      <div className="fixed bottom-4 right-4 z-10 bg-gray-900 border border-green-700 rounded-lg p-1 text-green-400 font-mono text-[10px] w-40">
        <h4 className="text-sm font-bold text-yellow-400 font-mono mb-1">Elevation Key</h4>
        <div className="space-y-0.5">
          {colorScale.map((band, i) => (
            <div key={i} className="flex items-center space-x-1">
              <div 
                className="w-2 h-2 rounded"
                style={{ backgroundColor: band.color }}
              />
              <span>
                {band.elevation}
                {i < colorScale.length - 1 ? ` - ${colorScale[i + 1].elevation - 1} m` : ' m+'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 