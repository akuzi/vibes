"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import Link from "next/link";
import { 
  VoxelData, 
  TerrainType, 
  TERRAIN_TYPES, 
  initializeAustraliaData
} from "@/lib/australia-data";

export default function VoxelExperiment() {
  const mountRef = useRef<HTMLDivElement>(null);
  const isFlyingRef = useRef(false);
  const [isFlyingState, setIsFlyingState] = useState(false);
  const [speed, setSpeed] = useState(0.5);
  const [voxelData, setVoxelData] = useState<VoxelData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useRealData, setUseRealData] = useState(false);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const voxelGroupRef = useRef<THREE.Group | null>(null);
  const planeRef = useRef<THREE.Mesh | null>(null);
  
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPointerLockedRef = useRef(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [cameraPosition, setCameraPosition] = useState<string>('');

  // Load Australia data
  useEffect(() => {
    const loadData = async () => {
      console.log('loadData called with useRealData:', useRealData);
      setIsLoading(true);
      try {
        if (useRealData) {
          console.log('Loading real Australia data...');
          const response = await fetch('/api/topography');
          console.log('API response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
          }
          
          const result = await response.json();
          console.log('API result:', result);
          
          if (result.success) {
            console.log(`Setting ${result.data.length} voxels`);
            setVoxelData(result.data);
            console.log(`Loaded ${result.count} voxels from API`);
          } else {
            throw new Error(result.error || 'API returned error');
          }
        } else {
          console.log('Loading simplified Australia data...');
          const data = initializeAustraliaData();
          console.log(`Setting ${data.length} simplified voxels`);
          setVoxelData(data);
        }
      } catch (error) {
        console.error('Failed to load Australia data:', error);
        // Fallback to simplified data
        const data = initializeAustraliaData();
        console.log(`Fallback: Setting ${data.length} simplified voxels`);
        setVoxelData(data);
      }
      setIsLoading(false);
    };

    loadData();
  }, [useRealData]);

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
    camera.position.set(0, 20, 50); // Start higher to see the stacked voxels
    cameraRef.current = camera;
    
    // Set initial camera position in debug
    setCameraPosition(`X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`);

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

    // Create voxel meshes from Australia data with performance optimization
    const maxVoxelsToRender = 10000; // Limit for performance
    const voxelsToRender = voxelData.slice(0, maxVoxelsToRender);
    
    voxelsToRender.forEach(voxel => {
      const geometry = new THREE.BoxGeometry(1, 1, 1); // Each voxel is 1x1x1
      const material = new THREE.MeshLambertMaterial({ 
        color: voxel.terrainType.color,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position voxel in world space - stack them vertically
      mesh.position.set(
        (voxel.x - 50) * 1.5, // Center the grid and scale
        voxel.y + 0.5, // Stack voxels vertically, each layer is 1 unit high
        (voxel.z - 50) * 1.5
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      voxelGroup.add(mesh);
    });

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
      setDebugInfo(`Keys: ${Array.from(keysRef.current).join(', ')}`);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      console.log('KeyUp event:', event.code, 'target:', event.target);
      keysRef.current.delete(event.code);
      setDebugInfo(`Keys: ${Array.from(keysRef.current).join(', ')}`);
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
        setIsFlyingState(true);
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
        const moveSpeed = speed * 5; // Increased multiplier to make movement more noticeable
        let moved = false;
        
        // Debug key states
        if (keysRef.current.size > 0) {
          console.log('Active keys:', Array.from(keysRef.current));
        }
        
        // Simple direct movement for testing
        if (keysRef.current.has('KeyW')) {
          camera.position.z -= moveSpeed;
          moved = true;
          console.log('Moving forward, new Z:', camera.position.z);
        }
        if (keysRef.current.has('KeyS')) {
          camera.position.z += moveSpeed;
          moved = true;
          console.log('Moving backward, new Z:', camera.position.z);
        }
        if (keysRef.current.has('KeyA')) {
          camera.position.x -= moveSpeed;
          moved = true;
          console.log('Moving left, new X:', camera.position.x);
        }
        if (keysRef.current.has('KeyD')) {
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

      // Always update camera position debug info
      setCameraPosition(`X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`);

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
  }, [voxelData, isLoading, speed]);

  // Regenerate voxels when data changes
  useEffect(() => {
    if (!voxelGroupRef.current || isLoading) return;
    
    voxelGroupRef.current.clear();
    
    // Performance optimization - limit rendered voxels
    const maxVoxelsToRender = 60000; // Increased to show complete Australia
    const voxelsToRender = voxelData.slice(0, maxVoxelsToRender);
    
    console.log(`Rendering ${voxelsToRender.length} voxels out of ${voxelData.length} total`);
    
    voxelsToRender.forEach(voxel => {
      const geometry = new THREE.BoxGeometry(1, 1, 1); // Each voxel is 1x1x1
      const material = new THREE.MeshLambertMaterial({ 
        color: voxel.terrainType.color,
        transparent: true,
        opacity: 0.9
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Position voxel in world space - stack them vertically
      mesh.position.set(
        (voxel.x - 50) * 1.5, // Center the grid and scale
        voxel.y + 0.5, // Stack voxels vertically, each layer is 1 unit high
        (voxel.z - 50) * 1.5
      );
      
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      voxelGroupRef.current!.add(mesh);
    });
  }, [voxelData, isLoading]);

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-green-700">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-green-400 hover:text-green-300">
            ← Back to Experiments
          </Link>
          <h1 className="text-2xl font-mono text-green-400">Australia Voxel Map</h1>
        </div>
        
        <div className="text-green-400 font-mono text-sm">
          {isLoading ? (
            <span className="text-yellow-400">Loading Australia...</span>
          ) : isFlyingState ? (
            <span className="text-yellow-400">Flying Mode Active</span>
          ) : (
            <span>Click to start flying</span>
          )}
        </div>
      </div>

      {/* Controls Panel */}
      <div className="absolute top-20 left-4 z-10 bg-gray-900 border border-green-700 rounded-lg p-4 text-green-400 font-mono">
        <h3 className="text-lg mb-3 text-yellow-400">Controls</h3>
        <div className="space-y-2 text-sm">
          <div>WASD - Move</div>
          <div>Space - Up</div>
          <div>Shift - Down</div>
          <div>Mouse - Look around</div>
        </div>
        
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm mb-1">Speed: {speed.toFixed(2)}</label>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={useRealData}
                onChange={(e) => {
                  console.log('Checkbox changed to:', e.target.checked);
                  setUseRealData(e.target.checked);
                }}
                className="text-green-400"
              />
              <span className="text-sm">Use Real Data</span>
            </label>
          </div>
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-bold text-yellow-400 mb-2">Terrain Types:</h4>
          <div className="space-y-1 text-xs">
            {TERRAIN_TYPES.map(terrain => (
              <div key={terrain.id} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: terrain.color }}
                />
                <span>{terrain.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="absolute top-20 right-4 z-10 bg-gray-900 border border-green-700 rounded-lg p-4 text-green-400 font-mono">
        <h3 className="text-lg mb-3 text-yellow-400">Debug Info</h3>
        <div className="space-y-2 text-sm">
          <div>Flying: {isFlyingState ? 'Yes' : 'No'}</div>
          <div>Pointer Lock: {isPointerLockedRef.current ? 'Yes' : 'No'}</div>
          <div>Active Keys: {debugInfo || 'None'}</div>
          <div>Camera Position: {cameraPosition || 'None'}</div>
          <div>Total Voxels: {voxelData.length}</div>
          <div>Rendered Voxels: {Math.min(voxelData.length, 60000)}</div>
          <div>Grid Resolution: 20km x 20km</div>
          <div>Elevation Scale: 1000ft/voxel</div>
          <div>Max Elevation: {Math.max(...voxelData.map(v => v.elevation)).toFixed(0)}m</div>
          <button 
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.x += 1;
                console.log('Test move - new position:', cameraRef.current.position);
              }
            }}
            className="mt-2 px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs"
          >
            Test Move Camera
          </button>
          <button 
            onClick={() => {
              if (cameraRef.current) {
                cameraRef.current.position.set(0, 20, 50); // Reset to initial position
                console.log('Camera reset to:', cameraRef.current.position);
              }
            }}
            className="mt-2 px-2 py-1 bg-red-700 hover:bg-red-600 rounded text-xs"
          >
            Reset Camera
          </button>
          <button 
            onClick={() => {
              isFlyingRef.current = !isFlyingRef.current;
              setIsFlyingState(isFlyingRef.current);
              console.log('Flying mode toggled:', isFlyingRef.current);
            }}
            className="mt-2 px-2 py-1 bg-blue-700 hover:bg-blue-600 rounded text-xs"
          >
            Toggle Flying Mode
          </button>
        </div>
      </div>

      {/* 3D Scene */}
      <div 
        ref={mountRef} 
        className="flex-1 cursor-crosshair" 
        tabIndex={0}
        onFocus={() => console.log('3D scene focused')}
        onBlur={() => console.log('3D scene lost focus')}
      />
    </div>
  );
} 